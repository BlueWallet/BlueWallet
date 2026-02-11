import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import TransactionDetails from '../../screen/transactions/TransactionDetails';

type MockStorage = {
  wallets: any[];
  txMetadata: Record<string, any>;
  counterpartyMetadata: Record<string, any>;
  fetchAndSaveWalletTransactions: jest.Mock;
  getTransactions: jest.Mock;
  saveToDisk: jest.Mock;
};

const mockFetchAndSaveWalletTransactions = jest.fn(() => Promise.resolve());
let mockStorageState: MockStorage = {
  wallets: [],
  txMetadata: {},
  counterpartyMetadata: {},
  fetchAndSaveWalletTransactions: mockFetchAndSaveWalletTransactions,
  getTransactions: jest.fn(() => Promise.resolve([])),
  saveToDisk: jest.fn(() => Promise.resolve()),
};

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => mockStorageState,
}));

let mockWalletSubscribe: any = null;

jest.mock('../../hooks/useWalletSubscribe', () => ({
  __esModule: true,
  default: () => mockWalletSubscribe,
}));

const routeParams = { hash: 'mock-tx', walletID: 'mock-wallet' };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({ params: routeParams }),
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(),
    }),
  };
});

jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({
    selectedBlockExplorer: { url: 'https://block.explorer' },
  }),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      alternativeTextColor2: '#fff',
      success: '#0f0',
      successCheck: '#0f0',
      feeText: '#888',
      lightButton: '#222',
      buttonTextColor: '#000',
      elevated: '#111',
      buttonDisabledBackgroundColor: '#333',
      background: '#000',
      lightBorder: '#333',
      customHeader: '#000',
    },
  }),
}));

jest.mock('../../BlueComponents', () => {
  const { Text, View } = require('react-native');
  return {
    BlueCard: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    BlueText: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('../../components/Button', () => 'Button');
jest.mock('../../components/HandOffComponent', () => 'HandOffComponent');
jest.mock('../../components/HeaderRightButton', () => 'HeaderRightButton');
jest.mock('../../components/BlueSpacing', () => ({
  BlueSpacing10: 'BlueSpacing10',
  BlueSpacing20: 'BlueSpacing20',
}));
jest.mock('../../components/BlueLoading', () => ({ BlueLoading: 'BlueLoading' }));
jest.mock('../../components/SafeArea', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../../components/SafeAreaScrollView', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

jest.mock('../../components/icons/TransactionIncomingIcon', () => 'TransactionIncomingIcon');
jest.mock('../../components/icons/TransactionOutgoingIcon', () => 'TransactionOutgoingIcon');
jest.mock('../../components/icons/TransactionPendingIcon', () => 'TransactionPendingIcon');

jest.mock('@rneui/themed', () => ({
  Icon: 'Icon',
}));

jest.mock('../../blue_modules/hapticFeedback', () => ({
  default: jest.fn(),
  HapticFeedbackTypes: {},
}));

const mockPrompt = jest.fn();
jest.mock('../../helpers/prompt', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPrompt(...args),
}));

jest.mock('../../blue_modules/BlueElectrum', () => ({
  multiGetTransactionByTxid: jest.fn((txids: string[]) =>
    Promise.resolve(
      Object.fromEntries(txids.map(txid => [txid, { hash: txid, value: 1200, confirmations: 1, vin: [], vout: [] }])),
    ),
  ),
  getMempoolTransactionsByAddress: jest.fn(() => Promise.resolve([])),
  estimateFees: jest.fn(() => Promise.resolve({ fast: 1, medium: 1, slow: 1 })),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    formatString: (template: string, params: Record<string, any>) => {
      return Object.entries(params).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), template);
    },
    transactions: {
      eta_10m: '10 minutes',
      eta_3h: '3 hours',
      eta_1d: '1 day',
      status_bump: 'Bump Fee',
      status_cancel: 'Cancel',
      details_title: 'Transaction Details',
      confirmations_lowercase: 'confirmations: {confirmations}',
      transaction_loading_error: 'loading error',
      transaction_not_available: 'not available',
      copy_link: 'copy link',
      to: 'to {counterparty}',
      from: 'from {counterparty}',
      details_to: 'To',
      details_from: 'From',
      txid: 'txid',
      details_received: 'received',
      details_inputs: 'inputs',
      details_outputs: 'outputs',
      details_view_in_browser: 'view in browser',
      details_note: 'Note',
      details_add_note: 'Add note',
    },
    send: {
      create_details: 'Details',
      create_fee: 'Fee',
      details_note_placeholder: 'Note to Self',
    },
    _: {
      ok: 'OK',
      cancel: 'Cancel',
    },
  },
  formatBalanceWithoutSuffix: (value: number | string) => String(value),
}));

