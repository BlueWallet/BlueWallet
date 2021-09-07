import assert from 'assert';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import Settings from '../../screen/settings/settings';
import Selftest from '../../screen/selftest';
import { BlueHeader } from '../../BlueComponents';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jest.mock('react-native-qrcode-svg', () => 'Video');

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
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
