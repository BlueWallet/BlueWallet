import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import bolt11 from 'bolt11';

import { ThemeProvider } from '@react-navigation/native';
import LnurlPay from '../../screen/lnd/lnurlPay';
import { BlueDefaultTheme } from '../../components/themes';
import Lnurl, { LnurlPayServicePayload } from '../../class/lnurl';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import loc from '../../loc';

const wallet = new LightningArkWallet();
wallet.setSecret('arkade://abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');

const INVOICE = bolt11.sign(
  bolt11.encode({
    network: { bech32: 'bc', pubKeyHash: 0, scriptHash: 5, validWitnessVersions: [0, 1] },
    satoshis: 1000,
    timestamp: Math.floor(Date.now() / 1000),
    tags: [
      { tagName: 'payment_hash', data: 'ef'.repeat(32) },
      { tagName: 'expire_time', data: 3600 },
    ],
  }),
  '11'.repeat(32),
).paymentRequest!;
const PAYLOAD: LnurlPayServicePayload = {
  callback: 'https://pay.example/cb',
  fixed: false,
  min: 1000,
  max: 50000,
  amount: 1000,
  domain: 'pay.example',
  metadata: '[["text/plain","tip"]]',
  description: 'tip',
};

const mockNavigate = jest.fn();
const mockRoute = { lnurl: 'bob@pay.example' };
const mockBiometrics = { enabled: jest.fn(), unlock: jest.fn() };
const noop = () => {};
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ setParams: () => {}, navigate: mockNavigate, goBack: () => {}, addListener: () => () => {} }),
    useRoute: () => ({ params: { walletID: wallet.getID(), lnurl: mockRoute.lnurl }, name: 'LnurlPay' }),
    useLocale: () => ({ direction: 'ltr' }),
  };
});
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: [wallet], fetchAndSaveWalletTransactions: async () => {} }),
}));
jest.mock('../../hooks/useBiometrics', () => ({
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: () => mockBiometrics.enabled() }),
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
const mockAlert = jest.fn();
jest.mock('../../components/Alert', () => (options: unknown) => mockAlert(options));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: () => {},
  HapticFeedbackTypes: { NotificationError: 'NotificationError', NotificationSuccess: 'NotificationSuccess', Selection: 'Selection' },
}));

const tree = () => (
  <ThemeProvider value={BlueDefaultTheme}>
    <LnurlPay />
  </ThemeProvider>
);
// The screen takes over a second to mount under jest.
const SLOW = { timeout: 5000 };
const quote = (railId: string, fee: number): any => ({ railId, amount: 1000, fee, total: 1000 + fee, send: async () => ({}) });

