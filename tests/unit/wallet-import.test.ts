import assert from 'assert';

import { validateBip32 } from '../../class/wallet-import';

describe('validateBip32', () => {
  it('requires an m/ prefix so bip174 does not drop the first path level', () => {
    assert.ok(validateBip32("m/84'/0'/0'"));
    assert.ok(validateBip32("m/0'"));
    assert.ok(validateBip32('m/0/0'));
    assert.ok(!validateBip32("84'/0'/0'"));
    assert.ok(!validateBip32('m'));
    assert.ok(!validateBip32(''));
  });
});
