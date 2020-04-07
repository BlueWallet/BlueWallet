/* global describe, it, expect, jest, jasmine */
import React from 'react';
import { LegacyWallet, SegwitP2SHWallet, AppStorage } from '../../class';
import TestRenderer from 'react-test-renderer';
import Settings from '../../screen/settings/settings';
import Selftest from '../../screen/selftest';
import { BlueHeader } from '../../BlueComponents';
import { FiatUnit } from '../../models/fiatUnit';
import AsyncStorage from '@react-native-community/async-storage';

global.net = require('net');
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
const assert = require('assert');

jest.mock('react-native-qrcode-svg', () => 'Video');
jest.useFakeTimers();

/**
 * Tests failing: Cannot find module 'Picker' from 'App.test.js'
 * Comment branch: 24-create-re-usable-menu-list-item-component
 */
// jest.mock('Picker', () => {
//   // eslint-disable-next-line import/no-unresolved
//   const React = require('React');
//   const PropTypes = require('prop-types');
//   return class MockPicker extends React.Component {
//     static Item = props => React.createElement('Item', props, props.children);
//     static propTypes = { children: PropTypes.any };
//     static defaultProps = { children: '' };

//     render() {
//       return React.createElement('Picker', this.props, this.props.children);
//     }
//   };
// });

// jest.mock('ScrollView', () => {
//   const RealComponent = require.requireActual('ScrollView');
//   const React = require('React');
//   class ScrollView extends React.Component {
//     scrollTo() {}

//     render() {
//       return React.createElement('ScrollView', this.props, this.props.children);
//     }
//   }
//   ScrollView.propTypes = RealComponent.propTypes;
//   return ScrollView;
// });

jest.mock('amplitude-js', () => ({
  getInstance: function() {
    return {
      init: jest.fn(),
      logEvent: jest.fn(),
    };
  },
}));

describe('unit - LegacyWallet', function() {
  it('serialize and unserialize work correctly', () => {
    const a = new LegacyWallet();
    +a.fetchBalance(); // to initalize BlueElectrum, to be replaced with something better
    a.setLabel('my1');
    const key = JSON.stringify(a);

    const b = LegacyWallet.fromJson(key);
    assert(key === JSON.stringify(b));

    assert.strictEqual(key, JSON.stringify(b));
  });

  it('can validate addresses', () => {
    const w = new LegacyWallet();
    assert.ok(w.isAddressValid('YRMDysNqxPQiHee3NodziKKsHhRvysur63'));
    assert.ok(!w.isAddressValid('YRMDysNqxPQiHee3NodziKKsHhRvysur64'));
    assert.ok(!w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2'));
    assert.ok(w.isAddressValid('RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26'));
    assert.ok(!w.isAddressValid('RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG24'));
    assert.ok(!w.isAddressValid('12345'));
  });
});

it('BlueHeader works', () => {
  const rendered = TestRenderer.create(<BlueHeader />).toJSON();
  expect(rendered).toBeTruthy();
});

it.skip('Settings work', () => {
  const rendered = TestRenderer.create(<Settings />).toJSON();
  expect(rendered).toBeTruthy();
});

xit('Selftest work', () => {
  const component = TestRenderer.create(<Selftest />);
  const root = component.root;
  const rendered = component.toJSON();
  expect(rendered).toBeTruthy();
  // console.log((root.findAllByType('Text')[0].props));

  let okFound = false;
  const allTests = [];
  for (const v of root.findAllByType('Text')) {
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

it('SegwitP2SHWallet can generate segwit P2SH address from WIF', async () => {
  const l = new SegwitP2SHWallet();
  l.setSecret('Kxr9tQED9H44gCmp6HAdmemAzU3n84H3dGkuWTKvE23JgHMW8gct');
  assert.strictEqual(l.getAddress(), 'RBkrVH6nanQxjQ6n99nPHXcvY73u3jBLdU');
  assert.strictEqual(l.getAddress(), await l.getAddressAsync());
});

it('Wallet can fetch balance', async () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  const w = new LegacyWallet();
  w._address = 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba'; // hack internals
  assert.ok(w.getBalance() === 0);
  assert.ok(w.getUnconfirmedBalance() === 0);
  assert.ok(w._lastBalanceFetch === 0);
  await w.fetchBalance();
  assert.ok(w.getBalance() > 0);
  assert.ok(w._lastBalanceFetch > 0);
});

it('Wallet can fetch UTXO', async () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  let w = new LegacyWallet();
  w._address = 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba';
  assert.strictEqual(w.getAddress(), 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba');
  await w.fetchUtxo();
  assert.ok(w.utxo.length > 0, 'unexpected empty UTXO');
});

xit('Wallet can fetch TXs', async () => {
  const w = new LegacyWallet();
  w._address = 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT';
  await w.fetchTransactions();
  assert.ok(w.getTransactions().length >= 1);

  const tx0 = w.getTransactions()[0];
  const txExpected = {
    blockhash: '000000000000000000036fafd28b070df447ea9fd5f0373ae0f61924c9e6880e',
    blocktime: 1585665354,
    value: 449995000000,
  };
  assert.strictEqual(tx0['blockhash'], txExpected['blockhash']);
  assert.strictEqual(tx0['blocktime'], txExpected['blocktime']);
  assert.strictEqual(tx0['value'], txExpected['value']);
});
