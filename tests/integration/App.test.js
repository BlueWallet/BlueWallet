import React from 'react';
import { render } from '@testing-library/react-native';

import { Header } from '../../components/Header';
import SelfTest from '../../screen/settings/SelfTest';
import Settings from '../../screen/settings/Settings';

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

it('Header works', () => {
  const { toJSON } = render(<Header />);
  expect(toJSON()).toBeTruthy();
});

// eslint-disable-next-line jest/no-disabled-tests
it.skip('Settings work', () => {
  const { toJSON } = render(<Settings />);
  expect(toJSON()).toBeTruthy();
});

it('SelfTest work', () => {
  const { toJSON, getByText } = render(<SelfTest />);
  expect(toJSON()).toBeTruthy();
  expect(getByText('OK')).toBeTruthy();
});
