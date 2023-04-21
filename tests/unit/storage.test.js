import AsyncStorage from '@react-native-async-storage/async-storage';
import { SegwitP2SHWallet } from '../../class';
const BlueApp = require('../../BlueApp');
const AppStorage = BlueApp.AppStorage;
const assert = require('assert');

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

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

it('Appstorage - encryptStorage & load encrypted, then decryptStorage and load storage works', async () => {
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

  // now will decrypt storage. label of wallet should be testlabel

  const Storage4 = new AppStorage();
  isEncrypted = await Storage4.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage4.loadFromDisk('password');
  assert.ok(loadResult);
  const decryptStorageResult = await Storage4.decryptStorage('password');
  assert.ok(decryptStorageResult);

  const Storage5 = new AppStorage();
  isEncrypted = await Storage5.storageIsEncrypted();
  assert.strictEqual(isEncrypted, false);
  const storage5loadResult = await Storage5.loadFromDisk();
  assert.ok(storage5loadResult);
  assert.strictEqual(Storage5.wallets.length, 2);
  assert.strictEqual(Storage5.wallets[0].getLabel(), 'testlabel');
  assert.strictEqual(Storage5.wallets[1].getLabel(), 'testlabel2');
});

it('can decrypt storage that is second in a list of buckets; and isPasswordInUse() works', async () => {
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

  const Storage4 = new AppStorage();
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

  const Storage5 = new AppStorage();
  isEncrypted = await Storage5.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage5.loadFromDisk('fakePassword');
  assert.ok(loadResult);

  // testing that isPasswordInUse() works:
  assert.ok(await Storage5.isPasswordInUse('fakePassword'));
  assert.ok(await Storage5.isPasswordInUse('password'));
  assert.ok(!(await Storage5.isPasswordInUse('blablablabla')));

  // now we will decrypt storage. label of wallet should be testlabel

  const Storage6 = new AppStorage();
  isEncrypted = await Storage6.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage6.loadFromDisk('fakePassword');
  assert.ok(loadResult);
  const decryptStorageResult = await Storage6.decryptStorage('fakePassword');
  assert.ok(decryptStorageResult);

  const Storage7 = new AppStorage();
  isEncrypted = await Storage7.storageIsEncrypted();
  assert.strictEqual(isEncrypted, false);
  const storage5loadResult = await Storage7.loadFromDisk();
  assert.ok(storage5loadResult);
  assert.strictEqual(Storage7.wallets[0].getLabel(), 'fakewallet');
});

it('Appstorage - hashIt() works', async () => {
  const storage = new AppStorage();
  assert.strictEqual(storage.hashIt('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});
