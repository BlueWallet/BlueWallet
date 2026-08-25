import React from 'react';
import { render } from '@testing-library/react-native';

import { useWalletTransaction, type WalletActivityTransaction } from '../../hooks/useWalletActivity';

let mockRows: Array<{ walletId: string; payloadJson: string }> = [];

jest.mock('../../blue_modules/realm/AppDataRealmProvider', () => ({
  useAppDataQuery: () => mockRows,
  useAppDataRealm: () => ({}),
}));

const wallet = {
  getID: () => 'wallet-1',
  getPreferredBalanceUnit: () => 'BTC',
} as any;

it('keeps an exact Realm transaction stable across unrelated renders', () => {
  mockRows = [{ walletId: 'wallet-1', payloadJson: JSON.stringify({ hash: 'tx-1', confirmations: 0, value: -1 }) }];
  const values: Array<WalletActivityTransaction | undefined> = [];

  const Consumer = ({ unrelated }: { unrelated: number }) => {
    values.push(useWalletTransaction(wallet, 'tx-1'));
    return <>{unrelated < 0 ? 'unused' : null}</>;
  };

  const view = render(<Consumer unrelated={0} />);
  const first = values.at(-1);
  view.rerender(<Consumer unrelated={1} />);

  expect(values.at(-1)).toBe(first);

  mockRows = [{ walletId: 'wallet-1', payloadJson: JSON.stringify({ hash: 'tx-1', confirmations: 1, value: -1 }) }];
  view.rerender(<Consumer unrelated={2} />);

  expect(values.at(-1)).not.toBe(first);
  expect(values.at(-1)?.confirmations).toBe(1);
});