const mockTxBase = {
  hash: 'mock-tx',
  value: 1200,
  fee: 10,
  counterparty: undefined,
};

const setup = (confirmations: number, lastFetch: number) => {
  let currentConfirmations = confirmations;
  let currentLastFetch = lastFetch;

  const walletMock = {
    getID: () => 'mock-wallet',
    getTransactions: jest.fn(() => [{ ...mockTxBase, confirmations: currentConfirmations }]),
    getLastTxFetch: jest.fn(() => currentLastFetch),
    allowRBF: jest.fn(() => false),
    preferredBalanceUnit: 'BTC',
  } as any;

  mockStorageState = {
    ...mockStorageState,
    wallets: [walletMock],
  };

  mockWalletSubscribe = walletMock;

  const view = render(<TransactionDetails />);

  const update = async (nextConfirmations: number, nextFetch: number) => {
    currentConfirmations = nextConfirmations;
    currentLastFetch = nextFetch;

    // Create a new proxy to simulate what useWalletSubscribe does when lastTxFetch changes
    mockWalletSubscribe = new Proxy(walletMock, {});

    mockStorageState = {
      ...mockStorageState,
      wallets: [walletMock],
    };
    view.rerender(<TransactionDetails />);
    await waitFor(() => {
      expect(walletMock.getTransactions).toHaveBeenCalled();
    });
    return view;
  };

  return { walletMock, view, update };
};

describe('TransactionStatus regression', () => {
  beforeEach(() => {
    mockStorageState = {
      wallets: [],
      txMetadata: {},
      counterpartyMetadata: {},
      fetchAndSaveWalletTransactions: mockFetchAndSaveWalletTransactions,
      getTransactions: jest.fn(() => Promise.resolve([])),
      saveToDisk: jest.fn(() => Promise.resolve()),
    };
    mockWalletSubscribe = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('re-fetches wallet transactions when lastTxFetch changes', async () => {
    const { view, update, walletMock } = setup(1, 1000);

    await waitFor(() => {
      expect(view.getByText('confirmations: 1')).toBeTruthy();
    });

    const initialCalls = walletMock.getTransactions.mock.calls.length;

    await update(4, 2000);

    await waitFor(() => {
      expect(walletMock.getTransactions).toHaveBeenCalledTimes(initialCalls + 1);
      expect(view.getByText('confirmations: 4')).toBeTruthy();
    });
  });

  it('when editing a note, passes current memo as default value in the input (not in alert message)', async () => {
    const existingMemo = 'My existing note';
    mockStorageState.txMetadata = { 'mock-tx': { memo: existingMemo } };
    const { view } = setup(1, 1000);

    await waitFor(
      () => {
        expect(view.getByText(existingMemo)).toBeTruthy();
      },
      { timeout: 3000 },
    );

    mockPrompt.mockResolvedValue(undefined);

    const noteText = view.getByText(existingMemo);
    fireEvent.press(noteText);

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledTimes(1);
    });

    // 7th argument is defaultInputValue: current memo should be in the input field, not in the message
    expect(mockPrompt).toHaveBeenCalledWith(
      'Note to Self',
      '', // message empty so content is not in alert body
      true,
      'plain-text',
      false,
      undefined,
      existingMemo, // defaultInputValue: pre-fill input for easy editing
    );
  });
});
