import React from 'react';
import { render } from '@testing-library/react-native';

import { TransactionListItem } from '../../components/TransactionListItem';
import { BitcoinUnit } from '../../models/bitcoinUnits';

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    txMetadata: undefined,
    counterpartyMetadata: undefined,
    wallets: [],
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({
    language: 'en',
    selectedBlockExplorer: { url: 'https://example.com' },
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      lightBorder: '#ddd',
      successColor: '#0a0',
      foregroundColor: '#000',
      alternativeTextColor: '#666',
    },
  }),
}));

jest.mock('../../components/TooltipMenu', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

jest.mock('../../components/ListItem', () => {
  const { View } = require('react-native');
  return ({ children, testID }: { children: React.ReactNode; testID?: string }) => <View testID={testID}>{children}</View>;
});

jest.mock('../../components/icons/TransactionExpiredIcon', () => () => null);
jest.mock('../../components/icons/TransactionIncomingIcon', () => () => null);
jest.mock('../../components/icons/TransactionOffchainIcon', () => () => null);
jest.mock('../../components/icons/TransactionOffchainIncomingIcon', () => () => null);
jest.mock('../../components/icons/TransactionOnchainIcon', () => () => null);
jest.mock('../../components/icons/TransactionOutgoingIcon', () => () => null);
jest.mock('../../components/icons/TransactionPendingIcon', () => () => null);

describe('TransactionListItem', () => {
  it('renders while transaction metadata is unavailable', () => {
    const { getByTestId } = render(
      <TransactionListItem
        walletID="wallet-id"
        itemPriceUnit={BitcoinUnit.SATS}
        item={
          {
            hash: 'transaction-id',
            walletID: 'wallet-id',
            timestamp: 1_700_000_000,
            value: 1_000,
            confirmations: 1,
            type: 'bitcoind_tx',
          } as any
        }
      />,
    );

    expect(getByTestId('TransactionListItem')).toBeTruthy();
  });
});
