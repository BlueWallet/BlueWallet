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
    assert.strictEqual(w.getAddress(), 'bc1pm6lqlel3qxefsx0v39nshtghasvvp6ghn3e5hd5q280j5m9h7csqrkzssu');
    assert.ok(w.weOwnAddress('bc1pm6lqlel3qxefsx0v39nshtghasvvp6ghn3e5hd5q280j5m9h7csqrkzssu'));
  });

  it('can derive address from WIF 2', () => {
    const w = new TaprootWallet();
    w.setSecret('L2an3aQwN2RX5YLkeXuFHUTVHuj1UKqRf38nESJRf6R9NmJrsftB');
    assert.strictEqual(w.getAddress(), 'bc1ptestlpef53v6vyku3f9rk0ve2mek2fdwnd9k6q3mnyn6vs9nqlsqqnejxf');
    assert.ok(w.weOwnAddress('bc1ptestlpef53v6vyku3f9rk0ve2mek2fdwnd9k6q3mnyn6vs9nqlsqqnejxf'));
  });

  it('can create transaction', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF');

    const utxos = [
      {
        height: 0,
        value: 10000,
        address: 'bc1pm6lqlel3qxefsx0v39nshtghasvvp6ghn3e5hd5q280j5m9h7csqrkzssu',
        txid: '4dc4c9a03dd7005310a313c5ef1754e5e53888d587073f01a5a662501c12ac3b',
        vout: 0,
      },
    ];

    // sendMax
    const txNew = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }],
      4,
      String(w.getAddress()),
      0xffffffff,
      false,
      0,
    );
    assert.ok(txNew.tx);

    assert.strictEqual(
      txNew.tx.toHex(),
      '020000000001013bac121c5062a6a5013f0787d58838e5e55417efc513a3105300d73da0c9c44d0000000000ffffffff0150250000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac0140fe709c8bc93582e749761438f76b4bc7d9820c4c321aa1849805f20bbeaba790bf0bb088031af50a75c0d7637c102d68322cfd77ce17342fdb22b19fef36e0b800000000',
    );

    // verifying:
    const tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
  });
});
