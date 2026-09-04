import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { Chain } from '../../models/bitcoinUnits';
import WalletDetails from '../../screen/wallets/WalletDetails';

const mockPresentAlert = jest.fn();
const mockSaveToDisk = jest.fn().mockResolvedValue(undefined);
const mockShowFilePickerAndReadFile = jest.fn();
const mockTxMetadata: Record<string, { memo?: string }> = { abc123: { memo: 'Existing note' } };
let mockWalletChain: Chain = Chain.ONCHAIN;
const mockWallet = {
  get chain() {
    return mockWalletChain;
  },
  type: 'test-wallet',
  typeReadable: 'Test wallet',
  getID: () => 'wallet-1',
  getLabel: () => 'Test wallet',
  getTransactions: () => [{ hash: '', txid: 'abc123', timestamp: 1, value: 1 }],
  getHideTransactionsInWalletsList: () => false,
};

jest.mock('../../blue_modules/fs', () => ({
  ...jest.requireActual('../../blue_modules/fs'),
  showFilePickerAndReadFile: (...args: unknown[]) => mockShowFilePickerAndReadFile(...args),
}));

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    wallets: [mockWallet],
    txMetadata: mockTxMetadata,
    saveToDisk: mockSaveToDisk,
    handleWalletDeletion: jest.fn(),
    fetchAndSaveWalletTransactions: jest.fn(),
    sleep: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useLocale: () => ({ direction: 'ltr' }),
  useNavigation: () => ({ navigate: jest.fn() }),
  usePreventRemove: jest.fn(),
  useRoute: () => ({ params: { walletID: 'wallet-1' } }),
}));

jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPresentAlert(...args),
}));

jest.mock('../../components/TooltipMenu', () => {
  const ReactLocal = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      actions,
      onPressMenuItem,
    }: {
      actions: Array<{ id: string; hidden?: boolean }>;
      onPressMenuItem: (id: string) => void;
    }) => {
      const action = actions.find(item => item.id === 'import_notes');
      if (!action || action.hidden) return null;
      return ReactLocal.createElement(
        Pressable,
        { testID: 'ImportNotesAction', onPress: () => onPressMenuItem(action.id) },
        ReactLocal.createElement(Text, null, 'Import notes'),
      );
    },
  };
});

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      alternativeTextColor: '#777',
      background: '#fff',
      buttonTextColor: '#000',
      cardBorderColor: '#ddd',
      cardSectionBackground: '#fff',
      cardSectionHeaderBackground: '#eee',
      feeText: '#555',
      foregroundColor: '#000',
      lightButton: '#eee',
      mainColor: '#00f',
      outputValue: '#000',
      redBG: '#f00',
      redText: '#fff',
    },
  }),
}));

jest.mock('../../hooks/useBiometrics', () => ({
  unlockWithBiometrics: jest.fn(),
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: jest.fn() }),
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {
    ImpactLight: 'ImpactLight',
    NotificationError: 'NotificationError',
    NotificationSuccess: 'NotificationSuccess',
    NotificationWarning: 'NotificationWarning',
  },
}));

jest.mock('../../components/BlueCard', () => {
  const ReactLocal = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(View, null, children) };
});
jest.mock('../../components/BlueText', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(Text, null, children) };
});
jest.mock('../../components/SettingsSection', () => {
  const ReactLocal = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SettingsListItem: () => null,
    SettingsSection: ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(View, null, children),
  };
});
jest.mock('../../components/SafeAreaScrollView', () => {
  const ReactLocal = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(View, null, children) };
});
jest.mock('../../components/BlueLoading', () => ({ BlueLoading: () => null }));
jest.mock('../../components/BlueSpacing', () => ({ BlueSpacing20: () => null }));
jest.mock('../../components/CopyTextToClipboard', () => () => null);
jest.mock('../../components/Icon', () => () => null);
jest.mock('../../components/SecondButton', () => ({ SecondButton: () => null }));
jest.mock('../../NavigationService', () => ({ navigateToWalletsList: jest.fn() }));

describe('WalletDetails note import', () => {
  beforeEach(() => {
    mockPresentAlert.mockClear();
    mockSaveToDisk.mockClear();
    mockShowFilePickerAndReadFile.mockClear();
    mockWalletChain = Chain.ONCHAIN;
    mockTxMetadata.abc123 = { memo: 'Existing note' };
    mockShowFilePickerAndReadFile.mockResolvedValue({
      data: 'Date,Transaction ID,Amount,Memo\ntoday,abc123,1,Imported note',
      uri: 'file:///notes.csv',
    });
  });

  it('waits for confirmation before overwriting and persisting an existing note', async () => {
    const { getByTestId } = render(<WalletDetails />);

    await act(async () => fireEvent.press(getByTestId('ImportNotesAction')));

    await waitFor(() => expect(mockPresentAlert).toHaveBeenCalledTimes(1));
    expect(mockTxMetadata.abc123.memo).toBe('Existing note');
    expect(mockSaveToDisk).not.toHaveBeenCalled();

    const confirmation = mockPresentAlert.mock.calls[0][0];
    const importButton = confirmation.buttons.find((button: { style?: string }) => button.style === 'destructive');
    await act(async () => importButton.onPress());

    await waitFor(() => expect(mockSaveToDisk).toHaveBeenCalledTimes(1));
    expect(mockTxMetadata.abc123.memo).toBe('Imported note');
    expect(mockPresentAlert).toHaveBeenCalledTimes(2);
  });

  it('does not offer note import for an off-chain wallet', () => {
    mockWalletChain = Chain.OFFCHAIN;

    const { queryByTestId } = render(<WalletDetails />);

    expect(queryByTestId('ImportNotesAction')).toBeNull();
    expect(mockShowFilePickerAndReadFile).not.toHaveBeenCalled();
  });
});
