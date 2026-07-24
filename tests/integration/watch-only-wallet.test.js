import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { HDSegwitBech32Transaction } from '../../class/hd-segwit-bech32-transaction';

jest.setTimeout(500 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  if (!(await BlueElectrum.ensureConnected())) {
    throw new Error('failed to connect to Electrum');
  }
});

describe('Watch only wallet', () => {
  it('can fetch balance', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('12cbQLTFMXRnSzktFkuoG3eHoMeFtpTu3S');
    await w.fetchBalance();
    assert.ok(w.getBalance() > 16);
  });

  it('can fetch tx', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('1BiJW1jyUaxcJp2JWwbPLPzB1toPNWTFJV');
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    // fetch again and make sure no duplicates
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can fetch tx from huge wallet', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s'); // binance wallet
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length === 0, w.getTransactions().length); // not yet kek but at least we dont crash
  });

  it('can fetch TXs with values', async () => {
    const w = new WatchOnlyWallet();
    for (const sec of [
      'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      'BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'bitcoin:bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      'BITCOIN:BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'bitcoin:BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'BITCOIN:bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
    ]) {
      w.setSecret(sec);
      assert.strictEqual(w.getAddress(), 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
      assert.strictEqual(await w.getAddressAsync(), 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
      assert.ok(w.weOwnAddress('bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv'));
      assert.ok(w.weOwnAddress('BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV'));
      assert.ok(!w.weOwnAddress('garbage'));
      assert.ok(!w.weOwnAddress(false));
      await w.fetchTransactions();

      for (const tx of w.getTransactions()) {
        assert.ok(tx.hash);
        assert.ok(tx.value);
        assert.ok(tx.timestamp);
        assert.ok(tx.confirmations > 1);
      }

      assert.strictEqual(w.getTransactions()[0].value, -892111);
      assert.strictEqual(w.getTransactions()[1].value, 892111);
    }
  });

  it('can fetch complex TXs', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    await w.fetchTransactions();
    for (const tx of w.getTransactions()) {
      assert.ok(tx.value, 'incorrect tx.value');
    }
  });

  it('can fetch balance & transactions from zpub HD', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rnbAtzupLPpSrsBKRsHupFvv1h6pwfRnZxX3qs6RL4LiLqKQ6kfBaDckn2apQWfyw1D2TdQMMDCfUDHMwtrcbGoy88xoKBLmADTFK9AhLe');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 2400);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 4);
    const nextAddress = await w.getAddressAsync();

    assert.strictEqual(w.getNextFreeAddressIndex(), 2);
    assert.strictEqual(nextAddress, 'bc1q9v6mvgpehtmh0qc3y24mq6auwt8my4l68k9xyj');
    assert.strictEqual(nextAddress, w._getExternalAddressByIndex(w.getNextFreeAddressIndex()));

    const nextChangeAddress = await w.getChangeAddressAsync();
    assert.strictEqual(nextChangeAddress, 'bc1q74tz7eflqc62v8utqlazcs3tqtwmvvzud5dmrz');
  });

  it('can edit master finger print', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rERe82dmmpndd2jSsRH5o3GaDfESv1Zk2cESDuB85HFNSujcDBDZTxvdNCdXzfi83okz7VKx46FA9RxkfYHcZLKU3FRY2b4sf2DzNoMdLU');

    assert.strictEqual(w.getMasterFingerprintHex(), '00000000');
    w.setMasterFingerprintHex('398e3e5b');
    assert.strictEqual(w.getMasterFingerprintHex(), '398e3e5b');

    w.setMasterFingerprintHex('0x398e3e5b');
    assert.strictEqual(w.getMasterFingerprintHex(), '398e3e5b');

    assert.throws(() => w.setMasterFingerprintHex(''), /Master fingerprint must be a valid hex of exactly 8 hex characters/);
    assert.throws(() => w.setMasterFingerprintHex('1234'), /Master fingerprint must be a valid hex of exactly 8 hex characters/);
    assert.throws(() => w.setMasterFingerprintHex('123456789'), /Master fingerprint must be a valid hex of exactly 8 hex characters/);
    assert.throws(() => w.setMasterFingerprintHex('gggggggg'), /Master fingerprint must be a valid hex of exactly 8 hex characters/);
    assert.throws(() => w.setMasterFingerprintHex('398e3e5g'), /Master fingerprint must be a valid hex of exactly 8 hex characters/);
  });

  it('can do RBF - bumpfees tx', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6qLpbJKVYnGb61HgUUuG5jRsrQrJ2uFCuQTX2nyuwPMv8vs8bQbq1T3oLMcbBRp3J8yjHnSnMR7Ykg4ffF82qGjC2TkuKnoAHKPWDJNvYKS');
    w.init();

    let tt = new HDSegwitBech32Transaction(
      null,
      '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400',
      w._hdWalletInstance,
      4056346968,
    );
    let result = await tt.createRBFbumpFee(5);

    // result.tx will be undefined because watch only path that returns psbt will be taken
    assert.strictEqual(result.tx, undefined);

    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [88, 241, 198, 241]);
    }

    // without mfp or mfp = 0
    tt = new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w._hdWalletInstance);
    result = await tt.createRBFbumpFee(5);
    assert.strictEqual(result.tx, undefined);
    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [0, 0, 0, 0]);
    }

    // should throw if w and not w._hdWalletInstance is passed
    assert.throws(
      () => new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w),
      /Only HD Bech32 wallets supported/,
    );
  });

  it('can do RBF - cancel tx', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6qLpbJKVYnGb61HgUUuG5jRsrQrJ2uFCuQTX2nyuwPMv8vs8bQbq1T3oLMcbBRp3J8yjHnSnMR7Ykg4ffF82qGjC2TkuKnoAHKPWDJNvYKS');
    w.init();

    let tt = new HDSegwitBech32Transaction(
      null,
      '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400',
      w._hdWalletInstance,
      4056346968,
    );
    let result = await tt.createRBFcancelTx(5);

    // result.tx will be undefined because watch only path that returns psbt will be taken
    assert.strictEqual(result.tx, undefined);

    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [88, 241, 198, 241]);
    }

    // without mfp or mfp = 0
    tt = new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w._hdWalletInstance);
    result = await tt.createRBFcancelTx(5);
    assert.strictEqual(result.tx, undefined);
    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [0, 0, 0, 0]);
    }

    // should throw if w and not w._hdWalletInstance is passed
    assert.throws(
      () => new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w),
      /Only HD Bech32 wallets supported/,
    );
  });

  // skipped because its generally rare case
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can fetch txs for address funded by genesis txs', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('37jKPSmbEGwgfacCr2nayn1wTaqMAbA94Z');
    await w.fetchBalance();
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 138);
  });
});
