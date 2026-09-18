import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { SegwitBech32Wallet } from '../../class/wallets/segwit-bech32-wallet';

describe('Segwit P2SH wallet', () => {
  it('can create transaction', async () => {
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret('L4vn2KxgMLrEVpxjfLwxfjnPPQMnx42DCjZJ2H7nN4mdHDyEUWXd');
    assert.strictEqual(wallet.getAddress(), 'bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe');
    assert.deepStrictEqual(wallet.getAllExternalAddresses(), ['bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe']);
    assert.strictEqual(await wallet.getChangeAddressAsync(), wallet.getAddress());

    const feeRate = 1;
    const utxos = [
      {
        txid: '57d18bc076b919583ff074cfba6201edd577f7fe35f69147ea512e970f95ffeb',
        vout: 0,
        value: 100000,
      },
    ];

    let txNew = wallet.createTransaction(
      utxos,
      [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }],
      feeRate,
      wallet.getAddress(),
    );
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    // check fee rate up to the second decimal place
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(
      txNew.tx.toHex(),
      '02000000000101ebff950f972e51ea4791f635fef777d5ed0162bacf74f03f5819b976c08bd1570000000000ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac7d2600000000000016001488fefdd8967886b32760995c1c36289f44f7918502483045022100b707a9da115129440be1f19356b15cd5fa3e66317e5cfb6b9acd65d3cd0ea08602200307bdb795bddfaa2b0b579fd99b8f23376dd99070dba3d24f43f55ff4732bea01210314cf2bf53f221e58c5adc1dd95adba9239b248f39b09eb2c550aadc1926fe7aa00000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), wallet.getAddress()); // change address

    // sendMax
    txNew = wallet.createTransaction(utxos, [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], feeRate, wallet.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.ok(txNew.fee >= tx.virtualSize() * feeRate, `fee ${txNew.fee} is below ${feeRate} sat/vbyte for ${tx.virtualSize()} vbytes`);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address

    // exact amount, no change and not a send max: still has to pay for every vbyte.
    // tx is 113 vbytes, so 112 sats left for the fee is not enough
    assert.throws(
      () =>
        wallet.createTransaction(utxos, [{ value: 99888, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], feeRate, wallet.getAddress()),
      /Not enough balance/,
    );
    txNew = wallet.createTransaction(
      utxos,
      [{ value: 99887, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }],
      feeRate,
      wallet.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.outs.length, 1);
    assert.ok(txNew.fee >= tx.virtualSize() * feeRate, `fee ${txNew.fee} is below ${feeRate} sat/vbyte for ${tx.virtualSize()} vbytes`);

    // batch send + send max
    txNew = wallet.createTransaction(
      utxos,
      [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }, { address: '14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', value: 10000 }],
      feeRate,
      wallet.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual('14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', bitcoin.address.fromOutputScript(tx.outs[1].script)); // to address
  });

  it('can create transaction with decimal fee rate', async () => {
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret('L4vn2KxgMLrEVpxjfLwxfjnPPQMnx42DCjZJ2H7nN4mdHDyEUWXd');
    assert.strictEqual(wallet.getAddress(), 'bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe');
    assert.deepStrictEqual(wallet.getAllExternalAddresses(), ['bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe']);
    assert.strictEqual(await wallet.getChangeAddressAsync(), wallet.getAddress());

    const feeRate = 1.5;
    const utxos = [
      {
        txid: '57d18bc076b919583ff074cfba6201edd577f7fe35f69147ea512e970f95ffeb',
        vout: 0,
        value: 100000,
      },
    ];

    let txNew = wallet.createTransaction(
      utxos,
      [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }],
      feeRate,
      wallet.getAddress(),
    );
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    // check fee rate up to the second decimal place
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(
      txNew.tx.toHex(),
      '02000000000101ebff950f972e51ea4791f635fef777d5ed0162bacf74f03f5819b976c08bd1570000000000ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac332600000000000016001488fefdd8967886b32760995c1c36289f44f7918502483045022100830c552ca36dbb0c49b1483edcf5fdc8a2d60898be32c4822c16b5e54dce8b9502207441da284d135e0579882385742e0ec889f435f5146e00b1ffd511f934b6c90101210314cf2bf53f221e58c5adc1dd95adba9239b248f39b09eb2c550aadc1926fe7aa00000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), wallet.getAddress()); // change address

    // sendMax
    txNew = wallet.createTransaction(utxos, [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], feeRate, wallet.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address

    // batch send + send max
    txNew = wallet.createTransaction(
      utxos,
      [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }, { address: '14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', value: 10000 }],
      feeRate,
      wallet.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual('14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', bitcoin.address.fromOutputScript(tx.outs[1].script)); // to address
  });

  it('can sign and verify messages', async () => {
    const l = new SegwitBech32Wallet();
    l.setSecret('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    assert.strictEqual(signature, 'J9L5yLFjti0QTHhPyFrZCT1V/MMnBtXKmoiKDZ78NDBjERki6ZTQZdSMCtkgoNmp17By9ItJr8o7ChX0XxY91nk=');
    assert.strictEqual(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature), true);
  });

  it('can coinselect with different decimal feeRate', async () => {
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret('L4vn2KxgMLrEVpxjfLwxfjnPPQMnx42DCjZJ2H7nN4mdHDyEUWXd');
    const change = wallet.getAddress();
    const utxos = [
      {
        txid: '57d18bc076b919583ff074cfba6201edd577f7fe35f69147ea512e970f95ffeb',
        vout: 0,
        value: 100000,
      },
    ];
    for (let feeRate = 1; feeRate < 20; feeRate += 0.1) {
      wallet.coinselect(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], feeRate);
      const txNew = wallet.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], feeRate, change);
      const tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
      const actualFeeRate = txNew.fee / tx.virtualSize();
      const diffPercentage = (Math.abs(actualFeeRate - feeRate) / feeRate) * 100;
      // check that actual fee rate is not more that 3% different from the expected fee rate
      assert.ok(diffPercentage < 3, `Fee rate is too different: expected ${feeRate}, got ${actualFeeRate}`);
    }
  });
});
