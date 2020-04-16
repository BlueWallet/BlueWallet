/* global it, describe, jasmine, afterAll, beforeAll */
import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitBech32Transaction, SegwitBech32Wallet } from '../../class';

const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment

global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../BlueElectrum');

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

describe('HDSegwitBech32Transaction', () => {
  it('can decode & check sequence', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    let T = new HDSegwitBech32Transaction(null, '99a385c93ccca11c10a61517c7a61c35c3c4b81c3e02a8deadc277d4b66eb47a');
    assert.strictEqual(await T.getMaxUsedSequence(), 0xfffffffd);
    assert.strictEqual(await T.isSequenceReplaceable(), true);
    // 881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e
    T = new HDSegwitBech32Transaction(
      '0200000000010145d7fe10a2990327904f6b9f73d24f7d74c824d119b85e34c4100cd70828daa00100000000fdffffff02005039278c0400001976a91406aaf09fad86d04c02be6685796efc0cf317f24d88ac768381f9040d00001600148e2ad749c3ad8a9abd6d247d1112bbdf1cda282502483045022100fad6623ec5019526c4826055e891aea9be42d6ce6030acfc9773072c9b1ca13f02207b9fe22d56f934556ba2b3ba5fb87341a8bbbfab9a5e59925add5b706e9b55cb01210294315589c16e49c096e68216bda14149f719f1bcb45d37ba5feb9b5d715b23de235e0000',
    );
    assert.strictEqual(await T.getMaxUsedSequence(), 0xfffffffd);
    assert.strictEqual(await T.isSequenceReplaceable(), true);

    assert.ok((await T.getRemoteConfirmationsNum()) >= 1624);
  });

  it('can tell if its our transaction', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());
    await hd.fetchTransactions();

    let tt = new HDSegwitBech32Transaction(
      null,
      '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e',
      hd,
    );

    assert.ok(await tt.isOurTransaction());

    tt = new HDSegwitBech32Transaction(null, '89bcff166c39b3831e03257d4bcc1034dd52c18af46a3eb459e72e692a88a2d8', hd);

    assert.ok(!(await tt.isOurTransaction()));
  });

  it('can tell tx info', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    await hd.fetchBalance();
    await hd.fetchTransactions();

    const tt = new HDSegwitBech32Transaction(
      null,
      '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e',
      hd,
    );

    const { fee, feeRate, targets, changeAmount, utxos } = await tt.getInfo();
    assert.strictEqual(fee, 4464);
    assert.strictEqual(changeAmount, 103686);
    assert.strictEqual(feeRate, 12);
    assert.strictEqual(targets.length, 1);
    assert.strictEqual(targets[0].value, 200000);
    assert.strictEqual(targets[0].address, '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    assert.strictEqual(
      JSON.stringify(utxos),
      JSON.stringify([
        {
          vout: 1,
          value: 108150,
          txId: 'f3d7fb23248168c977e8085b6bd5381d73c85da423056a47cbf734b5665615f1',
          address: 'bc1qahhgjtxexjx9t0e5pjzqwtjnxexzl6f5an38hq',
        },
        {
          vout: 0,
          value: 200000,
          txId: '89bcff166c39b3831e03257d4bcc1034dd52c18af46a3eb459e72e692a88a2d8',
          address: 'bc1qvh44cwd2v7zld8ef9ld5rs5zafmejuslp6yd73',
        },
      ]),
    );
  });

  it('can do RBF - cancel tx', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    await hd.fetchBalance();
    await hd.fetchTransactions();

    const tt = new HDSegwitBech32Transaction(
      null,
      '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e',
      hd,
    );

    assert.strictEqual(await tt.canCancelTx(), true);

    const { tx } = await tt.createRBFcancelTx(15);

    const createdTx = bitcoin.Transaction.fromHex(tx.toHex());
    assert.strictEqual(createdTx.ins.length, 2);
    assert.strictEqual(createdTx.outs.length, 1);
    const addr = SegwitBech32Wallet.scriptPubKeyToAddress(createdTx.outs[0].script);
    assert.ok(hd.weOwnAddress(addr));

    const actualFeerate = (108150 + 200000 - createdTx.outs[0].value) / (tx.toHex().length / 2);
    assert.strictEqual(Math.round(actualFeerate), 15);

    const tt2 = new HDSegwitBech32Transaction(tx.toHex(), null, hd);
    assert.strictEqual(await tt2.canCancelTx(), false); // newly created cancel tx is not cancellable anymore
  });

  it('can do RBF - bumpfees tx', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    await hd.fetchBalance();
    await hd.fetchTransactions();

    const tt = new HDSegwitBech32Transaction(
      null,
      '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e',
      hd,
    );

    assert.strictEqual(await tt.canCancelTx(), true);

    const { tx } = await tt.createRBFbumpFee(17);

    const createdTx = bitcoin.Transaction.fromHex(tx.toHex());
    assert.strictEqual(createdTx.ins.length, 2);
    assert.strictEqual(createdTx.outs.length, 2);
    const addr0 = SegwitP2SHWallet.scriptPubKeyToAddress(createdTx.outs[0].script);
    assert.ok(!hd.weOwnAddress(addr0));
    assert.strictEqual(addr0, '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC'); // dest address
    const addr1 = SegwitBech32Wallet.scriptPubKeyToAddress(createdTx.outs[1].script);
    assert.ok(hd.weOwnAddress(addr1));

    const actualFeerate =
      (108150 + 200000 - (createdTx.outs[0].value + createdTx.outs[1].value)) / (tx.toHex().length / 2);
    assert.strictEqual(Math.round(actualFeerate), 17);

    const tt2 = new HDSegwitBech32Transaction(tx.toHex(), null, hd);
    assert.strictEqual(await tt2.canCancelTx(), true); // new tx is still cancellable since we only bumped fees
  });

  it('can do CPFP - bump fees', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    await hd.fetchBalance();
    await hd.fetchTransactions();

    const tt = new HDSegwitBech32Transaction(
      null,
      '2ec8a1d0686dcccffc102ba5453a28d99c8a1e5061c27b41f5c0a23b0b27e75f',
      hd,
    );
    assert.ok(await tt.isToUsTransaction());
    const { unconfirmedUtxos, fee: oldFee } = await tt.getInfo();

    assert.strictEqual(
      JSON.stringify(unconfirmedUtxos),
      JSON.stringify([
        {
          vout: 0,
          value: 200000,
          txId: '2ec8a1d0686dcccffc102ba5453a28d99c8a1e5061c27b41f5c0a23b0b27e75f',
          address: 'bc1qvlmgrq0gtatanmas0tswrsknllvupq2g844ss2',
        },
      ]),
    );

    const { tx, fee } = await tt.createCPFPbumpFee(20);
    const avgFeeRate = (oldFee + fee) / (tt._txhex.length / 2 + tx.toHex().length / 2);
    assert.ok(Math.round(avgFeeRate) >= 20);
  });
});
