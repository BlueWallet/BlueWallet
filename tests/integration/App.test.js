/* eslint react/prop-types: "off" */
import React from 'react';
import { render } from '@testing-library/react-native';
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
  const { toJSON, findByText } = render(
    <Wrapper>
      <SelfTest />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();
  // Wait for async self-tests to complete and show "OK"
  const okElement = await findByText('OK');
  expect(okElement).toBeTruthy();
});
