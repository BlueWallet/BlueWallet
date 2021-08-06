import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitBech32Transaction, SegwitBech32Wallet } from '../../class';
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../blue_modules/BlueElectrum');
jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

let _cachedHdWallet = false;

/**
 * @returns {Promise<HDSegwitBech32Wallet>}
 * @private
 */
async function _getHdWallet() {
  if (_cachedHdWallet) return _cachedHdWallet;
  _cachedHdWallet = new HDSegwitBech32Wallet();
  _cachedHdWallet.setSecret(process.env.HD_MNEMONIC_BIP84);
  await _cachedHdWallet.fetchBalance();
  await _cachedHdWallet.fetchTransactions();
  return _cachedHdWallet;
}

describe('HDSegwitBech32Transaction', () => {
  it('can decode & check sequence', async function () {
    let T = new HDSegwitBech32Transaction(null, 'e9ef58baf4cff3ad55913a360c2fa1fd124309c59dcd720cdb172ce46582097b');
    assert.strictEqual(await T.getMaxUsedSequence(), 0xffffffff);
    assert.strictEqual(await T.isSequenceReplaceable(), false);

    // 881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e
    T = new HDSegwitBech32Transaction(
      '02000000000102f1155666b534f7cb476a0523a45dc8731d38d56b5b08e877c968812423fbd7f3010000000000000000d8a2882a692ee759b43e6af48ac152dd3410cc4b7d25031e83b3396c16ffbc8900000000000000000002400d03000000000017a914e286d58e53f9247a4710e51232cce0686f16873c870695010000000000160014d3e2ecbf4d91321794e0297e0284c47527cf878b02483045022100d18dc865fb4d087004d021d480b983b8afb177a1934ce4cd11cf97b03e17944f02206d7310687a84aab5d4696d535bca69c2db4449b48feb55fff028aa004f2d1744012103af4b208608c75f38e78f6e5abfbcad9c360fb60d3e035193b2cd0cdc8fc0155c0247304402207556e859845df41d897fe442f59b6106c8fa39c74ba5b7b8e3268ab0aebf186f0220048a9f3742339c44a1e5c78b491822b96070bcfda3f64db9dc6434f8e8068475012102456e5223ed3884dc6b0e152067fd836e3eb1485422eda45558bf83f59c6ad09f00000000',
    );
    assert.strictEqual(await T.getMaxUsedSequence(), 0);
    assert.strictEqual(await T.isSequenceReplaceable(), true);

    assert.ok((await T.getRemoteConfirmationsNum()) >= 292);
  });

  it('can tell if its our transaction', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    let tt = new HDSegwitBech32Transaction(null, '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e', hd);

    assert.ok(await tt.isOurTransaction());

    tt = new HDSegwitBech32Transaction(null, '89bcff166c39b3831e03257d4bcc1034dd52c18af46a3eb459e72e692a88a2d8', hd);

    assert.ok(!(await tt.isOurTransaction()));
  });

  it('can tell tx info', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e', hd);

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

  it('can do RBF - cancel tx', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e', hd);

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

  it('can do RBF - bumpfees tx', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e', hd);

    assert.strictEqual(await tt.canCancelTx(), true);
    assert.strictEqual(await tt.canBumpTx(), true);

    const { tx } = await tt.createRBFbumpFee(17);

    const createdTx = bitcoin.Transaction.fromHex(tx.toHex());
    assert.strictEqual(createdTx.ins.length, 2);
    assert.strictEqual(createdTx.outs.length, 2);
    const addr0 = SegwitP2SHWallet.scriptPubKeyToAddress(createdTx.outs[0].script);
    assert.ok(!hd.weOwnAddress(addr0));
    assert.strictEqual(addr0, '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC'); // dest address
    const addr1 = SegwitBech32Wallet.scriptPubKeyToAddress(createdTx.outs[1].script);
    assert.ok(hd.weOwnAddress(addr1));

    const actualFeerate = (108150 + 200000 - (createdTx.outs[0].value + createdTx.outs[1].value)) / (tx.toHex().length / 2);
    assert.strictEqual(Math.round(actualFeerate), 17);

    const tt2 = new HDSegwitBech32Transaction(tx.toHex(), null, hd);
    assert.strictEqual(await tt2.canCancelTx(), true); // new tx is still cancellable since we only bumped fees
  });

  it('can do CPFP - bump fees', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, '2ec8a1d0686dcccffc102ba5453a28d99c8a1e5061c27b41f5c0a23b0b27e75f', hd);
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
