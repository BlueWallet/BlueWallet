/* global describe, it */
import { HDLegacyElectrumSeedP2PKHWallet } from '../../class';
let assert = require('assert');

describe('HDLegacyElectrumSeedP2PKHWallet', () => {
  it('can import mnemonics and generate addresses and WIFs', async function() {
    if (!process.env.HD_ELECTRUM_SEED_LEGACY) {
      console.error('process.env.HD_ELECTRUM_SEED_LEGACY not set, skipped');
      return;
    }
    let hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret(process.env.HD_ELECTRUM_SEED_LEGACY);
    assert.ok(hd.validateMnemonic());

    let address = hd._getExternalAddressByIndex(0);
    assert.strictEqual(address, '1Ca9ZVshGdKiiMEMNTG1bYqbifYMZMwV8');

    address = hd._getInternalAddressByIndex(0);
    assert.strictEqual(address, '1JygAvTQS9haAYgRfPSdHgmXd3syjB8Fnp');

    let wif = hd._getExternalWIFByIndex(0);
    assert.strictEqual(wif, 'KxGPz9dyib26p6bL2vQPvBPHBMA8iHVqEetg3x5XA4Rk1trZ11Kz');

    wif = hd._getInternalWIFByIndex(0);
    assert.strictEqual(wif, 'L52d26QmYGW8ctHo1omM5fZeJMgaonSkEWCGpnEekNvkVUoqTsNF');

    hd.setSecret('bs');
    assert.ok(!hd.validateMnemonic());
  });
});
