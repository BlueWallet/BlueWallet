import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import Share from 'react-native-share';

import ReceiveDetails from '../../screen/receive/ReceiveDetails';
import { BitcoinUnit } from '../../models/bitcoinUnits';

const mockSetParams = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCopy = jest.fn();
const mockSaveToDisk = jest.fn();
const mockSleep = jest.fn(() => Promise.resolve());
const mockFetchAndSaveWalletTransactions = jest.fn();
let mockRouteParams: Record<string, unknown> = {};
let mockWallets: any[] = [];

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({ params: mockRouteParams }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(effect, [effect]),
  };
});

jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: () => ({
    setParams: mockSetParams,
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    wallets: mockWallets,
    saveToDisk: mockSaveToDisk,
    sleep: mockSleep,
    fetchAndSaveWalletTransactions: mockFetchAndSaveWalletTransactions,
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isElectrumDisabled: false }),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      elevated: '#ffffff',
      foregroundColor: '#111111',
      inputBackgroundColor: '#222222',
    },
  }),
}));

jest.mock('../../class/deeplink-schema-match', () => ({
  __esModule: true,
  default: {
    bip21encode: (address: string) => `bitcoin:${address}`,
    bip21decode: (value: string) => ({ address: value.replace('bitcoin:', '').split('?')[0] }),
  },
}));

jest.mock('../../blue_modules/BlueElectrum', () => ({
  getBalanceByAddress: jest.fn(() => Promise.resolve({ confirmed: 0, unconfirmed: 0 })),
  getMempoolTransactionsByAddress: jest.fn(() => Promise.resolve([])),
  multiGetTransactionByTxid: jest.fn(() => Promise.resolve({})),
  estimateFees: jest.fn(() => Promise.resolve({ fast: 10, medium: 5 })),
}));

jest.mock('../../blue_modules/notifications', () => ({
  majorTomToGroundControl: jest.fn(),
  tryToObtainPermissions: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {
    ImpactLight: 'ImpactLight',
    ImpactHeavy: 'ImpactHeavy',
    NotificationSuccess: 'NotificationSuccess',
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(() => Promise.resolve()) },
}));

jest.mock('../../components/Alert', () => jest.fn());
jest.mock('../../components/BlueCard', () => ({ children }: { children: React.ReactNode }) => <View>{children}</View>);
jest.mock('../../components/BlueText', () => ({ children, ...props }: { children: React.ReactNode }) => <Text {...props}>{children}</Text>);
jest.mock('../../components/HandOffComponent', () => () => null);
jest.mock('../../components/TransactionPendingIconBig', () => ({ TransactionPendingIconBig: () => <Text>Pending icon</Text> }));
jest.mock('../../components/BlueSpacing', () => ({ BlueSpacing40: () => null }));
jest.mock('../../components/BlueLoading', () => ({ BlueLoading: () => <Text>Loading</Text> }));
jest.mock('../../screen/send/success', () => ({ SuccessView: () => <Text>Success</Text> }));

jest.mock('../../components/SafeAreaScrollView', () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode }) => <View {...props}>{children}</View>,
}));

jest.mock('../../components/QRCode', () => ({
  __esModule: true,
  default: ({ value, size }: { value: string; size: number }) => <Text testID="QRCode">{`${value}|${size}`}</Text>,
}));

jest.mock('../../components/CopyTextToClipboard', () => {
  const ReactModule = require('react');
  const { Text: NativeText } = require('react-native');
  return {
    __esModule: true,
    default: ReactModule.forwardRef(({ text }: { text: string }, ref: React.Ref<unknown>) => {
      ReactModule.useImperativeHandle(ref, () => ({ copy: mockCopy }));
      return <NativeText testID="CopyText">{text}</NativeText>;
    }),
  };
});

jest.mock('../../components/SegmentedControl', () => ({
  __esModule: true,
  default: ({ values, onChange }: { values: string[]; onChange: (index: number) => void }) => (
    <View>
      {values.map((value, index) => (
        <Pressable key={value} testID={`Segment-${index}`} onPress={() => onChange(index)}>
          <Text>{value}</Text>
        </Pressable>
      ))}
    </View>
  ),
}));

jest.mock('../../components/BlueButtonLink', () => ({
  __esModule: true,
  default: ({ title, onPress, testID }: { title: string; onPress: () => void; testID: string }) => (
    <Pressable testID={testID} onPress={onPress}>
      <Text>{title}</Text>
    </Pressable>
  ),
}));

