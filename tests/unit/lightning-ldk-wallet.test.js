import { HDSegwitBech32Wallet, LightningLdkWallet } from '../../class';
const assert = require('assert');

describe('', () => {
  function isHex(h) {
    const re = /[0-9A-Fa-f]{6}/g;
    return re.test(h);
  }

  it('can generate', async () => {
    const ldk = new LightningLdkWallet();
    await ldk.generate();
    const secret = ldk.getSecret();
    assert.ok(secret.startsWith('ldk://'), 'got ' + secret);
    assert.ok(ldk.valid());
    assert.ok(isHex(ldk.getEntropyHex()));
    assert.ok(!isHex(ldk.getSecret()));
    assert.strictEqual(ldk.getEntropyHex().length, 64);
    assert.strictEqual(ldk.getEntropyHex(), ldk.getEntropyHex().toLowerCase());

    //

    const hd2 = new HDSegwitBech32Wallet();
    hd2.setSecret(ldk.getSecret().replace('ldk://', ''));
    assert.ok(hd2.validateMnemonic());

    //

    ldk.setSecret(secret);
    assert.ok(ldk.valid());
    ldk.setSecret('bla');
    assert.ok(!ldk.valid());

    //

    ldk.setSecret('ldk://zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote');
    assert.strictEqual(ldk.getEntropyHex(), 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  });

  it('can convert preimage to hash', () => {
    assert.strictEqual(
      LightningLdkWallet.preimage2hash('7ec674e1edfc6f5cf32b445e12aa1a1fe0c91b97dd61f98bb41214f31f3642d0'),
      '294c32ef715c92ac72af888b735950e8a8ea51c00bd4a01572a8da772956dde5',
    );
  });

  it('can work with 12 words mnemonics instead of 24', () => {
    const ldk = new LightningLdkWallet();
    ldk.setSecret('ldk://abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.strictEqual(ldk.getEntropyHex(), '0000000000000000000000000000000000000000000000000000000000000000');
    assert.ok(ldk.valid());
    assert.ok(isHex(ldk.getEntropyHex()));
    assert.ok(!isHex(ldk.getSecret()));
    assert.strictEqual(ldk.getEntropyHex().length, 64);
    assert.strictEqual(ldk.getEntropyHex(), ldk.getEntropyHex().toLowerCase());
  });

  it('can unwrap address', () => {
    const ldk = new LightningLdkWallet();
    ldk.setSecret('ldk://abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.strictEqual(ldk.unwrapFirstExternalAddressFromMnemonics(), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
  });
});
