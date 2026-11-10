import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import bolt11 from 'bolt11';

import { ThemeProvider } from '@react-navigation/native';
import ScanLNDInvoice from '../../screen/lnd/ScanLNDInvoice';
import { BlueDefaultTheme } from '../../components/themes';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import loc from '../../loc';

const wallet = new LightningArkWallet();
wallet.setSecret('arkade://abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');

const invoice = (satoshis: number, hash: string) =>
  bolt11.sign(
    bolt11.encode({
      network: { bech32: 'bc', pubKeyHash: 0, scriptHash: 5, validWitnessVersions: [0, 1] },
      satoshis,
      timestamp: Math.floor(Date.now() / 1000),
      tags: [
        { tagName: 'payment_hash', data: hash.repeat(32) },
        { tagName: 'description', data: 'race' },
        { tagName: 'expire_time', data: 3600 },
      ],
    }),
    '11'.repeat(32),
  ).paymentRequest!;

let routeParams: Record<string, unknown> = {};
const noop = () => {};
const navigationMock = { setParams: noop, setOptions: noop, navigate: noop, goBack: noop, dispatch: noop, addListener: () => noop };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => navigationMock,
    useRoute: () => ({ params: routeParams, name: 'ScanLNDInvoice' }),
    useLocale: () => ({ direction: 'ltr' }),
  };
});
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: [wallet], fetchAndSaveWalletTransactions: async () => {}, saveToDisk: async () => {} }),
}));
jest.mock('../../hooks/useBiometrics', () => ({
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: async () => false }),
  unlockWithBiometrics: async () => true,
}));
jest.mock('../../components/SafeArea', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../components/DismissKeyboardInputAccessory', () => ({
  DismissKeyboardInputAccessory: () => null,
  DismissKeyboardInputAccessoryViewID: 'DismissKeyboardInputAccessoryViewID',
}));
jest.mock('../../components/Alert', () => () => {});

const tree = () => (
  <ThemeProvider value={BlueDefaultTheme}>
    <ScanLNDInvoice />
  </ThemeProvider>
);
const OLD_QUOTE = { id: 'rfq:old', fee: { amount: 10n }, give: { amount: 1010n }, expiresAt: 2000000000 };

/** Renders the screen on one invoice and taps Pay, leaving its quote request unanswered. */
const quoteInFlight = async () => {
  let answer: (quote: unknown) => void = () => {};
  const quoteInvoice = jest.spyOn(wallet, 'quoteInvoice').mockImplementation(() => new Promise(resolve => (answer = resolve)) as any);
  jest.spyOn(wallet, 'ensureLightningFeesLoaded').mockResolvedValue();
  const first = invoice(1000, 'aa');
  routeParams = { walletID: wallet.getID(), uri: first };
  const screen = render(tree());
  await waitFor(() => expect(screen.getByTestId('AddressInput').props.value).toBe(first));
  fireEvent.press(screen.getByText(loc.lnd.payButton));
  await waitFor(() => expect(quoteInvoice).toHaveBeenCalledWith(first));
  return { screen, answer: (quote: unknown) => answer(quote) };
};

describe('ScanLNDInvoice Arkade quote', () => {
  beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('drops a quote that resolves after the invoice changed', async () => {
    const { screen, answer } = await quoteInFlight();
    const second = invoice(2000, 'bb');
    routeParams = { walletID: wallet.getID(), uri: second };
    screen.rerender(tree());
    await waitFor(() => expect(screen.getByTestId('AddressInput').props.value).toBe(second));

    await act(async () => answer(OLD_QUOTE));
    expect(screen.queryByText(loc.lnd.confirmPayment)).toBeNull();
  });
});
