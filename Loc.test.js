/* global it, describe */
let assert = require('assert');

describe('Localization', () => {
  it('has all keys in all locales', async () => {
    let en = require('./loc/en');
    let noErrors = true;
    for (let key1 of Object.keys(en)) {
      for (let key2 of Object.keys(en[key1])) {
        // iterating all keys and subkeys in EN locale, which is main

        for (let lang of ['es', 'pt_BR', 'pt_PT', 'ru', 'ua']) {
          // iteratin all locales except EN
          let locale = require('./loc/' + lang);

          if (typeof locale[key1] === 'undefined') {
            console.error('Missing: ' + lang + '.' + key1);
            noErrors = false;
          } else if (typeof locale[key1][key2] === 'undefined') {
            console.error('Missing: ' + lang + '.' + key1 + '.' + key2);
            noErrors = false;
          }

          // level 1 & 2 done, doing level 3 (if it exists):

          if (typeof en[key1][key2] !== 'string') {
            for (let key3 of Object.keys(en[key1][key2])) {
              if (typeof locale[key1][key2][key3] === 'undefined') {
                console.error('Missing: ' + lang + '.' + key1 + '.' + key2 + '.' + key3);
                noErrors = false;
              }
            }
          }
        }
      }
    }
    assert.ok(noErrors, 'Some localizations are missing keys');
  });
});
