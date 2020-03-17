/* global describe, it, expect, jest, jasmine */
import React from 'react';
import { AppStorage } from '../../class';
import TestRenderer from 'react-test-renderer';
import Settings from '../../screen/settings/settings';
import Selftest from '../../screen/selftest';
import { BlueHeader } from '../../BlueComponents';
import { FiatUnit } from '../../models/fiatUnit';
import AsyncStorage from '@react-native-community/async-storage';
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
let assert = require('assert');
jest.mock('react-native-qrcode-svg', () => 'Video');
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

jest.mock('amplitude-js', () => ({
  getInstance: function() {
    return {
      init: jest.fn(),
      logEvent: jest.fn(),
    };
  },
}));

jest.mock('ScrollView', () => {
  const RealComponent = require.requireActual('ScrollView');
  const React = require('React');
  class ScrollView extends React.Component {
    scrollTo() {}

    render() {
      return React.createElement('ScrollView', this.props, this.props.children);
    }
  }
  ScrollView.propTypes = RealComponent.propTypes;
  return ScrollView;
});

it('BlueHeader works', () => {
  const rendered = TestRenderer.create(<BlueHeader />).toJSON();
  expect(rendered).toBeTruthy();
});

it.skip('Settings work', () => {
  const rendered = TestRenderer.create(<Settings />).toJSON();
  expect(rendered).toBeTruthy();
});

it('Selftest work', () => {
  const component = TestRenderer.create(<Selftest />);
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

describe('currency', () => {
  it('fetches exchange rate and saves to AsyncStorage', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
    let currency = require('../../currency');
    await currency.startUpdater();
    let cur = await AsyncStorage.getItem(AppStorage.EXCHANGE_RATES);
    cur = JSON.parse(cur);
    assert.ok(Number.isInteger(cur[currency.STRUCT.LAST_UPDATED]));
    assert.ok(cur[currency.STRUCT.LAST_UPDATED] > 0);
    assert.ok(cur['BTC_USD'] > 0);

    // now, setting other currency as default
    await AsyncStorage.setItem(AppStorage.PREFERRED_CURRENCY, JSON.stringify(FiatUnit.JPY));
    await currency.startUpdater();
    cur = JSON.parse(await AsyncStorage.getItem(AppStorage.EXCHANGE_RATES));
    assert.ok(cur['BTC_JPY'] > 0);

    // now setting with a proper setter
    await currency.setPrefferedCurrency(FiatUnit.EUR);
    await currency.startUpdater();
    let preferred = await currency.getPreferredCurrency();
    assert.strictEqual(preferred.endPointKey, 'EUR');
    cur = JSON.parse(await AsyncStorage.getItem(AppStorage.EXCHANGE_RATES));
    assert.ok(cur['BTC_EUR'] > 0);
  });
});
