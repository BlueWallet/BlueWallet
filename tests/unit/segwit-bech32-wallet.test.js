import * as bitcoin from 'bitcoinjs-lib';
import { SegwitBech32Wallet } from '../../class';

describe('Segwit P2SH wallet', () => {
  it('can create transaction', async () => {
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret('L4vn2KxgMLrEVpxjfLwxfjnPPQMnx42DCjZJ2H7nN4mdHDyEUWXd');
    expect(wallet.getAddress()).toBe('bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe');
    expect(wallet.getAllExternalAddresses()).toEqual(['bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe']);
    expect(await wallet.getChangeAddressAsync()).toBe(wallet.getAddress());

    const utxos = [
      {
        txid: '57d18bc076b919583ff074cfba6201edd577f7fe35f69147ea512e970f95ffeb',
        vout: 0,
        value: 100000,
      },
    ];

    let txNew = wallet.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, wallet.getAddress());
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    expect(txNew.tx.toHex()).toBe(
      '02000000000101ebff950f972e51ea4791f635fef777d5ed0162bacf74f03f5819b976c08bd1570000000000ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac2e2600000000000016001488fefdd8967886b32760995c1c36289f44f791850247304402206272d7ba35177bbcccbf52a49a9466e7692252ebbb36753c50ea99c6de8ddb6402204975c76d894b6811b86bab9f2544e7ade7d4f4f7e6a543a60d0af1b854c493a601210314cf2bf53f221e58c5adc1dd95adba9239b248f39b09eb2c550aadc1926fe7aa00000000',
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

    // batch send + send max
    txNew = wallet.createTransaction(
      utxos,
      [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }, { address: '14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', value: 10000 }],
      1,
      wallet.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    expect(tx.ins.length).toBe(1);
    expect(tx.outs.length).toBe(2);
    expect('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB').toBe(bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    expect('14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M').toBe(bitcoin.address.fromOutputScript(tx.outs[1].script)); // to address
  });

  it('can sign and verify messages', async () => {
    const l = new SegwitBech32Wallet();
    l.setSecret('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    expect(signature).toBe('J9L5yLFjti0QTHhPyFrZCT1V/MMnBtXKmoiKDZ78NDBjERki6ZTQZdSMCtkgoNmp17By9ItJr8o7ChX0XxY91nk=');
    expect(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature)).toBe(true);
  });
});
