import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '@react-navigation/native';
import LnurlPay from '../../screen/lnd/lnurlPay';
import { BlueDefaultTheme } from '../../components/themes';
import Lnurl, { LnurlPayServicePayload } from '../../class/lnurl';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import loc from '../../loc';

const wallet = new LightningCustodianWallet();
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
const mockBiometrics = { enabled: jest.fn(), unlock: jest.fn() };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ setParams: () => {}, navigate: () => {}, goBack: () => {}, addListener: () => () => {} }),
    useRoute: () => ({ params: { walletID: wallet.getID(), lnurl: 'bob@pay.example' }, name: 'LnurlPay' }),
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
jest.mock('../../components/Alert', () => () => {});

const tree = () => (
  <ThemeProvider value={BlueDefaultTheme}>
    <LnurlPay />
  </ThemeProvider>
);
// The screen takes over a second to mount under jest.
const SLOW = { timeout: 5000 };

describe('LnurlPay pay button', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(Lnurl.prototype, 'callLnurlPayService').mockImplementation(async function (this: any) {
      this._lnurlPayServicePayload = PAYLOAD;
      return PAYLOAD;
    });
    jest.spyOn(Lnurl.prototype, 'getCommentAllowed').mockReturnValue(false);
    mockBiometrics.enabled.mockReset().mockResolvedValue(true);
    mockBiometrics.unlock.mockReset().mockResolvedValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('comes back when the biometric prompt is cancelled', async () => {
    const requestBolt11 = jest.spyOn(Lnurl.prototype, 'requestBolt11FromLnurlPayService');
    const screen = render(tree());

    fireEvent.press(await screen.findByText(loc.lnd.payButton, {}, SLOW));
    await waitFor(() => expect(mockBiometrics.unlock).toHaveBeenCalled());

    expect(await screen.findByText(loc.lnd.payButton, {}, SLOW)).toBeTruthy();
    expect(requestBolt11).not.toHaveBeenCalled();
  }, 20000);

  it('stays usable when tapped with no amount', async () => {
    const screen = render(tree());
    await screen.findByText(loc.lnd.payButton, {}, SLOW);

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '');
    fireEvent.press(screen.getByText(loc.lnd.payButton));

    expect(screen.getByText(loc.lnd.payButton)).toBeTruthy();
    expect(mockBiometrics.enabled).not.toHaveBeenCalled();
  }, 20000);
});
