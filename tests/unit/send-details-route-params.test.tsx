import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '@react-navigation/native';
import SendDetails from '../../screen/send/SendDetails';
import { BlueDefaultTheme } from '../../components/themes';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';

const wallet = new HDSegwitBech32Wallet();
wallet.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');

let routeParams: Record<string, unknown> = {};

const noop = () => {};
const navigationMock = {
  setParams: noop,
  setOptions: noop,
  navigate: noop,
  goBack: noop,
  dispatch: noop,
  addListener: () => noop,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = require('react');
  return {
    ...actual,
    useNavigation: () => navigationMock,
    useRoute: () => ({ params: routeParams, name: 'SendDetails' }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    useLocale: () => ({ direction: 'ltr' }),
  };
});

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    wallets: [wallet],
    sleep: async () => {},
    txMetadata: {},
    saveToDisk: async () => {},
  }),
}));

jest.mock('../../blue_modules/BlueElectrum', () => ({
  isDisabled: async () => false,
  estimateFees: async () => ({ fast: 3, medium: 2, slow: 1 }),
  ensureConnected: async () => true,
}));

jest.mock('../../components/SafeArea', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../components/DismissKeyboardInputAccessory', () => ({
  DismissKeyboardInputAccessory: () => null,
  DismissKeyboardInputAccessoryViewID: 'DismissKeyboardInputAccessoryViewID',
}));
jest.mock('../../components/InputAccessoryAllFunds', () => ({
  __esModule: true,
  default: () => null,
  InputAccessoryAllFundsAccessoryViewID: 'InputAccessoryAllFundsAccessoryViewID',
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => {} },
}));
jest.mock('../../components/Alert', () => () => {});
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: () => {},
  HapticFeedbackTypes: { NotificationError: 'NotificationError', NotificationSuccess: 'NotificationSuccess', Selection: 'Selection' },
}));

const URI_ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const CONTACT = 'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';

const addressValue = (screen: ReturnType<typeof render>) => screen.getByTestId('AddressInput').props.value;
const tree = () => (
  <ThemeProvider value={BlueDefaultTheme}>
    <SendDetails />
  </ThemeProvider>
);

describe('SendDetails route params', () => {
  beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterAll(() => jest.restoreAllMocks());

  it('addRecipientParams replaces a BIP21 uri only when the uri is cleared from params', async () => {
    routeParams = { walletID: wallet.getID(), uri: `bitcoin:${URI_ADDRESS}?amount=0.001` };
    const screen = render(tree());
    await waitFor(() => expect(addressValue(screen)).toBe(URI_ADDRESS));

    // popTo merge from PaymentCodesList without clearing: uri wins, contact ignored
    routeParams = { ...routeParams, addRecipientParams: { address: CONTACT } };
    screen.rerender(tree());
    await waitFor(() => expect(addressValue(screen)).toBe(URI_ADDRESS));

    // the payload PaymentCodesList sends now
    routeParams = { walletID: wallet.getID(), uri: undefined, address: undefined, addRecipientParams: { address: CONTACT } };
    screen.rerender(tree());
    await waitFor(() => expect(addressValue(screen)).toBe(CONTACT));
  });
});
