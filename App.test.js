/* global describe, it, expect, jest */
import React from 'react';
import { LegacyWallet, SegwitP2SHWallet, AppStorage } from './class';
import renderer from 'react-test-renderer';
import App from './App';
import Settings from './screen/settings';
import Selftest from './screen/selftest';
import { BlueHeader } from './BlueComponents';
import MockStorage from './MockStorage';
let assert = require('assert');
jest.mock('react-native-qrcode', () => 'Video');
const AsyncStorage = new MockStorage();
jest.setMock('AsyncStorage', AsyncStorage);

describe('unit - LegacyWallet', function() {
  it('serialize and unserialize work correctly', () => {
    let a = new LegacyWallet();
    a.setLabel('my1');
    let key = JSON.stringify(a);

    let b = LegacyWallet.fromJson(key);
    assert(key === JSON.stringify(b));

    assert.equal(key, JSON.stringify(b));
  });
});

it('App does not crash', () => {
  const rendered = renderer.create(<App />).toJSON();
  expect(rendered).toBeTruthy();
});

it('BlueHeader works', () => {
  const rendered = renderer.create(<BlueHeader />).toJSON();
  expect(rendered).toBeTruthy();
});

it('Settings work', () => {
  const rendered = renderer.create(<Settings />).toJSON();
  expect(rendered).toBeTruthy();
});

it('Selftest work', () => {
  const component = renderer.create(<Selftest />);
  const root = component.root;
  const rendered = component.toJSON();
  expect(rendered).toBeTruthy();
  // console.log((root.findAllByType('Text')[0].props));

  let okFound = false;
  let allTests = [];
  for (var v of root.findAllByType('Text')) {
    let text = v.props.children;
    if (text.join) {
      text = text.join('');
    }
    if (text === 'OK') {
      okFound = true;
    }
    allTests.push(text);
    // console.log(text);
  }

  assert.ok(okFound, 'OK not found. Got: ' + allTests.join('; '));
});

it('Appstorage - loadFromDisk works', async () => {
  AsyncStorage.storageCache = {}; // cleanup from other tests
  /** @type {AppStorage} */
  let Storage = new AppStorage();
  let w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();

  // saved, now trying to load

  let Storage2 = new AppStorage();
  await Storage2.loadFromDisk();
  assert.equal(Storage2.wallets.length, 1);
  assert.equal(Storage2.wallets[0].getLabel(), 'testlabel');
  let isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(!isEncrypted);

  // emulating encrypted storage (and testing flag)

  AsyncStorage.storageCache.data = false;
  AsyncStorage.storageCache.data_encrypted = '1'; // flag
  let Storage3 = new AppStorage();
  isEncrypted = await Storage3.storageIsEncrypted();
  assert.ok(isEncrypted);
});

it('Appstorage - encryptStorage & load encrypted storage works', async () => {
  AsyncStorage.storageCache = {}; // cleanup from other tests

  /** @type {AppStorage} */
  let Storage = new AppStorage();
  let w = new SegwitP2SHWallet();
  w.setLabel('testlabel');
  w.generate();
  Storage.wallets.push(w);
  await Storage.saveToDisk();
  let isEncrypted = await Storage.storageIsEncrypted();
  assert.ok(!isEncrypted);
  await Storage.encryptStorage('password');
  isEncrypted = await Storage.storageIsEncrypted();
  assert.ok(isEncrypted);

  // saved, now trying to load, using good password

  let Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  let loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.equal(Storage2.wallets.length, 1);
  assert.equal(Storage2.wallets[0].getLabel(), 'testlabel');

  // now trying to load, using bad password

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('passwordBAD');
  assert.ok(!loadResult);
  assert.equal(Storage2.wallets.length, 0);

  // now, trying case with adding data after decrypt.
  // saveToDisk should be handled correctly

  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.equal(Storage2.wallets.length, 1);
  assert.equal(Storage2.wallets[0].getLabel(), 'testlabel');
  w = new SegwitP2SHWallet();
  w.setLabel('testlabel2');
  w.generate();
  Storage2.wallets.push(w);
  assert.equal(Storage2.wallets.length, 2);
  assert.equal(Storage2.wallets[1].getLabel(), 'testlabel2');
  await Storage2.saveToDisk();
  // saved to encrypted storage after load. next load should be successfull
  Storage2 = new AppStorage();
  isEncrypted = await Storage2.storageIsEncrypted();
  assert.ok(isEncrypted);
  loadResult = await Storage2.loadFromDisk('password');
  assert.ok(loadResult);
  assert.equal(Storage2.wallets.length, 2);
  assert.equal(Storage2.wallets[0].getLabel(), 'testlabel');
  assert.equal(Storage2.wallets[1].getLabel(), 'testlabel2');
});
