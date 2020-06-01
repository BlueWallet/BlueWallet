/* global it, describe */
const assert = require('assert');
const fs = require('fs');

describe('Localization', () => {
  it('has all keys in all locales', async () => {
    const en = require('../../loc/en');
    let issues = 0;
    for (const key1 of Object.keys(en)) {
      for (const key2 of Object.keys(en[key1])) {
        // iterating all keys and subkeys in EN locale, which is main
        const files = fs.readdirSync('./loc/');

        for (const lang of files) {
          if (lang === 'en.js') continue; // iteratin all locales except EN
          if (lang === 'index.js') continue;

          const locale = require('../../loc/' + lang);

          if (typeof locale[key1] === 'undefined') {
            console.error('Missing: ' + lang + '.' + key1);
            issues++;
          } else if (typeof locale[key1][key2] === 'undefined') {
            console.error('Missing: ' + lang + '.' + key1 + '.' + key2);
            issues++;
          }

          // level 1 & 2 done, doing level 3 (if it exists):

          if (typeof en[key1][key2] !== 'string') {
            for (const key3 of Object.keys(en[key1][key2])) {
              if (typeof locale[key1][key2][key3] === 'undefined') {
                console.error('Missing: ' + lang + '.' + key1 + '.' + key2 + '.' + key3);
                issues++;
              }
            }
          }
        }
      }
    }
    assert.ok(issues === 0, 'Some localizations are missing keys. Total issues: ' + issues);
  });
});
