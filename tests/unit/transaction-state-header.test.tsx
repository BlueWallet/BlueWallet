import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionStateHeader from '../../components/TransactionStateHeader';

jest.mock('../../components/icons/TransactionIncomingIcon', () => 'TransactionIncomingIcon');
jest.mock('../../components/icons/TransactionOutgoingIcon', () => 'TransactionOutgoingIcon');
jest.mock('../../components/Icon', () => 'Icon');
jest.mock('../../components/BlueText', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    formatString: (template: string, params: Record<string, string | number>) =>
      Object.entries(params).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), template),
    transactions: {
      details_received: 'received',
      details_sent: 'sent',
      confirmations_lowercase: 'confirmations: {confirmations}',
    },
  },
}));

describe('TransactionStateHeader', () => {
  const baseProps = {
    direction: 'received' as const,
    confirmations: 3,
    isOnChainTx: true,
    labelStyle: {},
    valueStyle: {},
    accentColor: '#1e8a6a',
  };

  it('does not render confirmations line for non-finite confirmations', () => {
    const { queryByText } = render(<TransactionStateHeader {...baseProps} confirmations={Number.NaN} />);
    expect(queryByText(/confirmations/)).toBeNull();
  });

  it('does not render confirmations line for zero confirmations', () => {
    const { queryByText } = render(<TransactionStateHeader {...baseProps} confirmations={0} />);
    expect(queryByText(/confirmations/)).toBeNull();
  });
});
