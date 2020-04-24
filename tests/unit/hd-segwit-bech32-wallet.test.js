/* global it, describe */
import { HDSegwitBech32Wallet } from '../../class';
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
let assert = require('assert');

describe('Bech32 Segwit HD (BIP84)', () => {
  it('can create', async function() {
    let mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);

    assert.strictEqual(true, hd.validateMnemonic());
    assert.strictEqual(
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
      hd.getXpub(),
    );

    assert.strictEqual(hd._getExternalWIFByIndex(0), 'KyZpNDKnfs94vbrwhJneDi77V6jF64PWPF8x5cdJb8ifgg2DUc9d');
    assert.strictEqual(hd._getExternalWIFByIndex(1), 'Kxpf5b8p3qX56DKEe5NqWbNUP9MnqoRFzZwHRtsFqhzuvUJsYZCy');
    assert.strictEqual(hd._getInternalWIFByIndex(0), 'KxuoxufJL5csa1Wieb2kp29VNdn92Us8CoaUG3aGtPtcF3AzeXvF');
    assert.ok(hd._getInternalWIFByIndex(0) !== hd._getInternalWIFByIndex(1));

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));

    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
      '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
    );
    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
      '03025324888e429ab8e3dbaf1f7802648b9cd01e9b418485c5fa4c1b9b5700e1a6',
    );

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/84'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(1)), "m/84'/0'/0'/0/1");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/84'/0'/0'/1/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(1)), "m/84'/0'/0'/1/1");
  });

  it('can generate addresses only via zpub', function() {
    let zpub = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
    let hd = new HDSegwitBech32Wallet();
    hd._xpub = zpub;
    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));
  });

  it('can generate', async () => {
    let hd = new HDSegwitBech32Wallet();
    let hashmap = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      let secret = hd.getSecret();
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    let hd2 = new HDSegwitBech32Wallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });
});
