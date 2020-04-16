/* global it, jest */
import AsyncStorage from '@react-native-community/async-storage';

import { SegwitP2SHWallet, AppStorage } from '../../class';

global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
const assert = require('assert');

jest.useFakeTimers();

it('Appstorage - loadFromDisk works', async () => {
  /** @type {AppStorage} */
  const Storage = new AppStorage();
  const w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  await w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();

  // saved, now trying to load

  const Storage2 = new AppStorage();
  await Storage2.loadFromDisk();
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');
  let isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(!isEncrypted);

  // emulating encrypted storage (and testing flag)

  await AsyncStorage.setItem('data', false);
  await AsyncStorage.setItem(AppStorage.FLAG_ENCRYPTED, '1');
  const Storage3 = new AppStorage();
  isEncrypted = await Storage3.storageIsEncrypted();
  assert.ok(isEncrypted);
});

it('Appstorage - encryptStorage & load encrypted storage works', async () => {
  /** @type {AppStorage} */
  const Storage = new AppStorage();
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

  let Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  let loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage2.wallets.length, 1);
  assert.strictEqual(Storage2.wallets[0].getLabel(), 'testlabel');

  // now trying to load, using bad password

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('passwordBAD');
  assert.ok(!loadResult);
  assert.strictEqual(Storage2.wallets.length, 0);

  // now, trying case with adding data after decrypt.
  // saveToDisk should be handled correctly

  Storage2 = new AppStorage();
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
  Storage2 = new AppStorage();
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
  let Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('password');
  assert.ok(loadResult);
  assert.strictEqual(Storage3.wallets.length, 2);
  assert.strictEqual(Storage3.wallets[0].getLabel(), 'testlabel');
  // fake:
  Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('fakePassword');
  assert.ok(loadResult);
  assert.strictEqual(Storage3.wallets.length, 1);
  assert.strictEqual(Storage3.wallets[0].getLabel(), 'fakewallet');
});
