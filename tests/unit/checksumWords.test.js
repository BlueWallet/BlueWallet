import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { validateMnemonic } from '../../blue_modules/bip39';
const assert = require('assert');

describe('generateChecksumWords', () => {
  it('generates 128 valid words for an 11 word input', () => {
    const input = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
    const result = generateChecksumWords(input);
    assert.ok(result);
    assert.strictEqual(result.length, 128);

    for (let i = 0; i < 128; i++) {
      assert.ok(validateMnemonic(input + ' ' + result[i]));
    }
  });

  it('generates 8 valid words for a 23 word input', () => {
    const input =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon ' +
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
    const result = generateChecksumWords(input);
    assert.ok(result);
    assert.strictEqual(result.length, 8);

    for (let i = 0; i < 8; i++) {
      assert.ok(validateMnemonic(input + ' ' + result[i]));
    }
  });

  it('fails with an invalid partial phrase', () => {
    const result = generateChecksumWords('lorem ipsum dolor sit amet');
    assert.strictEqual(result, false);
  });

  it('fails with a completed phrase', () => {
    const result = generateChecksumWords('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.strictEqual(result, false);
  });
});