jest.mock('../../components/Button', () => ({
  __esModule: true,
  default: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
      <Text>{title}</Text>
    </Pressable>
  ),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    wallets: { details_address: 'Address' },
    bip47: { payment_code: 'Payment code', not_found: 'Not found' },
    receive: {
      address_not_found: 'Address not found',
      bip47_explanation: 'Payment code explanation',
      details_setAmount: 'Set amount',
      details_share: 'Share',
    },
    transactions: {
      details_copy: 'Copy',
      eta_10m: '10 minutes',
      eta_3h: '3 hours',
      eta_1d: '1 day',
      pending_with_amount: '{amt1} / {amt2}',
      received_with_amount: '{amt1} / {amt2}',
    },
    send: { details_address: 'Address' },
    errors: { error: 'Error' },
    formatString: (template: string, params?: Record<string, string>) =>
      Object.entries(params ?? {}).reduce((result, [key, value]) => result.replace(`{${key}}`, value), template),
  },
  formatBalance: (value: number) => String(value),
}));

describe('ReceiveDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWallets = [];
    mockRouteParams = {};
  });

  it('encodes an address, resizes its QR code, copies the card, and shares it', async () => {
    const address = 'bc1qexampleaddress';
    mockRouteParams = { address };

    const screen = render(<ReceiveDetails />);

    expect(await screen.findByText(`bitcoin:${address}|90`)).toBeTruthy();
    expect(screen.queryByTestId('ReceiveCardSkeleton')).toBeNull();

    fireEvent(screen.getByTestId('ReceiveDetailsScrollView'), 'layout', {
      nativeEvent: { layout: { width: 400, height: 800 } },
    });
    expect(await screen.findByText(`bitcoin:${address}|301`)).toBeTruthy();

    fireEvent.press(screen.getByTestId('ReceiveCard'));
    expect(mockCopy).toHaveBeenCalledWith({ suppressHaptic: true });

    fireEvent.press(screen.getByText('Share'));
    expect(Share.open).toHaveBeenCalledWith({ message: `bitcoin:${address}` });
  });

  it('applies custom payment params and opens the editor with reducer state', async () => {
    const address = 'bc1qcustomaddress';
    const bip21encoded = `bitcoin:${address}?amount=2`;
    mockRouteParams = {
      address,
      customLabel: 'Coffee',
      customAmount: '2',
      customUnit: BitcoinUnit.BTC,
      bip21encoded,
      isCustom: true,
    };

    const screen = render(<ReceiveDetails />);

    expect(await screen.findByText('2 BTC')).toBeTruthy();
    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(screen.getByText(`${bip21encoded}|90`)).toBeTruthy();

    fireEvent.press(screen.getByTestId('SetCustomAmountButton'));
    expect(mockNavigate).toHaveBeenCalledWith('ReceiveCustomAmount', {
      address,
      currentLabel: 'Coffee',
      currentAmount: '2',
      currentUnit: BitcoinUnit.BTC,
      preferredUnit: BitcoinUnit.BTC,
    });
    expect(mockSetParams).toHaveBeenCalledWith({
      customLabel: undefined,
      customAmount: undefined,
      customUnit: undefined,
      bip21encoded: undefined,
      isCustom: undefined,
    });
  });

  it('switches between address and BIP47 payment-code state', async () => {
    const address = 'bc1qwalletaddress';
    const paymentCode = 'PM8TJmockpaymentcode';
    mockRouteParams = { walletID: 'wallet-1', address };
    mockWallets = [
      {
        getID: () => 'wallet-1',
        isBIP47Enabled: () => true,
        allowBIP47: () => true,
        getBIP47PaymentCode: () => paymentCode,
        getPreferredBalanceUnit: () => BitcoinUnit.BTC,
      },
    ];

    const screen = render(<ReceiveDetails />);
    expect(await screen.findByText(`bitcoin:${address}|90`)).toBeTruthy();

    fireEvent.press(screen.getByTestId('Segment-1'));
    expect(screen.getByText(`${paymentCode}|90`)).toBeTruthy();
    expect(screen.getByText('Payment code explanation')).toBeTruthy();

    fireEvent.press(screen.getByText('Share'));
    await waitFor(() => expect(Share.open).toHaveBeenCalledWith({ message: paymentCode }));
  });
});
