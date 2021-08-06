import React from 'react';
import TestRenderer from 'react-test-renderer';
import Settings from '../../screen/settings/settings';
import Selftest from '../../screen/selftest';
import { BlueHeader } from '../../BlueComponents';
const assert = require('assert');
jest.mock('react-native-qrcode-svg', () => 'Video');
jest.useFakeTimers();

jest.mock('amplitude-js', () => ({
  getInstance: function () {
    return {
      init: jest.fn(),
      logEvent: jest.fn(),
    };
  },
}));

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
