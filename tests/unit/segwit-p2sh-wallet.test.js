import { SegwitP2SHWallet } from '../../class';
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');

describe('Segwit P2SH wallet', () => {
  it('can create transaction', async () => {
    const wallet = new SegwitP2SHWallet();
    wallet.setSecret('Ky1vhqYGCiCbPd8nmbUeGfwLdXB1h5aGwxHwpXrzYRfY5cTZPDo4');
    assert.strictEqual(wallet.getAddress(), '3CKN8HTCews4rYJYsyub5hjAVm5g5VFdQJ');
    assert.deepStrictEqual(wallet.getAllExternalAddresses(), ['3CKN8HTCews4rYJYsyub5hjAVm5g5VFdQJ']);
    assert.strictEqual(await wallet.getChangeAddressAsync(), wallet.getAddress());
    assert.strictEqual(await wallet.getAddressAsync(), wallet.getAddress());

    const utxos = [
      {
        txid: 'a56b44080cb606c0bd90e77fcd4fb34c863e68e5562e75b4386e611390eb860c',
        vout: 0,
        value: 300000,
      },
    ];

    let txNew = wallet.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, wallet.getAddress());
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    const satPerVbyte = txNew.fee / tx.virtualSize();
    assert.strictEqual(Math.round(satPerVbyte), 1);
    assert.strictEqual(
      txNew.tx.toHex(),
      '020000000001010c86eb9013616e38b4752e56e5683e864cb34fcd7fe790bdc006b60c08446ba50000000017160014139dc70d73097f9d775f8a3280ba3e3435515641ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88aca73303000000000017a914749118baa93fb4b88c28909c8bf0a8202a0484f4870248304502210080545d30e3d30dff272ab11c91fd6150170b603239b48c3d56a3fa66bf240085022003762404e1b45975adc89f61ec1569fa19d6d4a8d405e060897754c489ebeade012103a5de146762f84055db3202c1316cd9008f16047f4f408c1482fdb108217eda0800000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), wallet.getAddress()); // change address

    // sendMax
    txNew = wallet.createTransaction(utxos, [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, wallet.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
  });

  it('can sign and verify messages', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    assert.strictEqual(signature, 'I9L5yLFjti0QTHhPyFrZCT1V/MMnBtXKmoiKDZ78NDBjERki6ZTQZdSMCtkgoNmp17By9ItJr8o7ChX0XxY91nk=');
    assert.strictEqual(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature), true);
  });
});
