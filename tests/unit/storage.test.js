import AsyncStorage from '@react-native-async-storage/async-storage';
import assert from 'assert';

import { BlueApp, HDSegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

it('Appstorage - loadFromDisk works', async () => {
  /** @type {BlueApp} */
  const Storage = new BlueApp();
  const w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  await w.generate();
  Storage.wallets.push(w);
  Storage.tx_metadata = {
    txid: {
      memo: 'tx label',
    },
  };
  Storage.counterparty_metadata = {
    'payment code': {
      label: 'yegor letov',
    },
  };
  await Storage.saveToDisk();

  // saved, now trying to load

  const Storage2 = new BlueApp();
  await Storage2.loadFromDisk();
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');
  assert.strictEqual(Storage2.tx_metadata.txid.memo, 'tx label');
  assert.strictEqual(Storage2.counterparty_metadata['payment code'].label, 'yegor letov');
  let isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(!isEncrypted);

  // emulating encrypted storage (and testing flag)

  await AsyncStorage.setItem('data', false);
  await AsyncStorage.setItem(BlueApp.FLAG_ENCRYPTED, '1');
  const Storage3 = new BlueApp();
  isEncrypted = await Storage3.storageIsEncrypted();
  assert.ok(isEncrypted);
});

it('Appstorage - loadFromDisk works with ambiguous descriptor in watch-only wallet', async () => {
  let Storage = new BlueApp();
  // Test that wpkh() descriptors are identified by script type, not path
  const w = new WatchOnlyWallet();
  w.setSecret(
    'wpkh([97311f91/0/0]xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw)',
  );
  w.init();
  const addressSegwit = w._getExternalAddressByIndex(0);
  assert.ok(addressSegwit.startsWith('bc1q'), 'not segwit address, got: ' + addressSegwit);

  Storage.wallets.push(w);
  await Storage.saveToDisk();
  Storage = undefined;

  // saved, now trying to load

  const Storage2 = new BlueApp();
  await Storage2.loadFromDisk();
  assert.strictEqual(Storage2.wallets.length, 1);
  const w2 = Storage2.wallets[0];

  assert.strictEqual(w2._getExternalAddressByIndex(0), addressSegwit);
  assert.strictEqual(w2.segwitType, 'p2wpkh');
});

it('Appstorage - loadFromDisk works with ambiguous descriptor in watch-only wallet 2', async () => {
  let Storage = new BlueApp();
  // Test that p2tr() descriptors are identified by script type, not path
  const w = new WatchOnlyWallet();
  w.setSecret(
    "tr([97311f91/44'/0'/0']xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw",
  );
  w.init();
  const addressSegwit = w._getExternalAddressByIndex(0);
  assert.ok(addressSegwit.startsWith('bc1p'), 'not taproot address, got: ' + addressSegwit);

  Storage.wallets.push(w);
  await Storage.saveToDisk();
  Storage = undefined;

  // saved, now trying to load

  const Storage2 = new BlueApp();
  await Storage2.loadFromDisk();
  assert.strictEqual(Storage2.wallets.length, 1);
  const w2 = Storage2.wallets[0];

  assert.strictEqual(w2._getExternalAddressByIndex(0), addressSegwit);
  assert.strictEqual(w2.segwitType, 'p2tr');
});

it('AppStorage - getTransactions() work', async () => {
  const Storage = new BlueApp();
  const w = new HDSegwitBech32Wallet();
  w.setLabel('testlabel');
  await w.generate();
  w._txs_by_internal_index = {
    0: [
      {
        blockhash: '000000000000000000054fae1935a8e5c3ac29ce04a45cca25d7329af5e5db2e',
        blocktime: 1678137003,
        confirmations: 61788,
        hash: '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d',
        locktime: 0,
        size: 192,
        time: 1678137003,
        txid: '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d',
        version: 1,
        vsize: 110,
        weight: 438,
        inputs: [
          {
            scriptSig: {
              asm: '',
              hex: '',
            },
            sequence: 4294967295,
            txid: '06b4c14587182fd0474f265a77b156519b4778769a99c21623863a8194d0fa4f',
            txinwitness: [
              '3045022100f2dfd9679719a5b10695c5142cb2998c0dde9d84fb3a0f6e2f82c972846da2b10220059c34862231eda0b8b4059859ae55e2fca5739c664f3ff45be71fbcf438a68d01',
              '034f150e09d0489a047b1299131180ce174769b28c03ca6a96054555211fdd7fd6',
            ],
            vout: 3,
            addresses: ['bc1qtnsyvl8zkteg7ap57j6w8hc7gk5nxk8vj5vrmz'],
            value: 0.00077308,
          },
        ],
        outputs: [
          {
            n: 0,
            scriptPubKey: {
              address: 'bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt',
              asm: '0 e98d8aa1c6d0dba1936079c0e09af9836b2070b1',
              desc: 'addr(bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt)#pl83f4nc',
              hex: '0014e98d8aa1c6d0dba1936079c0e09af9836b2070b1',
              type: 'witness_v0_keyhash',
              addresses: ['bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt'],
            },
            value: 0.00074822,
          },
        ],
        received: 1678137003000,
        value: -77308,
        sort_ts: 1678137003000,
      },
    ],
  };

  const w2 = new HDSegwitBech32Wallet();
  w2.setLabel('testlabel');
  await w2.generate();
  w2._txs_by_internal_index = {
    0: [
      {
        blockhash: '000000000000000000054fae1935a8e5c3ac29ce04a45cca25d7329af5e5db2e',
        blocktime: 1678137003,
        confirmations: 61788,
        hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        locktime: 0,
        size: 192,
        time: 1678137003,
        txid: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        version: 1,
        vsize: 110,
        weight: 438,
        inputs: [
          {
            scriptSig: {
              asm: '',
              hex: '',
            },
            sequence: 4294967295,
            txid: '06b4c14587182fd0474f265a77b156519b4778769a99c21623863a8194d0fa4f',
            txinwitness: [
              '3045022100f2dfd9679719a5b10695c5142cb2998c0dde9d84fb3a0f6e2f82c972846da2b10220059c34862231eda0b8b4059859ae55e2fca5739c664f3ff45be71fbcf438a68d01',
              '034f150e09d0489a047b1299131180ce174769b28c03ca6a96054555211fdd7fd6',
            ],
            vout: 3,
            addresses: ['bc1qtnsyvl8zkteg7ap57j6w8hc7gk5nxk8vj5vrmz'],
            value: 0.00077308,
          },
        ],
        outputs: [
          {
            n: 0,
            scriptPubKey: {
              address: 'bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt',
              asm: '0 e98d8aa1c6d0dba1936079c0e09af9836b2070b1',
              desc: 'addr(bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt)#pl83f4nc',
              hex: '0014e98d8aa1c6d0dba1936079c0e09af9836b2070b1',
              type: 'witness_v0_keyhash',
              addresses: ['bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt'],
            },
            value: 0.00074822,
          },
        ],
        received: 1678137003000,
        value: -77308,
        sort_ts: 1678137003000,
      },
    ],
  };

  Storage.wallets.push(w);
  Storage.wallets.push(w2);

  // setup complete. now we have a storage with 2 wallets, each wallet has
  // exactly one transaction

  let txs = Storage.getTransactions();
  assert.strictEqual(txs.length, 2); // getter for _all_ txs works

  for (const tx of txs) {
    assert.ok([w.getID(), w2.getID()].includes(tx.walletID));
    assert.strictEqual(tx.walletPreferredBalanceUnit, w.getPreferredBalanceUnit());
    assert.strictEqual(tx.walletPreferredBalanceUnit, 'BTC');
  }

  //

  txs = Storage.getTransactions(0, 666, true);
  assert.strictEqual(txs.length, 1); // getter for a specific wallet works

  for (const tx of txs) {
    assert.ok([w.getID()].includes(tx.walletID));
    assert.strictEqual(tx.walletPreferredBalanceUnit, w.getPreferredBalanceUnit());
    assert.strictEqual(tx.walletPreferredBalanceUnit, 'BTC');
  }

  //

  txs = Storage.getTransactions(1, 666, true);
  assert.strictEqual(txs.length, 1); // getter for a specific wallet works

  for (const tx of txs) {
    assert.ok([w2.getID()].includes(tx.walletID));
    assert.strictEqual(tx.walletPreferredBalanceUnit, w.getPreferredBalanceUnit());
    assert.strictEqual(tx.walletPreferredBalanceUnit, 'BTC');
  }
});

it('Appstorage - encryptStorage & load encrypted storage works', async () => {
  /** @type {BlueApp} */
  const Storage = new BlueApp();
  let w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  await w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();
  let isEncrypted = await Storage.storageIsEncrypted();
  assert.ok(!isEncrypted);
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  assert.strictEqual(Storage.cachedPassword, 'password');
  assert.ok(isEncrypted);

  // saved, now trying to load, using good password

  let Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  let loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');

  // now trying to load, using bad password

  Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('passwordBAD');
  assert.ok(!loadResult);
  assert.strictEqual(Storage2.wallets.length, 0);

  // now, trying case with adding data after decrypt.
  // saveToDisk should be handled correctly

  Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');
  w = new SegwitP2SHWallet();
  w.setLabel('testlabel2');
  await w.generate();
  Storage2.wallets.push(w);
  assert.strictEqual(Storage2.wallets.length, 2);
  assert.strictEqual(Storage2.wallets[1].getLabel(), 'testlabel2');
  await Storage2.saveToDisk();
  // saved to encrypted storage after load. next load should be successfull
  Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 2);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');
  assert.strictEqual(Storage2.wallets[1].getLabel(), 'testlabel2');

  // next, adding new `fake` storage which should be unlocked with `fake` password
  const createFakeStorageResult = await Storage2.createFakeStorage('fakePassword');
  assert.ok(createFakeStorageResult);
  assert.strictEqual(Storage2.wallets.length, 0);
  assert.strictEqual(Storage2.cachedPassword, 'fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  await w.generate();
  Storage2.wallets.push(w);
  await Storage2.saveToDisk();
  // now, will try to load & decrypt with real password and with fake password
  // real:
  let Storage3 = new BlueApp();
  loadResult = await Storage3.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage3.wallets.length, 2);
  assert.strictEqual(Storage3.wallets[0].getLabel(), 'testlabel');
  // fake:
  Storage3 = new BlueApp();
  loadResult = await Storage3.loadFromDisk('fakePassword');
  assert.ok(loadResult);
  assert.strictEqual(Storage3.wallets.length, 1);
  assert.strictEqual(Storage3.wallets[0].getLabel(), 'fakewallet');
});

