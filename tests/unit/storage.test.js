import { SegwitP2SHWallet, AppStorage } from '../../class';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  expect(Storage2.wallets.length).toBe(1);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');
  let isEncrypted = await Storage2.storageIsEncrypted();
  expect(!isEncrypted).toBeTruthy();

  // emulating encrypted storage (and testing flag)

  await AsyncStorage.setItem('data', false);
  await AsyncStorage.setItem(AppStorage.FLAG_ENCRYPTED, '1');
  const Storage3 = new AppStorage();
  isEncrypted = await Storage3.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
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
  expect(!isEncrypted).toBeTruthy();
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  expect(Storage.cachedPassword).toBe('password');
  expect(isEncrypted).toBeTruthy();

  // saved, now trying to load, using good password

  let Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  let loadResult = await Storage2.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(1);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');

  // now trying to load, using bad password

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage2.loadFromDisk('passwordBAD');
  expect(!loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(0);

  // now, trying case with adding data after decrypt.
  // saveToDisk should be handled correctly

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage2.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(1);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');
  w = new SegwitP2SHWallet();
  w.setLabel('testlabel2');
  await w.generate();
  Storage2.wallets.push(w);
  expect(Storage2.wallets.length).toBe(2);
  expect(Storage2.wallets[1].getLabel()).toBe('testlabel2');
  await Storage2.saveToDisk();
  // saved to encrypted storage after load. next load should be successfull
  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage2.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(2);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');
  expect(Storage2.wallets[1].getLabel()).toBe('testlabel2');

  // next, adding new `fake` storage which should be unlocked with `fake` password
  const createFakeStorageResult = await Storage2.createFakeStorage('fakePassword');
  expect(createFakeStorageResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(0);
  expect(Storage2.cachedPassword).toBe('fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  await w.generate();
  Storage2.wallets.push(w);
  await Storage2.saveToDisk();
  // now, will try to load & decrypt with real password and with fake password
  // real:
  let Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage3.wallets.length).toBe(2);
  expect(Storage3.wallets[0].getLabel()).toBe('testlabel');
  // fake:
  Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('fakePassword');
  expect(loadResult).toBeTruthy();
  expect(Storage3.wallets.length).toBe(1);
  expect(Storage3.wallets[0].getLabel()).toBe('fakewallet');
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
  expect(!isEncrypted).toBeTruthy();
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  expect(Storage.cachedPassword).toBe('password');
  expect(isEncrypted).toBeTruthy();

  // saved, now trying to load, using good password

  let Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  let loadResult = await Storage2.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(1);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');

  // now trying to load, using bad password

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage2.loadFromDisk('passwordBAD');
  expect(!loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(0);

  // now, trying case with adding data after decrypt.
  // saveToDisk should be handled correctly

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage2.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(1);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');
  w = new SegwitP2SHWallet();
  w.setLabel('testlabel2');
  await w.generate();
  Storage2.wallets.push(w);
  expect(Storage2.wallets.length).toBe(2);
  expect(Storage2.wallets[1].getLabel()).toBe('testlabel2');
  await Storage2.saveToDisk();
  // saved to encrypted storage after load. next load should be successfull
  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage2.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(2);
  expect(Storage2.wallets[0].getLabel()).toBe('testlabel');
  expect(Storage2.wallets[1].getLabel()).toBe('testlabel2');

  // next, adding new `fake` storage which should be unlocked with `fake` password
  const createFakeStorageResult = await Storage2.createFakeStorage('fakePassword');
  expect(createFakeStorageResult).toBeTruthy();
  expect(Storage2.wallets.length).toBe(0);
  expect(Storage2.cachedPassword).toBe('fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  await w.generate();
  Storage2.wallets.push(w);
  await Storage2.saveToDisk();
  // now, will try to load & decrypt with real password and with fake password
  // real:
  let Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  expect(Storage3.wallets.length).toBe(2);
  expect(Storage3.wallets[0].getLabel()).toBe('testlabel');
  // fake:
  Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('fakePassword');
  expect(loadResult).toBeTruthy();
  expect(Storage3.wallets.length).toBe(1);
  expect(Storage3.wallets[0].getLabel()).toBe('fakewallet');

  // now will decrypt storage. label of wallet should be testlabel

  const Storage4 = new AppStorage();
  isEncrypted = await Storage4.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage4.loadFromDisk('password');
  expect(loadResult).toBeTruthy();
  const decryptStorageResult = await Storage4.decryptStorage('password');
  expect(decryptStorageResult).toBeTruthy();

  const Storage5 = new AppStorage();
  isEncrypted = await Storage5.storageIsEncrypted();
  expect(isEncrypted).toBe(false);
  const storage5loadResult = await Storage5.loadFromDisk();
  expect(storage5loadResult).toBeTruthy();
  expect(Storage5.wallets.length).toBe(2);
  expect(Storage5.wallets[0].getLabel()).toBe('testlabel');
  expect(Storage5.wallets[1].getLabel()).toBe('testlabel2');
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
  expect(!isEncrypted).toBeTruthy();
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  expect(Storage.cachedPassword).toBe('password');
  expect(isEncrypted).toBeTruthy();

  // next, adding new `fake` storage which should be unlocked with `fake` password
  const createFakeStorageResult = await Storage.createFakeStorage('fakePassword');
  expect(createFakeStorageResult).toBeTruthy();
  expect(Storage.wallets.length).toBe(0);
  expect(Storage.cachedPassword).toBe('fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  await w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();

  // now will decrypt storage. will try to decrypt FAKE storage (second in the list) while
  // currently decrypted is the MAIN (non-fake) storage. this should throw an exception

  const Storage4 = new AppStorage();
  isEncrypted = await Storage4.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  let loadResult = await Storage4.loadFromDisk('password');
  expect(loadResult).toBeTruthy();

  let wasException = false;
  try {
    await Storage4.decryptStorage('fakePassword');
  } catch (_) {
    wasException = true;
  }

  expect(wasException).toBeTruthy();

  // now we will load fake storage, and we will decrypt it, which efficiently makes it main
  // storage, purging other buckets. this should be possible since if user wants to shoot himsel in the foot
  // he should be able to do it.

  const Storage5 = new AppStorage();
  isEncrypted = await Storage5.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage5.loadFromDisk('fakePassword');
  expect(loadResult).toBeTruthy();

  // testing that isPasswordInUse() works:
  expect(await Storage5.isPasswordInUse('fakePassword')).toBeTruthy();
  expect(await Storage5.isPasswordInUse('password')).toBeTruthy();
  expect(!(await Storage5.isPasswordInUse('blablablabla'))).toBeTruthy();

  // now we will decrypt storage. label of wallet should be testlabel

  const Storage6 = new AppStorage();
  isEncrypted = await Storage6.storageIsEncrypted();
  expect(isEncrypted).toBeTruthy();
  loadResult = await Storage6.loadFromDisk('fakePassword');
  expect(loadResult).toBeTruthy();
  const decryptStorageResult = await Storage6.decryptStorage('fakePassword');
  expect(decryptStorageResult).toBeTruthy();

  const Storage7 = new AppStorage();
  isEncrypted = await Storage7.storageIsEncrypted();
  expect(isEncrypted).toBe(false);
  const storage5loadResult = await Storage7.loadFromDisk();
  expect(storage5loadResult).toBeTruthy();
  expect(Storage7.wallets[0].getLabel()).toBe('fakewallet');
});
