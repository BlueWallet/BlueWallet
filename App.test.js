/* global describe, it, expect, jest */
import React from 'react';
import { LegacyWallet } from './class';
import renderer from 'react-test-renderer';
import App from './App';
import Settings from './screen/settings';
import { BlueHeader } from './BlueComponents';
let assert = require('assert');
jest.mock('react-native-qrcode', () => 'Video');

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
