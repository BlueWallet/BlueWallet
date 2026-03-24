#!/bin/bash
#
# sync-knownregions.sh
#
# Syncs the knownRegions in project.pbxproj and locales in Localizable.xcstrings
# with the language list in loc/languages.ts (single source of truth).
#
# Usage: Run as an Xcode Build Phase ("Run Script") or manually:
#   ./scripts/sync-knownregions.sh [--dry-run]
#
# Options:
#   --dry-run   Show what would change without writing any files
#

set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

# --- Helpers ------------------------------------------------------------------

log()  { echo "[sync-knownregions] $*"; }
warn() { echo "[sync-knownregions] WARNING: $*" >&2; }
die()  { echo "[sync-knownregions] ERROR: $*" >&2; exit 1; }

# Temp files tracked for cleanup
TMPFILES=()
cleanup() {
  for f in "${TMPFILES[@]:-}"; do
    [ -n "$f" ] && [ -f "$f" ] && rm -f "$f"
  done
  return 0
}
trap cleanup EXIT

# Create a temp file in the same directory as $1 (so mv is atomic on the same filesystem)
make_tmp() {
  local dir
  dir="$(dirname "$1")"
  local tmp
  tmp="$(mktemp "$dir/.sync-knownregions.XXXXXX")" || die "Cannot create temp file in $dir"
  TMPFILES+=("$tmp")
  echo "$tmp"
}

# Write $2 to file $1 atomically (temp + mv). Skips if content matches.
# Returns 0 if file was updated, 1 if unchanged.
atomic_write() {
  local target="$1" content="$2"
  if [ -f "$target" ] && [ "$(cat "$target")" = "$content" ]; then
    return 1
  fi
  if $DRY_RUN; then
    return 0
  fi
  local tmp
  tmp="$(make_tmp "$target")"
  printf '%s' "$content" > "$tmp"
  mv -f "$tmp" "$target"
}

# --- Pre-flight checks --------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOC_DIR="$REPO_ROOT/loc"
PBXPROJ="$REPO_ROOT/ios/BlueWallet.xcodeproj/project.pbxproj"
XCSTRINGS="$REPO_ROOT/ios/Localizable.xcstrings"
LANGUAGES_TS="$LOC_DIR/languages.ts"

command -v python3 >/dev/null 2>&1 || die "python3 is required but not found in PATH"

[ -f "$LANGUAGES_TS" ] || die "Source file not found: $LANGUAGES_TS"
[ -r "$LANGUAGES_TS" ] || die "Source file not readable: $LANGUAGES_TS"

# --- Extract locales from languages.ts ----------------------------------------

LOCALES=()
while IFS= read -r apple_locale; do
  [ -n "$apple_locale" ] && LOCALES+=("$apple_locale")
done < <(python3 -c "
import re, sys
with open(sys.argv[1], 'r') as f:
    content = f.read()
for m in re.finditer(r\"appleLocale:\s*'([^']+)'\", content):
    print(m.group(1))
" "$LANGUAGES_TS" 2>&1) || die "Failed to parse locales from $LANGUAGES_TS"

[ "${#LOCALES[@]}" -gt 0 ] || die "Parsed 0 locales from $LANGUAGES_TS — file may be malformed"

# Sort and deduplicate
IFS=$'\n' SORTED_LOCALES=($(printf '%s\n' "${LOCALES[@]}" | sort -u)); unset IFS

log "Found ${#SORTED_LOCALES[@]} Apple locale(s) in languages.ts"

# --- Update knownRegions in project.pbxproj -----------------------------------

if [ ! -f "$PBXPROJ" ]; then
  warn "project.pbxproj not found at $PBXPROJ — skipping"
elif [ ! -w "$PBXPROJ" ]; then
  die "project.pbxproj is not writable: $PBXPROJ"
else
  NEW_CONTENT="$(python3 - "$PBXPROJ" "${SORTED_LOCALES[@]}" <<'PYEOF'
import re, sys

pbxproj_path = sys.argv[1]
locales = sys.argv[2:]

with open(pbxproj_path, 'r', encoding='utf-8') as f:
    content = f.read()

indent = '\t\t\t\t'
lines = [f'{indent}en,', f'{indent}Base,']
for locale in locales:
    if locale == 'en':
        continue
    if '-' in locale:
        lines.append(f'{indent}"{locale}",')
    else:
        lines.append(f'{indent}{locale},')
regions_str = 'knownRegions = (\n' + '\n'.join(lines) + '\n\t\t\t);'

new_content, count = re.subn(
    r'knownRegions\s*=\s*\([^)]*\)\s*;',
    regions_str,
    content,
    count=1,
)
if count == 0:
    print('ERROR: knownRegions block not found in project.pbxproj', file=sys.stderr)
    sys.exit(1)

print(new_content, end='')
PYEOF
  )" || die "Failed to generate knownRegions for project.pbxproj"

  if atomic_write "$PBXPROJ" "$NEW_CONTENT"; then
    if $DRY_RUN; then
      log "[dry-run] Would update knownRegions in project.pbxproj"
    else
      log "Updated knownRegions in project.pbxproj"
    fi
  else
    log "knownRegions already up-to-date in project.pbxproj"
  fi
fi

# --- Update Localizable.xcstrings ---------------------------------------------

if [ ! -f "$XCSTRINGS" ]; then
  warn "Localizable.xcstrings not found at $XCSTRINGS — skipping"
elif [ ! -w "$XCSTRINGS" ]; then
  die "Localizable.xcstrings is not writable: $XCSTRINGS"
else
  XCSTRINGS_RESULT="$(python3 - "$XCSTRINGS" "$DRY_RUN" "${SORTED_LOCALES[@]}" <<'PYEOF'
import json, sys, os, tempfile, shutil

xcstrings_path = sys.argv[1]
dry_run = sys.argv[2] == 'true'
new_locales = set(sys.argv[3:])

with open(xcstrings_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

existing_locales = set()
for key, value in data.get('strings', {}).items():
    existing_locales.update(value.get('localizations', {}).keys())

missing = new_locales - existing_locales
if not missing:
    print(f"UP-TO-DATE ({len(new_locales)} locales)")
    sys.exit(0)

for key, value in data.get('strings', {}).items():
    locs = value.get('localizations', {})
    if not locs:
        continue
    for locale in missing:
        if locale not in locs:
            locs[locale] = {"stringUnit": {"state": "translated", "value": ""}}
    value['localizations'] = dict(sorted(locs.items()))

if dry_run:
    print(f"WOULD-ADD {len(missing)}: {', '.join(sorted(missing))}")
    sys.exit(0)

# Atomic write: temp file in the same directory, then rename
target_dir = os.path.dirname(xcstrings_path)
fd, tmp_path = tempfile.mkstemp(dir=target_dir, prefix='.xcstrings-sync-', suffix='.tmp')
try:
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    shutil.move(tmp_path, xcstrings_path)
except BaseException:
    os.unlink(tmp_path)
    raise

print(f"ADDED {len(missing)}: {', '.join(sorted(missing))}")
PYEOF
  )" || die "Failed to update Localizable.xcstrings"

  case "$XCSTRINGS_RESULT" in
    UP-TO-DATE*)  log "Localizable.xcstrings already up-to-date" ;;
    WOULD-ADD*)   log "[dry-run] ${XCSTRINGS_RESULT#WOULD-ADD }" ;;
    ADDED*)       log "Localizable.xcstrings — added ${XCSTRINGS_RESULT#ADDED }" ;;
    *)            log "$XCSTRINGS_RESULT" ;;
  esac
fi

log "Sync complete."
