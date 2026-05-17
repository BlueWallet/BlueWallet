// Removes useless entries (and resulting empty sections) from every locale
// file in loc/ except en.json:
//
//   1. Empty-string values — at runtime they render a blank string instead of
//      falling back to the English source, so they should not be committed.
//   2. Orphan keys — keys present in a locale file that no longer exist in
//      en.json (the source of truth). They are dead weight: react-localization
//      indexes by en.json structure, so the runtime never reads them, and code
//      grep confirms zero references. Usually leftovers from renamed/removed
//      strings in en.json (e.g. `details_from` → `details_inputs`).
//   3. Orphan sections — top-level sections that don't exist in en.json.
//
// Run: `node scripts/clean-loc-strings.js`

const fs = require('fs');
const path = require('path');

const LOC_DIR = path.join(__dirname, '..', 'loc');
const SOURCE = 'en.json';

function buildEnSchema(en) {
  // Returns Map<section, Set<key>> reflecting en.json's structure.
  const schema = new Map();
  for (const sectionName of Object.keys(en)) {
    const section = en[sectionName];
    if (typeof section !== 'object' || section === null) continue;
    schema.set(sectionName, new Set(Object.keys(section)));
  }
  return schema;
}

function cleanLocale(filePath, enSchema) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let removedEmpty = 0;
  let removedOrphans = 0;
  let removedSections = 0;

  for (const sectionName of Object.keys(data)) {
    const section = data[sectionName];
    if (typeof section !== 'object' || section === null) continue;

    const enKeys = enSchema.get(sectionName);
    if (!enKeys) {
      // Whole section gone from en.json — drop it.
      delete data[sectionName];
      removedSections++;
      continue;
    }

    for (const key of Object.keys(section)) {
      if (section[key] === '') {
        delete section[key];
        removedEmpty++;
      } else if (!enKeys.has(key)) {
        delete section[key];
        removedOrphans++;
      }
    }

    if (Object.keys(section).length === 0) {
      delete data[sectionName];
      removedSections++;
    }
  }

  return { data, removedEmpty, removedOrphans, removedSections };
}

function main() {
  const enPath = path.join(LOC_DIR, SOURCE);
  if (!fs.existsSync(enPath)) {
    console.error(`Cannot find source file: ${enPath}`);
    process.exit(2);
  }
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const enSchema = buildEnSchema(en);

  const files = fs.readdirSync(LOC_DIR)
    .filter(name => name.endsWith('.json') && name !== SOURCE)
    .sort();

  let touched = 0;
  let totalEmpty = 0;
  let totalOrphans = 0;
  let totalSections = 0;

  for (const name of files) {
    const filePath = path.join(LOC_DIR, name);
    let result;
    try {
      result = cleanLocale(filePath, enSchema);
    } catch (e) {
      console.error(`${name}: parse error — ${e.message}`);
      process.exitCode = 1;
      continue;
    }

    const { data, removedEmpty, removedOrphans, removedSections } = result;
    if (removedEmpty === 0 && removedOrphans === 0 && removedSections === 0) continue;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    touched++;
    totalEmpty += removedEmpty;
    totalOrphans += removedOrphans;
    totalSections += removedSections;
    const parts = [];
    if (removedEmpty) parts.push(`${removedEmpty} empty`);
    if (removedOrphans) parts.push(`${removedOrphans} orphan key(s)`);
    if (removedSections) parts.push(`${removedSections} empty/orphan section(s)`);
    console.log(`${name}: removed ${parts.join(', ')}`);
  }

  if (touched === 0) {
    console.log('OK — no empty strings or orphan keys found in locale files.');
  } else {
    console.log(
      `\nDone. ${touched} file(s) touched: ` +
      `${totalEmpty} empty key(s), ${totalOrphans} orphan key(s), ` +
      `${totalSections} empty/orphan section(s) removed.`
    );
  }
}

main();
