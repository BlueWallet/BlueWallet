import * as bitcoin from 'bitcoinjs-lib';
import { SegwitP2SHWallet } from '../../class';

describe('Segwit P2SH wallet', () => {
  it('can create transaction', async () => {
    const wallet = new SegwitP2SHWallet();
    wallet.setSecret('Ky1vhqYGCiCbPd8nmbUeGfwLdXB1h5aGwxHwpXrzYRfY5cTZPDo4');
    expect(wallet.getAddress()).toBe('3CKN8HTCews4rYJYsyub5hjAVm5g5VFdQJ');
    expect(wallet.getAllExternalAddresses()).toEqual(['3CKN8HTCews4rYJYsyub5hjAVm5g5VFdQJ']);
    expect(await wallet.getChangeAddressAsync()).toBe(wallet.getAddress());
    expect(await wallet.getAddressAsync()).toBe(wallet.getAddress());

    const utxos = [
      {
        txid: 'a56b44080cb606c0bd90e77fcd4fb34c863e68e5562e75b4386e611390eb860c',
        vout: 0,
        value: 300000,
      },
    ];

    let txNew = wallet.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, wallet.getAddress());
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    expect(txNew.tx.toHex()).toBe(
      '020000000001010c86eb9013616e38b4752e56e5683e864cb34fcd7fe790bdc006b60c08446ba50000000017160014139dc70d73097f9d775f8a3280ba3e3435515641ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac6e3303000000000017a914749118baa93fb4b88c28909c8bf0a8202a0484f4870247304402205f0bcb0d9968b3c410e2a3699369bf4149bb56ade18b63356b45285a34d64600022043ac1271f3900ea1000a66b9a9d9ceb3e6e4a4ef45c4da0f55b691ad4b64fcb1012103a5de146762f84055db3202c1316cd9008f16047f4f408c1482fdb108217eda0800000000',
    );
    expect(tx.ins.length).toBe(1);
    expect(tx.outs.length).toBe(2);
    expect('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB').toBe(bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    expect(bitcoin.address.fromOutputScript(tx.outs[1].script)).toBe(wallet.getAddress()); // change address

    // sendMax
    txNew = wallet.createTransaction(utxos, [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, wallet.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    expect(tx.ins.length).toBe(1);
    expect(tx.outs.length).toBe(1);
    expect('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB').toBe(bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
  });

  it('can sign and verify messages', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    expect(signature).toBe('I9L5yLFjti0QTHhPyFrZCT1V/MMnBtXKmoiKDZ78NDBjERki6ZTQZdSMCtkgoNmp17By9ItJr8o7ChX0XxY91nk=');
    expect(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature)).toBe(true);
  });
});
