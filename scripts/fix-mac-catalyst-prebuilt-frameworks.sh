#!/usr/bin/env bash
# Fix malformed Mac Catalyst slices in React Native prebuilt xcframeworks.
#
# RN 0.84+ ships React-Core-prebuilt / ReactNativeDependencies / hermes-engine
# with invalid framework layouts for the maccatalyst slice (missing Versions/Current
# symlinks; resource bundles at framework root). Xcode then fails with:
#   "bundle format is ambiguous (could be app or framework)"
#
# Upstream: https://github.com/facebook/react-native/issues/55540
# Safe to re-run; no-ops when paths are missing (source builds) or already correct.

set -euo pipefail

PODS_ROOT="${1:-${PODS_ROOT:-}}"
if [[ -z "${PODS_ROOT}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PODS_ROOT="$(cd "${SCRIPT_DIR}/../ios/Pods" && pwd)"
fi

if [[ ! -d "${PODS_ROOT}" ]]; then
  echo "[fix-mac-catalyst-prebuilt] Pods root not found: ${PODS_ROOT} (skipping)"
  exit 0
fi

# Ensure a Mac Catalyst framework has the classic Versions/Current layout.
# Args: <framework_dir> <binary_name> <versions_current_target>
#   versions_current_target is the Versions subdirectory name ("A" or "1").
fix_framework() {
  local framework_dir="$1"
  local binary_name="$2"
  local versions_target="$3"

  if [[ ! -d "${framework_dir}" ]]; then
    return 0
  fi

  local versions_dir="${framework_dir}/Versions"
  local current_link="${versions_dir}/Current"
  local versioned_dir="${versions_dir}/${versions_target}"

  if [[ ! -d "${versioned_dir}" ]]; then
    echo "[fix-mac-catalyst-prebuilt] Missing ${versioned_dir}; skipping ${framework_dir}"
    return 0
  fi

  # Versions/Current must be a symlink to the version directory (A or 1).
  mkdir -p "${versions_dir}"
  if [[ -e "${current_link}" || -L "${current_link}" ]]; then
    rm -rf "${current_link}"
  fi
  ln -s "${versions_target}" "${current_link}"

  # Root-level binary and Resources must be symlinks into Versions/Current.
  local root_binary="${framework_dir}/${binary_name}"
  local root_resources="${framework_dir}/Resources"

  if [[ -e "${root_binary}" || -L "${root_binary}" ]]; then
    rm -rf "${root_binary}"
  fi
  ln -s "Versions/Current/${binary_name}" "${root_binary}"

  if [[ -e "${root_resources}" || -L "${root_resources}" ]]; then
    rm -rf "${root_resources}"
  fi
  ln -s "Versions/Current/Resources" "${root_resources}"

  # Move any stray resource bundles that landed at the framework root into Resources.
  # (ReactNativeDependencies ships boost/folly/glog bundles this way.)
  local versioned_resources="${versioned_dir}/Resources"
  mkdir -p "${versioned_resources}"
  shopt -s nullglob
  for bundle in "${framework_dir}"/*.bundle; do
    local base
    base="$(basename "${bundle}")"
    echo "[fix-mac-catalyst-prebuilt] Moving ${base} → Versions/${versions_target}/Resources/"
    rm -rf "${versioned_resources}/${base}"
    mv "${bundle}" "${versioned_resources}/"
  done
  shopt -u nullglob

  echo "[fix-mac-catalyst-prebuilt] Fixed ${framework_dir}"
}

# Prefer the maccatalyst slice; fall back to any *maccatalyst* directory name.
find_maccatalyst_framework() {
  local xcframework="$1"
  local framework_name="$2"
  local candidate

  if [[ ! -d "${xcframework}" ]]; then
    return 1
  fi

  candidate="${xcframework}/ios-arm64_x86_64-maccatalyst/${framework_name}.framework"
  if [[ -d "${candidate}" ]]; then
    echo "${candidate}"
    return 0
  fi

  # Glob in case Apple / RN rename the slice folder.
  shopt -s nullglob
  for candidate in "${xcframework}"/*maccatalyst*/"${framework_name}.framework"; do
    if [[ -d "${candidate}" ]]; then
      echo "${candidate}"
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

echo "[fix-mac-catalyst-prebuilt] Repairing Mac Catalyst prebuilt frameworks under ${PODS_ROOT}"

# hermes-engine (Hermes V1 ships hermesvm.xcframework)
HERMES_XCF="${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework"
if framework_path="$(find_maccatalyst_framework "${HERMES_XCF}" "hermesvm")"; then
  # Hermes uses Versions/1 as the version directory.
  fix_framework "${framework_path}" "hermesvm" "1"
fi

# React-Core-prebuilt
REACT_XCF="${PODS_ROOT}/React-Core-prebuilt/React.xcframework"
if framework_path="$(find_maccatalyst_framework "${REACT_XCF}" "React")"; then
  fix_framework "${framework_path}" "React" "A"
fi

# ReactNativeDependencies (path from ReactNativeDependencies.podspec)
RNDEPS_XCF="${PODS_ROOT}/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework"
if [[ ! -d "${RNDEPS_XCF}" ]]; then
  # Fallback if CocoaPods flattens the layout differently.
  # Avoid pipefail+SIGPIPE from `find | head` aborting the script under `set -e`.
  RNDEPS_XCF="$(find "${PODS_ROOT}/ReactNativeDependencies" -type d -name 'ReactNativeDependencies.xcframework' 2>/dev/null | head -1)" || true
  RNDEPS_XCF="${RNDEPS_XCF:-}"
fi
if [[ -n "${RNDEPS_XCF}" ]] && framework_path="$(find_maccatalyst_framework "${RNDEPS_XCF}" "ReactNativeDependencies")"; then
  fix_framework "${framework_path}" "ReactNativeDependencies" "A"
fi

echo "[fix-mac-catalyst-prebuilt] Done"
