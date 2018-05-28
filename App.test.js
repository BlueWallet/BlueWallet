/* global describe, it, expect, jest, jasmine */
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
jest.mock('Picker', () => {
  // eslint-disable-next-line import/no-unresolved
  const React = require('React');
  const PropTypes = require('prop-types');
  return class MockPicker extends React.Component {
    static Item = props => React.createElement('Item', props, props.children);
    static propTypes = { children: PropTypes.any };
    static defaultProps = { children: '' };

    render() {
      return React.createElement('Picker', this.props, this.props.children);
    }
  };
});

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
  assert.equal(Storage.cachedPassword, 'password');
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

  // next, adding new `fake` storage which should be unlocked with `fake` password
  let createFakeStorageResult = await Storage2.createFakeStorage(
    'fakePassword',
  );
  assert.ok(createFakeStorageResult);
  assert.equal(Storage2.wallets.length, 0);
  assert.equal(Storage2.cachedPassword, 'fakePassword');
  w = new SegwitP2SHWallet();
  w.setLabel('fakewallet');
  w.generate();
  Storage2.wallets.push(w);
  await Storage2.saveToDisk();
  // now, will try to load & decrypt with real password and with fake password
  // real:
  let Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('password');
  assert.ok(loadResult);
  assert.equal(Storage3.wallets.length, 2);
  assert.equal(Storage3.wallets[0].getLabel(), 'testlabel');
  // fake:
  Storage3 = new AppStorage();
  loadResult = await Storage3.loadFromDisk('fakePassword');
  assert.ok(loadResult);
  assert.equal(Storage3.wallets.length, 1);
  assert.equal(Storage3.wallets[0].getLabel(), 'fakewallet');
});

it('bip38 decodes', async () => {
  const bip38 = require('./bip38');
  const wif = require('wif');

  let encryptedKey =
    '6PRVWUbkzq2VVjRuv58jpwVjTeN46MeNmzUHqUjQptBJUHGcBakduhrUNc';
  let decryptedKey = await bip38.decrypt(
    encryptedKey,
    'TestingOneTwoThree',
    () => {},
    { N: 1, r: 8, p: 8 }, // using non-default parameters to speed it up (not-bip38 compliant)
  );

  assert.equal(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    '5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR',
  );
});

it('bip38 decodes slow', async () => {
  if (process.env.USER === 'burn') {
    // run only on circleCI
    return;
  }
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  const bip38 = require('bip38');
  const wif = require('wif');

  let encryptedKey =
    '6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN';
  let decryptedKey = await bip38.decrypt(encryptedKey, 'qwerty', status =>
    process.stdout.write(parseInt(status.percent) + '%\r'),
  );

  assert.equal(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    'KxqRtpd9vFju297ACPKHrGkgXuberTveZPXbRDiQ3MXZycSQYtjc',
  );
});

it('Wallet can fetch UTXO', async () => {
  let w = new SegwitP2SHWallet();
  w._address = '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX';
  await w.fetchUtxo();
  assert.ok(w.utxo.length > 0, 'unexpected empty UTXO');
});
