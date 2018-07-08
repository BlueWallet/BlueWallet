/* global describe, it, expect, jest, jasmine */
import React from 'react';
import { LegacyWallet, SegwitP2SHWallet, AppStorage } from './class';
import renderer from 'react-test-renderer';
import Settings from './screen/settings';
import Selftest from './screen/selftest';
import { BlueHeader } from './BlueComponents';
import MockStorage from './MockStorage';
let assert = require('assert');
jest.mock('react-native-qrcode', () => 'Video');
const AsyncStorage = new MockStorage();
jest.setMock('AsyncStorage', AsyncStorage);
jest.useFakeTimers();
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
  let createFakeStorageResult = await Storage2.createFakeStorage('fakePassword');
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

it('Wallet can fetch UTXO', async () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  let w = new SegwitP2SHWallet();
  w._address = '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX';
  await w.fetchUtxo();
  assert.ok(w.utxo.length > 0, 'unexpected empty UTXO');
});

it('Wallet can fetch balance', async () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  let w = new LegacyWallet();
  w._address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'; // hack internals
  assert.ok(w.getBalance() === 0);
  assert.ok(w.getUnconfirmedBalance() === 0);
  assert.ok(w._lastBalanceFetch === 0);
  await w.fetchBalance();
  assert.ok(w.getBalance() > 0);
  assert.ok(w.getUnconfirmedBalance() === 0);
  assert.ok(w._lastBalanceFetch > 0);
});

it.skip('Wallet can fetch TXs', async () => {
  let w = new LegacyWallet();
  w._address = '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG';
  await w.fetchTransactions();
  console.log('txs num:', w.getTransactions().length);
  assert.equal(w.getTransactions().length, 2);
});

describe('currency', () => {
  it('fetches exchange rate and saves to AsyncStorage', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
    AsyncStorage.storageCache = {}; // cleanup from other tests
    let currency = require('./currency');
    await currency.startUpdater();
    let cur = AsyncStorage.storageCache[AppStorage.CURRENCY];
    cur = JSON.parse(cur);
    assert.ok(Number.isInteger(cur[currency.STRUCT.LAST_UPDATED]));
    assert.ok(cur[currency.STRUCT.LAST_UPDATED] > 0);
    assert.ok(cur[currency.STRUCT.BTC_USD] > 0);
  });
});
