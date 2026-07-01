const fs = require('fs');
const path = require('path');

// Validates iOS App Store metadata files against Apple's character limits.
// `fastlane deliver` does not check lengths itself — it uploads as-is and the
// App Store Connect API rejects over-limit fields, failing the release. This
// catches those locally (in `npm run lint`) before a deploy.
// Limits: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/

const metadataDir = './fastlane/metadata/ios';

// filename -> max number of Unicode characters
const limits = {
  'name.txt': 30,
  'subtitle.txt': 30,
  'keywords.txt': 100,
  'promotional_text.txt': 170,
  'description.txt': 4000,
  'release_notes.txt': 4000,
};

if (!fs.existsSync(metadataDir)) {
  console.error('Metadata directory not found: ' + metadataDir);
  process.exit(1);
}

// App Store counts Unicode characters (code points), and `deliver` strips
// surrounding whitespace before upload — mirror both here.
function charCount(str) {
  return Array.from(str.trim()).length;
}

let exitCode = 0;

const locales = fs
  .readdirSync(metadataDir)
  .filter(name => fs.statSync(path.join(metadataDir, name)).isDirectory());

for (const locale of locales) {
  for (const filename of Object.keys(limits)) {
    const filepath = path.join(metadataDir, locale, filename);
    if (!fs.existsSync(filepath)) continue;

    const count = charCount(fs.readFileSync(filepath).toString('utf8'));
    const limit = limits[filename];
    if (count > limit) {
      console.log(`Metadata too long: ${locale}/${filename} is ${count} chars (limit ${limit})`);
      exitCode = 1;
    }
  }
}

process.exit(exitCode);
