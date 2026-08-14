const fs = require('fs');
const path = require('path');

// Validates App Store (iOS) and Google Play (Android) metadata files against the
// stores' character limits. `fastlane deliver`/`supply` do not check lengths
// themselves — they upload as-is and the store API rejects over-limit fields,
// failing the release. This catches those locally (in `npm run lint`) first.
// iOS:     https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/
// Android: https://support.google.com/googleplay/android-developer/answer/9859152

// One config per platform: metadata dir + { filename -> max Unicode characters }.
const platforms = [
  {
    dir: './fastlane/metadata/ios',
    limits: {
      'name.txt': 30,
      'subtitle.txt': 30,
      'keywords.txt': 100,
      'promotional_text.txt': 170,
      'description.txt': 4000,
      'release_notes.txt': 4000,
    },
  },
  {
    dir: './fastlane/metadata/android',
    limits: {
      'title.txt': 30,
      'short_description.txt': 80,
      'full_description.txt': 4000,
    },
  },
];

// Stores count Unicode characters (code points), and deliver/supply strip
// surrounding whitespace before upload — mirror both here. Reading follows
// symlinks, so Android files that symlink to iOS content are validated too.
function charCount(str) {
  return Array.from(str.trim()).length;
}

let exitCode = 0;

for (const { dir, limits } of platforms) {
  if (!fs.existsSync(dir)) continue;

  const locales = fs.readdirSync(dir).filter(name => fs.statSync(path.join(dir, name)).isDirectory());

  for (const locale of locales) {
    for (const filename of Object.keys(limits)) {
      const filepath = path.join(dir, locale, filename);
      if (!fs.existsSync(filepath)) continue;

      const count = charCount(fs.readFileSync(filepath).toString('utf8'));
      const limit = limits[filename];
      if (count > limit) {
        console.log(`Metadata too long: ${dir}/${locale}/${filename} is ${count} chars (limit ${limit})`);
        exitCode = 1;
      }
    }
  }
}

process.exit(exitCode);
