import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { TaprootWallet } from '../../class/wallets/taproot-wallet';

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
    assert.ok(w.weOwnAddress('BC1PM6LQLEL3QXEFSX0V39NSHTGHASVVP6GHN3E5HD5Q280J5M9H7CSQRKZSSU'));
    assert.ok(!w.weOwnAddress('bc1ptestlpef53v6vyku3f9rk0ve2mek2fdwnd9k6q3mnyn6vs9nqlsqqnejxf'));
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
      '020000000001013bac121c5062a6a5013f0787d58838e5e55417efc513a3105300d73da0c9c44d0000000000ffffffff0178250000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac01406087f1d26526c282af3c27d585e16dd329af1bfeff29cab58a16e715f31320e52a0b65526e512780eb3caf7bd5dc23bae119b3b23c9650da9dc56b6b2d1805e800000000',
    );

    // verifying:
    const tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
  });

  it('estimates fee using taproot input size, not p2wpkh', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF');
    const address = String(w.getAddress());
    const utxos = [
      { height: 0, value: 100000, address, txid: '4dc4c9a03dd7005310a313c5ef1754e5e53888d587073f01a5a662501c12ac3b', vout: 0 },
      { height: 0, value: 100000, address, txid: '4dc4c9a03dd7005310a313c5ef1754e5e53888d587073f01a5a662501c12ac3b', vout: 1 },
    ];

    // 2 taproot inputs, p2tr target + p2tr change
    const txNew = w.createTransaction(utxos, [{ address, value: 150000 }], 1, address, 0xffffffff, false, 0);
    assert.ok(txNew.tx);
    assert.strictEqual(txNew.tx.ins.length, 2);
    assert.strictEqual(txNew.tx.outs.length, 2);

    const vsize = txNew.tx.virtualSize();
    assert.ok(txNew.fee >= vsize, `fee ${txNew.fee} is below 1 sat/vbyte for ${vsize} vbytes`);
    // allow only rounding slack; p2wpkh sizing would overpay by ~10 vbytes per input
    assert.ok(txNew.fee <= vsize + 4, `fee ${txNew.fee} overpays for ${vsize} vbytes`);
  });

  it('never creates change below dust limit', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF');
    const address = String(w.getAddress());
    const utxos = [
      { height: 0, value: 100000, address, txid: '4dc4c9a03dd7005310a313c5ef1754e5e53888d587073f01a5a662501c12ac3b', vout: 0 },
    ];

    // sweeping target value so the remainder crosses the dust window. p2tr dust limit is 330 sats
    for (const feeRate of [0.5, 1, 2, 2.3]) {
      let minChange = Infinity;
      for (let value = 100000 - 1200; value < 100000; value++) {
        let res;
        try {
          res = w.coinselect(utxos, [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value }], feeRate);
        } catch (e: any) {
          assert.ok(e.message.includes('Not enough balance'), e.message);
          break;
        }
        const change = res.outputs.find(o => !o.address);
        if (change) minChange = Math.min(minChange, change.value);
      }
      // change is created as soon as it is relayable (330 sats for p2tr) and worth spending (148 vbytes on current fee rate),
      // but not earlier. it would be 546 if change script was not passed to coinselect lib, as it assumes p2pkh then
      assert.strictEqual(minChange, Math.max(330, Math.floor(148 * feeRate) + 1), `feeRate ${feeRate}`);
    }
  });

  it('pays requested feerate when sending to uppercase bech32 address', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF');
    const address = String(w.getAddress());
    const utxos = [
      { height: 0, value: 100000, address, txid: '4dc4c9a03dd7005310a313c5ef1754e5e53888d587073f01a5a662501c12ac3b', vout: 0 },
    ];

    // sendMax
    const txNew = w.createTransaction(
      utxos,
      [{ address: 'BC1PGRHJJW52P6A03V635F7CNL6TTVUZ9F34UJHAEFM6XQTSCD3M473SZKL92G' }],
      1,
      address,
      0xffffffff,
      false,
      0,
    );
    assert.ok(txNew.tx);
    assert.strictEqual(
      bitcoin.address.fromOutputScript(txNew.tx.outs[0].script),
      'bc1pgrhjjw52p6a03v635f7cnl6ttvuz9f34ujhaefm6xqtscd3m473szkl92g',
    );
    const vsize = txNew.tx.virtualSize();
    assert.ok(txNew.fee >= vsize, `fee ${txNew.fee} is below 1 sat/vbyte for ${vsize} vbytes`);
  });
});