it('Appstorage - encryptStorage & load encrypted, then decryptStorage and load storage works', async () => {
  /** @type {BlueApp} */
  const Storage = new BlueApp();
  let w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  await w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();
  let isEncrypted = await Storage.storageIsEncrypted();
  assert.ok(!isEncrypted);
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  assert.strictEqual(Storage.cachedPassword, 'password');
  assert.ok(isEncrypted);

  // saved, now trying to load, using good password

  let Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  let loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');

  // now trying to load, using bad password

  Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('passwordBAD');
  assert.ok(!loadResult);
  assert.strictEqual(Storage2.wallets.length, 0);

  // now, trying case with adding data after decrypt.
  // saveToDisk should be handled correctly

  Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');
  w = new SegwitP2SHWallet();
  w.setLabel('testlabel2');
  await w.generate();
  Storage2.wallets.push(w);
  assert.strictEqual(Storage2.wallets.length, 2);
  assert.strictEqual(Storage2.wallets[1].getLabel(), 'testlabel2');
  await Storage2.saveToDisk();
  // saved to encrypted storage after load. next load should be successfull
  Storage2 = new BlueApp();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 2);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');
  assert.strictEqual(Storage2.wallets[1].getLabel(), 'testlabel2');

  // next, adding new `fake` storage which should be unlocked with `fake` password
  const createFakeStorageResult = await Storage2.createFakeStorage('fakePassword');
  assert.ok(createFakeStorageResult);
  assert.strictEqual(Storage2.wallets.length, 0);
  assert.strictEqual(Storage2.cachedPassword, 'fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  await w.generate();
  Storage2.wallets.push(w);
  await Storage2.saveToDisk();
  // now, will try to load & decrypt with real password and with fake password
  // real:
  let Storage3 = new BlueApp();
  loadResult = await Storage3.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage3.wallets.length, 2);
  assert.strictEqual(Storage3.wallets[0].getLabel(), 'testlabel');
  // fake:
  Storage3 = new BlueApp();
  loadResult = await Storage3.loadFromDisk('fakePassword');
  assert.ok(loadResult);
  assert.strictEqual(Storage3.wallets.length, 1);
  assert.strictEqual(Storage3.wallets[0].getLabel(), 'fakewallet');

  // now will decrypt storage. label of wallet should be testlabel

  const Storage4 = new BlueApp();
  isEncrypted = await Storage4.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage4.loadFromDisk('password');
  assert.ok(loadResult);
  const decryptStorageResult = await Storage4.decryptStorage('password');
  assert.ok(decryptStorageResult);

  const Storage5 = new BlueApp();
  isEncrypted = await Storage5.storageIsEncrypted();
  assert.strictEqual(isEncrypted, false);
  const storage5loadResult = await Storage5.loadFromDisk();
  assert.ok(storage5loadResult);
  assert.strictEqual(Storage5.wallets.length, 2);
  assert.strictEqual(Storage5.wallets[0].getLabel(), 'testlabel');
  assert.strictEqual(Storage5.wallets[1].getLabel(), 'testlabel2');
});

