import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import Confirm from '../../screen/send/Confirm';
import MultisigAdvanced from '../../screen/wallets/MultisigAdvanced';

let routeParams: any = {};

const setParamsMock = jest.fn();
const navigateMock = jest.fn();
const goBackMock = jest.fn();

const navigationMock = {
  setParams: setParamsMock,
  navigate: navigateMock,
  goBack: goBackMock,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({ params: routeParams }),
  };
});

jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: () => navigationMock,
}));

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    wallets: [
      {
        getID: () => 'wallet-1',
        broadcastTx: jest.fn(async () => 'mock-txid'),
      },
    ],
    fetchAndSaveWalletTransactions: jest.fn(async () => {}),
    counterpartyMetadata: {},
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({
    isElectrumDisabled: false,
  }),
}));

jest.mock('../../hooks/useBiometrics', () => ({
  useBiometrics: () => ({
    isBiometricUseCapableAndEnabled: jest.fn(async () => false),
  }),
  unlockWithBiometrics: jest.fn(async () => true),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      foregroundColor: '#111111',
      feeText: '#333333',
      lightButton: '#dddddd',
      alternativeTextColor2: '#777777',
      buttonTextColor: '#000000',
      elevated: '#ffffff',
      buttonDisabledBackgroundColor: '#cccccc',
      outputValue: '#121212',
      alternativeTextColor: '#666666',
      buttonDisabledTextColor: '#999999',
    },
  }),
}));

jest.mock('../../components/BlueCard', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../../components/BlueText', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('../../components/SafeArea', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../components/Button', () => 'Button');
jest.mock('../../components/Icon', () => 'Icon');
jest.mock('../../components/ListItem', () => 'ListItem');
jest.mock('../../components/HeaderRightButton', () => 'HeaderRightButton');
jest.mock('../../components/BlueSpacing', () => ({ BlueSpacing20: 'BlueSpacing20' }));

jest.mock('../../components/Alert', () => jest.fn());
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {
    NotificationSuccess: 'NotificationSuccess',
    NotificationError: 'NotificationError',
  },
}));

jest.mock('../../blue_modules/currency', () => ({
  satoshiToBTC: (v: number) => String(v),
  satoshiToLocalCurrency: (v: number) => String(v),
}));

jest.mock('../../blue_modules/notifications', () => ({
  majorTomToGroundControl: jest.fn(),
}));

jest.mock('../../blue_modules/BlueElectrum', () => ({
  ensureConnected: jest.fn(async () => true),
}));

jest.mock('../../class/contact-list', () => ({
  ContactList: class {
    isPaymentCodeValid() {
      return false;
    }
  },
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    send: {
      create_details: 'Details',
      create_to: 'To',
      create_fee: 'Fee',
      input_done: 'Done',
    },
    units: { BTC: 'BTC' },
    _: { of: '{number}/{total}' },
    errors: { network: 'network', broadcast: 'broadcast' },
    multisig: { of: 'of' },
  },
  formatBalance: (value: number) => String(value),
  formatBalanceWithoutSuffix: (value: number) => String(value),
}));

describe('Header options regression guards', () => {
  beforeEach(() => {
    setParamsMock.mockClear();
    navigateMock.mockClear();
    goBackMock.mockClear();
  });

  it('sets Confirm headerRight only once across same-props rerenders', async () => {
    routeParams = {
      recipients: [{ address: 'bc1qtestaddress0000000000000000000000000000', value: 1234 }],
      targets: [{ address: 'bc1qtestaddress0000000000000000000000000000', value: 1234 }],
      walletID: 'wallet-1',
      fee: 0.00001,
      memo: '',
      tx: '02000000000100',
      satoshiPerByte: 1,
      psbt: '',
      payjoinUrl: undefined,
    };

    const screen = render(<Confirm />);

    await waitFor(() => {
      expect(setParamsMock).toHaveBeenCalledTimes(1);
    });

    screen.rerender(<Confirm />);

    await waitFor(() => {
      expect(setParamsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('sets MultisigAdvanced headerRight only once across same-props rerenders', async () => {
    routeParams = {
      m: 2,
      n: 3,
      format: 0,
      onSave: jest.fn(),
    };

    const screen = render(<MultisigAdvanced />);

    await waitFor(() => {
      expect(setParamsMock).toHaveBeenCalledTimes(1);
    });

    screen.rerender(<MultisigAdvanced />);

    await waitFor(() => {
      expect(setParamsMock).toHaveBeenCalledTimes(1);
    });
  });
});
