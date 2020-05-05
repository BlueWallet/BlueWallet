/* global describe, it */
import { HDLegacyElectrumSeedP2PKHWallet } from '../../class';
let assert = require('assert');

describe('HDLegacyElectrumSeedP2PKHWallet', () => {
  it('can import mnemonics and generate addresses and WIFs', async function() {
    let hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret('receive happy  wash prosper update    pet neck acid try profit proud hungry  ');
    assert.ok(hd.validateMnemonic());
    assert.strictEqual(
      hd.getXpub(),
      'xpub661MyMwAqRbcG6vx5SspHUzrhRtPKyeGp41JJLBi3kgeMCFkR6mzGkhEttBHTZg6FYYij52pqD2cW7XsutiZrRukXNLqeo87mZAV5k5bC22',
    );

    let address = hd._getExternalAddressByIndex(0);
    assert.strictEqual(address, '1Ca9ZVshGdKiiMEMNTG1bYqbifYMZMwV8');

    address = hd._getInternalAddressByIndex(0);
    assert.strictEqual(address, '1JygAvTQS9haAYgRfPSdHgmXd3syjB8Fnp');

    let wif = hd._getExternalWIFByIndex(0);
    assert.strictEqual(wif, 'KxGPz9dyib26p6bL2vQPvBPHBMA8iHVqEetg3x5XA4Rk1trZ11Kz');

    wif = hd._getInternalWIFByIndex(0);
    assert.strictEqual(wif, 'L52d26QmYGW8ctHo1omM5fZeJMgaonSkEWCGpnEekNvkVUoqTsNF');

    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
      '02a6e6b674f82796cb4776673d824bf0673364fab24e62dcbfff4c1a5b69e3519b',
    );
    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
      '0344708260d2a832fd430285a0b915859d73e6ed4c6c6a9cb73e9069a9de56fb23',
    );

    hd.setSecret('bs');
    assert.ok(!hd.validateMnemonic());
  });
});
