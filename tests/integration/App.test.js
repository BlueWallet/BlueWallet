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
  <SafeAreaProvider>
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
  // Wait for OK to appear - self-tests can take a long time to complete
  // (crypto operations, wallet generation, etc.)
  // If tests fail, an error message will be shown instead of OK
  await waitFor(() => {
    expect(queryByTestId('SelfTestOk')).toBeTruthy();
  }, { timeout: 120000 });
}, 180000);
