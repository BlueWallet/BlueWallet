import assert from 'assert';

import { normalizeDerivationPath, validateBip32 } from '../../class/wallet-import';

describe('validateBip32', () => {
  it('requires an m/ prefix so bip174 does not drop the first path level', () => {
    assert.ok(validateBip32("m/84'/0'/0'"));
    assert.ok(validateBip32("m/0'"));
    assert.ok(validateBip32('m/0/0'));
    assert.ok(validateBip32("m/84/0'/0'")); // mixed hardened and non-hardened levels
    assert.ok(validateBip32('m/84/0/0')); // all non-hardened
    assert.ok(!validateBip32("84'/0'/0'"));
    assert.ok(!validateBip32('m'));
    assert.ok(!validateBip32('m//0')); // empty path segment
    assert.ok(!validateBip32(''));
  });

  it('accepts h and H hardened notation the same as an apostrophe', () => {
    assert.ok(validateBip32('m/84h/0h/0h'));
    assert.ok(validateBip32('m/84H/0H/0H'));
    assert.ok(validateBip32("M/84'/0'/0'")); // leading M is normalized to m
    assert.ok(validateBip32("  m/0'  ")); // surrounding whitespace is trimmed
  });
});

describe('normalizeDerivationPath', () => {
  it('canonicalizes h/H and smart quotes to apostrophes', () => {
    assert.strictEqual(normalizeDerivationPath('m/84h/0h/0h'), "m/84'/0'/0'");
    assert.strictEqual(normalizeDerivationPath('m/84H/0H/0H'), "m/84'/0'/0'");
    assert.strictEqual(normalizeDerivationPath('m/84‘/0’/0’'), "m/84'/0'/0'"); // iOS smart quotes
    assert.strictEqual(normalizeDerivationPath("M/84'/0'/0'"), "m/84'/0'/0'");
    assert.strictEqual(normalizeDerivationPath("  m/0'  "), "m/0'");
    assert.strictEqual(normalizeDerivationPath("m/84'/0'/0'"), "m/84'/0'/0'"); // already canonical
  });
});
