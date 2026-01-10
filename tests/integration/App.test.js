/* eslint react/prop-types: "off" */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import SelfTest from '../../screen/settings/SelfTest';
import Settings from '../../screen/settings/Settings';
import { BlueDefaultTheme } from '../../components/themes';

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

const Wrapper = ({ children }) => (
  <SafeAreaProvider initialSafeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}>
    <NavigationContainer theme={BlueDefaultTheme}>{children}</NavigationContainer>
  </SafeAreaProvider>
);

it('Header works', () => {
  const { toJSON } = render(
    <Wrapper>
      <Header />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();
});

// eslint-disable-next-line jest/no-disabled-tests
it.skip('Settings work', () => {
  const { toJSON } = render(
    <Wrapper>
      <Settings />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();
});

it('SelfTest work', async () => {
  const { toJSON, queryByTestId } = render(
    <Wrapper>
      <SelfTest />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();

  // Self-tests can complete very quickly or take a while
  // Wait for OK to appear (it might be there immediately or after tests complete)
  await waitFor(
    () => {
      expect(queryByTestId('SelfTestOk')).toBeTruthy();
    },
    { timeout: 120000 },
  );

  // Verify OK is present and visible
  const okElement = queryByTestId('SelfTestOk');
  expect(okElement).toBeTruthy();
}, 180000);
