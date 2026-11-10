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
let mockBiometrics = { on: false, unlock: async () => true };
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
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: async () => mockBiometrics.on }),
  unlockWithBiometrics: () => mockBiometrics.unlock(),
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
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: () => {},
  HapticFeedbackTypes: { NotificationError: 'NotificationError', NotificationSuccess: 'NotificationSuccess', Selection: 'Selection' },
}));

const tree = () => (
  <ThemeProvider value={BlueDefaultTheme}>
    <ScanLNDInvoice />
  </ThemeProvider>
);
const OLD_QUOTE = { id: 'rfq:old', fee: { amount: 10n }, give: { amount: 1010n }, expiresAt: 2000000000 };
const addressOf = (screen: ReturnType<typeof render>) => screen.getByTestId('AddressInput').props.value;

const openOn = async (uri: string) => {
  jest.spyOn(wallet, 'ensureLightningFeesLoaded').mockResolvedValue();
  routeParams = { walletID: wallet.getID(), uri };
  const screen = render(tree());
  await waitFor(() => expect(addressOf(screen)).toBe(uri));
  return screen;
};

const switchInvoice = async (screen: ReturnType<typeof render>) => {
  const second = invoice(2000, 'bb');
  routeParams = { walletID: wallet.getID(), uri: second };
  screen.rerender(tree());
  await waitFor(() => expect(addressOf(screen)).toBe(second));
};

/** Holds the biometric prompt open: `entered` settles once pay() reaches it, `answer` closes it. */
const pendingPrompt = () => {
  let answer: (ok: boolean) => void = () => {};
  let markEntered: () => void = () => {};
  const entered = new Promise<void>(resolve => (markEntered = resolve));
  mockBiometrics = {
    on: true,
    unlock: () =>
      new Promise<boolean>(resolve => {
        answer = resolve;
        markEntered();
      }),
  };
  return { entered, answer: (ok: boolean) => answer(ok) };
};

describe('ScanLNDInvoice Arkade quote', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.restoreAllMocks();
    mockBiometrics = { on: false, unlock: async () => true };
  });

  it('drops a quote that resolves after the invoice changed', async () => {
    let answer: (quote: unknown) => void = () => {};
    const quoteInvoice = jest.spyOn(wallet, 'quoteInvoice').mockImplementation(() => new Promise(resolve => (answer = resolve)) as any);
    const first = invoice(1000, 'aa');
    const screen = await openOn(first);
    fireEvent.press(screen.getByText(loc.lnd.payButton));
    await waitFor(() => expect(quoteInvoice).toHaveBeenCalledWith(first));

    await switchInvoice(screen);
    await act(async () => answer(OLD_QUOTE));
    expect(screen.queryByText(loc.lnd.confirmPayment)).toBeNull();
  });

  it('does not quote an invoice that changed during the biometric prompt', async () => {
    const quoteInvoice = jest.spyOn(wallet, 'quoteInvoice').mockResolvedValue(OLD_QUOTE as any);
    const prompt = pendingPrompt();
    const screen = await openOn(invoice(1000, 'aa'));
    fireEvent.press(screen.getByText(loc.lnd.payButton));

    await prompt.entered;
    await switchInvoice(screen);
    await act(async () => prompt.answer(true));
    expect(quoteInvoice).not.toHaveBeenCalled();
  });

  it('does not pay a held quote whose invoice changed during the biometric prompt', async () => {
    jest.spyOn(wallet, 'quoteInvoice').mockResolvedValue(OLD_QUOTE as any);
    const payQuotedInvoice = jest.spyOn(wallet, 'payQuotedInvoice').mockResolvedValue();
    const screen = await openOn(invoice(1000, 'aa'));
    fireEvent.press(screen.getByText(loc.lnd.payButton));
    await waitFor(() => expect(screen.getByText(loc.lnd.confirmPayment)).toBeTruthy());

    const prompt = pendingPrompt();
    fireEvent.press(screen.getByText(loc.lnd.confirmPayment));
    await prompt.entered;
    await switchInvoice(screen);
    await act(async () => prompt.answer(true));
    expect(payQuotedInvoice).not.toHaveBeenCalled();
  });

  it('refuses to quote an invoice this wallet issued', async () => {
    const quoteInvoice = jest.spyOn(wallet, 'quoteInvoice').mockResolvedValue(OLD_QUOTE as any);
    const own = invoice(1000, 'aa');
    jest.spyOn(wallet, 'isInvoiceGeneratedByWallet').mockImplementation(pr => pr === own);
    const screen = await openOn(own);
    await act(async () => fireEvent.press(screen.getByText(loc.lnd.payButton)));
    expect(quoteInvoice).not.toHaveBeenCalled();
  });
});
