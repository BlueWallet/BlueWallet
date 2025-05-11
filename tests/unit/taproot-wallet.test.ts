import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { TaprootWallet } from '../../class';

describe('Taproot wallet', () => {
  it('can convert scriptPubKey to address', () => {
    let address = TaprootWallet.scriptPubKeyToAddress('512040ef293a8a0ebaf8b351a27d89ff4b5b3822a635e4afdca77a30170c363bafa3');
    assert.strictEqual(address, 'bc1pgrhjjw52p6a03v635f7cnl6ttvuz9f34ujhaefm6xqtscd3m473szkl92g');
    address = TaprootWallet.scriptPubKeyToAddress('');
    assert.strictEqual(address, false);
    address = TaprootWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);
  });

  it('can derive address from WIF', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF');
    assert.strictEqual(w.getAddress(), 'bc1payhxedzyjtu8w7ven7au9925pmhc5gl59m77ht9vqq0l5xq8fsgqtwg8vf');
    assert.ok(w.weOwnAddress('bc1payhxedzyjtu8w7ven7au9925pmhc5gl59m77ht9vqq0l5xq8fsgqtwg8vf'));
  });

  it('can create transaction', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF');

    const utxos = [
      {
        height: 894578,
        value: 9778,
        address: 'bc1payhxedzyjtu8w7ven7au9925pmhc5gl59m77ht9vqq0l5xq8fsgqtwg8vf',
        txid: '511e007f9c96b6d713a72b730506198f61dd96046edee72f0dc636bfe1f3a9cf',
        vout: 0,
        confirmations: 1046,
      },
    ];

    // sendMax
    const txNew = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }],
      1,
      String(w.getAddress()),
      0xffffffff,
      false,
      0,
    );
    assert.ok(txNew.tx);

    assert.strictEqual(
      txNew.tx.toHex(),
      '02000000000101cfa9f3e1bf36c60d2fe7de6e0496dd618f190605732ba713d7b6969c7f001e510000000000ffffffff01c2250000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac0140d75f5e8012a42b7341e9f26e26c45c1e78301f2bb74ed9f4a0183154973649523e3e91a6b61fca600e1904fde467099bc1c46c5a9d9b431d60afc6c7054aadb900000000',
    );

    // verifying:
    const tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
  });
});
