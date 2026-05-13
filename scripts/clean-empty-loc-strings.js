// Removes empty-string entries (and resulting empty sections) from every
// locale file in loc/ except en.json. Empty translations are useless at
// runtime — they cause the UI to render a blank string instead of falling
// back to the English source — so they should not be committed.
//
// Run: `node scripts/clean-empty-loc-strings.js`

const fs = require('fs');
const path = require('path');

const LOC_DIR = path.join(__dirname, '..', 'loc');
const SOURCE = 'en.json';

function cleanLocale(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let removedKeys = 0;
  let removedSections = 0;

  for (const sectionName of Object.keys(data)) {
    const section = data[sectionName];
    if (typeof section !== 'object' || section === null) continue;

    for (const key of Object.keys(section)) {
      if (section[key] === '') {
        delete section[key];
        removedKeys++;
      }
    }

    if (Object.keys(section).length === 0) {
      delete data[sectionName];
      removedSections++;
    }
  }

  return { data, removedKeys, removedSections };
}

function main() {
  const files = fs.readdirSync(LOC_DIR)
    .filter(name => name.endsWith('.json') && name !== SOURCE)
    .sort();

  let touched = 0;
  let totalKeys = 0;
  let totalSections = 0;

  for (const name of files) {
    const filePath = path.join(LOC_DIR, name);
    let result;
    try {
      result = cleanLocale(filePath);
    } catch (e) {
      console.error(`${name}: parse error — ${e.message}`);
      process.exitCode = 1;
      continue;
    }

    const { data, removedKeys, removedSections } = result;
    if (removedKeys === 0 && removedSections === 0) continue;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    touched++;
    totalKeys += removedKeys;
    totalSections += removedSections;
    console.log(`${name}: removed ${removedKeys} empty key(s), ${removedSections} empty section(s)`);
  }

  if (touched === 0) {
    console.log('OK — no empty strings found in locale files.');
  } else {
    console.log(`\nDone. ${touched} file(s) touched, ${totalKeys} empty key(s), ${totalSections} empty section(s) removed.`);
  }
}

main();
