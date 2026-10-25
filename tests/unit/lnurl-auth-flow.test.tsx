import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { bech32 } from 'bech32';

import Lnurl, { LnurlServerError } from '../../class/lnurl';
import LnurlAuth from '../../screen/lnd/lnurlAuth';
import ScanLNDInvoice from '../../screen/lnd/ScanLNDInvoice';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';

const mockNavigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
  goBack: jest.fn(),
  pop: jest.fn(),
};
const mockDispatch = jest.fn();
let mockRouteParams: {
  lnurl?: string;
  walletID?: string;
  onBarScanned?: string;
  uri?: string;
};
let mockWallets: ReturnType<typeof makeWallet>[];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ name: 'LnurlAuth', params: mockRouteParams }),
  useNavigation: () => mockNavigation,
  useLocale: () => ({ direction: 'ltr' }),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('../../NavigationService', () => ({
  navigationRef: { dispatch: (...args: unknown[]) => mockDispatch(...args) },
}));
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: mockWallets }),
}));
jest.mock('../../hooks/useBiometrics', () => ({
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: jest.fn() }),
}));
jest.mock('../../hooks/useKeyboard', () => ({ useKeyboard: jest.fn() }));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { NotificationSuccess: 'notificationSuccess', NotificationError: 'notificationError' },
}));
jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: {} }),
}));
jest.mock('../../components/Icon', () => 'Icon');
jest.mock('../../components/SafeArea', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../../components/AddressInput', () => 'AddressInput');
jest.mock('../../components/AmountInput', () => ({
  AmountInput: 'AmountInput',
}));
jest.mock('../../components/DismissKeyboardInputAccessory', () => ({
  DismissKeyboardInputAccessory: 'DismissKeyboardInputAccessory',
}));
jest.mock('../../screen/send/success', () => ({
  SuccessView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeWallet(id: string, chain: Chain) {
  return {
    chain,
    allowLnurlAuth: () => true,
    getID: () => id,
    getLabel: () => id,
    getBalance: () => 0,
    getLnurlAuthLinkingKey: jest.fn(() => new Uint8Array(32).fill(id === 'bitcoin' ? 1 : 2)),
  };
}

const encode = (url: string) => bech32.encode('lnurl', bech32.toWords(new TextEncoder().encode(url)), 1023);
const authUrl = (domain: string, challenge = '11'.repeat(32)) => encode(`https://${domain}/login?tag=login&k1=${challenge}&action=login`);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockWallets = [makeWallet('bitcoin', Chain.ONCHAIN), makeWallet('lightning', Chain.OFFCHAIN)];
  mockRouteParams = { lnurl: authUrl('first.example') };
  jest.spyOn(Lnurl.prototype, 'authenticate').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function startAuthentication(screen: ReturnType<typeof render>) {
  fireEvent.press(screen.getByText(loc.lnurl_auth.authenticate));
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
}

describe('LNURL-auth request and identity', () => {
  it('preserves the Lightning identity for links without a wallet ID', async () => {
    const screen = render(<LnurlAuth />);
    expect(screen.getByText('lightning')).toBeTruthy();
    await startAuthentication(screen);
    expect(mockWallets[1].getLnurlAuthLinkingKey).toHaveBeenCalledWith('first.example');
    expect(mockWallets[0].getLnurlAuthLinkingKey).not.toHaveBeenCalled();
    expect(Lnurl.prototype.authenticate).toHaveBeenCalledWith(new Uint8Array(32).fill(2));
  });

  it('shows the domain between the parts of the translated question', () => {
    const screen = render(<LnurlAuth />);
    const [start, end] = loc.lnurl_auth.login_question.split('{hostname}').map(part => part.trim());
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(screen.getByText(start)).toBeTruthy();
    expect(screen.getByText('first.example')).toBeTruthy();
    expect(screen.getByText(end)).toBeTruthy();
  });

  it('shows only the translated message for an invalid request', () => {
    mockRouteParams = { lnurl: encode('https://first.example/login?tag=login&k1=abcd') };
    const screen = render(<LnurlAuth />);
    expect(screen.getByText(loc.lnurl_auth.invalid_request)).toBeTruthy();
    expect(screen.queryByText(/k1/)).toBeNull();
    expect(screen.queryByText(loc.lnurl_auth.authenticate)).toBeNull();
  });

  it('shows the reason from the service, but not untranslated app errors', async () => {
    jest.mocked(Lnurl.prototype.authenticate).mockRejectedValueOnce(new LnurlServerError('Expired challenge'));
    let screen = render(<LnurlAuth />);
    await startAuthentication(screen);
    expect(screen.getByText(String(loc.formatString(loc.lnurl_auth.could_not_auth, { hostname: 'first.example' })))).toBeTruthy();
    expect(screen.getByText('Expired challenge')).toBeTruthy();
    screen.unmount();

    jest.mocked(Lnurl.prototype.authenticate).mockRejectedValueOnce(new TypeError('Network request failed'));
    screen = render(<LnurlAuth />);
    await startAuthentication(screen);
    expect(screen.getByText(String(loc.formatString(loc.lnurl_auth.could_not_auth, { hostname: 'first.example' })))).toBeTruthy();
    expect(screen.queryByText('Network request failed')).toBeNull();
  });

  it('uses an explicitly selected Bitcoin wallet', () => {
    mockRouteParams.walletID = 'bitcoin';
    const screen = render(<LnurlAuth />);
    expect(screen.getByText('bitcoin')).toBeTruthy();
    expect(screen.queryByText('lightning')).toBeNull();
  });

  it('falls back to a seed wallet when no eligible Lightning wallet exists', () => {
    mockWallets[1].allowLnurlAuth = () => false;
    const screen = render(<LnurlAuth />);
    expect(screen.getByText('bitcoin')).toBeTruthy();
  });

  it('requires authentication again when a new challenge arrives on the same screen', async () => {
    const screen = render(<LnurlAuth />);
    await startAuthentication(screen);
    expect(screen.queryByText(loc.lnurl_auth.authenticate)).toBeNull();

    mockRouteParams = { lnurl: authUrl('first.example', '22'.repeat(32)) };
    screen.rerender(<LnurlAuth />);
    expect(screen.getByText(loc.lnurl_auth.authenticate)).toBeTruthy();
    await startAuthentication(screen);
    expect(Lnurl.prototype.authenticate).toHaveBeenCalledTimes(2);
  });

  it('clears an error when a new request arrives', async () => {
    jest.mocked(Lnurl.prototype.authenticate).mockRejectedValueOnce(new LnurlServerError('Expired challenge'));
    const screen = render(<LnurlAuth />);
    await startAuthentication(screen);
    expect(screen.getByText('Expired challenge')).toBeTruthy();

    mockRouteParams = { lnurl: authUrl('second.example') };
    screen.rerender(<LnurlAuth />);
    expect(screen.getByText(loc.lnurl_auth.authenticate)).toBeTruthy();
    expect(screen.queryByText('Expired challenge')).toBeNull();
  });

  it.each(['success', 'error'])('ignores an earlier request finishing with %s', async result => {
    let resolvePending!: () => void;
    let rejectPending!: (err: Error) => void;
    jest.mocked(Lnurl.prototype.authenticate).mockImplementationOnce(
      () =>
        new Promise<void>((resolve, reject) => {
          resolvePending = resolve;
          rejectPending = reject;
        }),
    );
    const screen = render(<LnurlAuth />);
    await startAuthentication(screen);

    mockRouteParams = { lnurl: authUrl('second.example') };
    screen.rerender(<LnurlAuth />);
    await act(async () => {
      if (result === 'success') resolvePending();
      else rejectPending(new Error('Old request failed'));
    });
    expect(screen.getByText(loc.lnurl_auth.authenticate)).toBeTruthy();
    expect(screen.getByText('second.example')).toBeTruthy();
    expect(screen.queryByText('Old request failed')).toBeNull();
  });

  it('does not sign a replaced request during the UI delay', async () => {
    const screen = render(<LnurlAuth />);
    fireEvent.press(screen.getByText(loc.lnurl_auth.authenticate));
    mockRouteParams = { lnurl: authUrl('second.example') };
    screen.rerender(<LnurlAuth />);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(Lnurl.prototype.authenticate).not.toHaveBeenCalled();
    expect(mockWallets[1].getLnurlAuthLinkingKey).not.toHaveBeenCalled();
    expect(screen.getByText(loc.lnurl_auth.authenticate)).toBeTruthy();
  });
});

describe('LNURL-auth from Lightning Send', () => {
  it.each(['scan', 'paste', 'uri'])('dismisses Send and carries the selected wallet through %s', async source => {
    const lnurl = authUrl('first.example');
    mockWallets.push(makeWallet('other-lightning', Chain.OFFCHAIN));
    mockRouteParams = { walletID: 'other-lightning' };
    if (source === 'scan') mockRouteParams.onBarScanned = lnurl;
    if (source === 'uri') mockRouteParams.uri = lnurl;
    const screen = render(<ScanLNDInvoice />);
    if (source === 'paste') fireEvent(screen.UNSAFE_getByType('AddressInput' as any), 'changeText', lnurl);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: {
          name: 'LnurlAuth',
          params: { lnurl, walletID: 'other-lightning' },
        },
      }),
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('keeps ordinary LNURL scans on the existing routing path', () => {
    const lnurl = encode('https://first.example/pay');
    mockRouteParams = { walletID: 'lightning', onBarScanned: lnurl };
    render(<ScanLNDInvoice />);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('LNDCreateInvoiceRoot', {
      screen: 'LNDCreateInvoice',
      params: { uri: lnurl },
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