describe('LnurlPay on an Arkade wallet', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(noop);
    jest.spyOn(Lnurl.prototype, 'callLnurlPayService').mockImplementation(async function (this: any) {
      this._lnurlPayServicePayload = PAYLOAD;
      return PAYLOAD;
    });
    jest.spyOn(Lnurl.prototype, 'getCommentAllowed').mockReturnValue(false);
    mockNavigate.mockClear();
    mockAlert.mockClear();
    mockRoute.lnurl = 'bob@pay.example';
    mockBiometrics.enabled.mockReset().mockResolvedValue(false);
    mockBiometrics.unlock.mockReset().mockResolvedValue(true);
  });
  afterEach(() => jest.restoreAllMocks());

  const confirmTwice = async (screen: ReturnType<typeof render>) => {
    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    fireEvent.press(await screen.findByText(loc.lnd.confirmPayment, {}, SLOW));
  };

  it('quotes the Arkade rail, shows its fee, and sends that quote on confirm', async () => {
    const arkade = quote('lnurl-arkade', 0);
    const quoteSend = jest.spyOn(wallet, 'quoteSend').mockResolvedValue(arkade);
    const sendQuote = jest.spyOn(wallet, 'sendQuote').mockResolvedValue();
    const screen = render(tree());

    await confirmTwice(screen);

    expect(quoteSend).toHaveBeenCalledWith('bob@pay.example', { amountSat: 1000, comment: undefined });
    await waitFor(() => expect(sendQuote).toHaveBeenCalledWith(arkade));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ScanLNDInvoiceRoot', expect.objectContaining({ screen: 'Success' })));
  }, 20000);

  it('falls back to the service invoice over Lightning and keeps its success page', async () => {
    const lightning = quote('lightning', 7);
    const quoteSend = jest
      .spyOn(wallet, 'quoteSend')
      .mockRejectedValueOnce(new Error('No Arkade route for this destination'))
      .mockResolvedValueOnce(lightning);
    const requestBolt11 = jest.spyOn(Lnurl.prototype, 'requestBolt11FromLnurlPayService').mockResolvedValue({ pr: INVOICE } as any);
    const sendQuote = jest.spyOn(wallet, 'sendQuote').mockResolvedValue();
    const screen = render(tree());

    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    expect(await screen.findByText(loc.formatString(loc.lnd.quoteFee, { fee: '7 sats' }) as string)).toBeTruthy();
    fireEvent.press(await screen.findByText(loc.lnd.confirmPayment, {}, SLOW));

    expect(requestBolt11).toHaveBeenCalledWith(1000, undefined);
    expect(quoteSend).toHaveBeenLastCalledWith(INVOICE);
    await waitFor(() => expect(sendQuote).toHaveBeenCalledWith(lightning));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('ScanLNDInvoiceRoot', expect.objectContaining({ screen: 'LnurlPaySuccess' })),
    );
  }, 20000);

  it('drops a quote that answers after the amount changed', async () => {
    let answer: (q: any) => void = noop;
    const quoteSend = jest.spyOn(wallet, 'quoteSend').mockImplementation(() => new Promise(resolve => (answer = resolve)));
    const sendQuote = jest.spyOn(wallet, 'sendQuote').mockResolvedValue();
    const screen = render(tree());

    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    await waitFor(() => expect(quoteSend).toHaveBeenCalled());
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '2');
    answer(quote('lnurl-arkade', 0));

    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    await waitFor(() => expect(quoteSend).toHaveBeenCalledTimes(2));
    expect(sendQuote).not.toHaveBeenCalled();
  }, 20000);

  it('drops an expired quote, so the next tap quotes again', async () => {
    const quoteSend = jest.spyOn(wallet, 'quoteSend').mockResolvedValue(quote('lnurl-arkade', 0));
    jest.spyOn(wallet, 'sendQuote').mockRejectedValue(Object.assign(new Error('quote q expired'), { name: 'QuoteExpired' }));
    const screen = render(tree());

    await confirmTwice(screen);

    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith({ message: loc.lnd.quoteExpired }));
    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    await waitFor(() => expect(quoteSend).toHaveBeenCalledTimes(2));
  }, 20000);

  it('does not send a held quote when the amount changed during the biometric prompt', async () => {
    jest.spyOn(wallet, 'quoteSend').mockResolvedValue(quote('lnurl-arkade', 0));
    const sendQuote = jest.spyOn(wallet, 'sendQuote').mockResolvedValue();
    const screen = render(tree());
    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    const confirm = await screen.findByText(loc.lnd.confirmPayment, {}, SLOW);

    let unlock: (ok: boolean) => void = noop;
    mockBiometrics.enabled.mockResolvedValue(true);
    mockBiometrics.unlock.mockImplementation(() => new Promise(resolve => (unlock = resolve)));
    fireEvent.press(confirm);
    await waitFor(() => expect(mockBiometrics.unlock).toHaveBeenCalled());
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '2');
    unlock(true);

    await screen.findByText(loc.lnd.payButton, {}, SLOW);
    expect(sendQuote).not.toHaveBeenCalled();
  }, 20000);

  it('drops a held quote when the destination changes', async () => {
    const quoteSend = jest.spyOn(wallet, 'quoteSend').mockResolvedValue(quote('lnurl-arkade', 0));
    const screen = render(tree());
    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    await screen.findByText(loc.lnd.confirmPayment, {}, SLOW);

    mockRoute.lnurl = 'carol@pay.example';
    screen.rerender(tree());

    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    await waitFor(() => expect(quoteSend).toHaveBeenLastCalledWith('carol@pay.example', { amountSat: 1000, comment: undefined }));
  }, 20000);
});