it('can decrypt storage that is second in a list of buckets; and isPasswordInUse() works', async () => {
  /** @type {BlueApp} */
  const Storage = new BlueApp();
  let w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  await w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();
  let isEncrypted = await Storage.storageIsEncrypted();
  assert.ok(!isEncrypted);
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  assert.strictEqual(Storage.cachedPassword, 'password');
  assert.ok(isEncrypted);

  // next, adding new `fake` storage which should be unlocked with `fake` password
  const createFakeStorageResult = await Storage.createFakeStorage('fakePassword');
  assert.ok(createFakeStorageResult);
  assert.strictEqual(Storage.wallets.length, 0);
  assert.strictEqual(Storage.cachedPassword, 'fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  await w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();

  // now will decrypt storage. will try to decrypt FAKE storage (second in the list) while
  // currently decrypted is the MAIN (non-fake) storage. this should throw an exception

  const Storage4 = new BlueApp();
  isEncrypted = await Storage4.storageIsEncrypted();
  assert.ok(isEncrypted);
  let loadResult = await Storage4.loadFromDisk('password');
  assert.ok(loadResult);

  let wasException = false;
  try {
    await Storage4.decryptStorage('fakePassword');
  } catch (_) {
    wasException = true;
  }

  assert.ok(wasException);

  // now we will load fake storage, and we will decrypt it, which efficiently makes it main
  // storage, purging other buckets. this should be possible since if user wants to shoot himsel in the foot
  // he should be able to do it.

  const Storage5 = new BlueApp();
  isEncrypted = await Storage5.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage5.loadFromDisk('fakePassword');
  assert.ok(loadResult);

  // testing that isPasswordInUse() works:
  assert.ok(await Storage5.isPasswordInUse('fakePassword'));
  assert.ok(await Storage5.isPasswordInUse('password'));
  assert.ok(!(await Storage5.isPasswordInUse('blablablabla')));

  // now we will decrypt storage. label of wallet should be testlabel

  const Storage6 = new BlueApp();
  isEncrypted = await Storage6.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage6.loadFromDisk('fakePassword');
  assert.ok(loadResult);
  const decryptStorageResult = await Storage6.decryptStorage('fakePassword');
  assert.ok(decryptStorageResult);

  const Storage7 = new BlueApp();
  isEncrypted = await Storage7.storageIsEncrypted();
  assert.strictEqual(isEncrypted, false);
  const storage5loadResult = await Storage7.loadFromDisk();
  assert.ok(storage5loadResult);
  assert.strictEqual(Storage7.wallets[0].getLabel(), 'fakewallet');
});

it('Appstorage - hashIt() works', async () => {
  const storage = new BlueApp();
  assert.strictEqual(storage.hashIt('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});
