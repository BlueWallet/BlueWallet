import React from 'react';
import { render } from '@testing-library/react-native';

import { useWalletUtxoQuery } from '../../hooks/useWalletUtxos';
import type { WalletUtxoRow } from '../../blue_modules/realm/appDataRepository';

type MockResults = WalletUtxoRow[] & { sum: (property: keyof WalletUtxoRow) => number };

const makeResults = (memo: string): MockResults => {
  const rows = [
    {
      walletId: 'wallet-1',
      txid: 'tx-1',
      vout: 0,
      outpoint: 'tx-1:0',
      height: 1,
      value: 10_000,
      memo,
      frozen: false,
      payloadJson: JSON.stringify({ txid: 'tx-1', vout: 0, height: 1, value: 10_000, address: 'bc1qtest' }),
    } as WalletUtxoRow,
  ] as MockResults;
  rows.sum = property => rows.reduce((total, row) => total + Number(row[property] ?? 0), 0);
  return rows;
};

let mockRows = makeResults('');

jest.mock('../../blue_modules/realm/AppDataRealmProvider', () => ({
  useAppDataQuery: () => mockRows,
  useAppDataRealm: () => ({}),
}));

it('keeps projected Realm UTXOs stable until canonical row content changes', () => {
  const values: ReturnType<typeof useWalletUtxoQuery>['utxos'][] = [];
  const Consumer = ({ unrelated }: { unrelated: number }) => {
    values.push(useWalletUtxoQuery('wallet-1', { frozen: false }).utxos);
    return <>{unrelated < 0 ? 'unused' : null}</>;
  };

  const view = render(<Consumer unrelated={0} />);
  const first = values.at(-1);
  view.rerender(<Consumer unrelated={1} />);
  expect(values.at(-1)).toBe(first);

  mockRows = makeResults('Updated in Realm');
  view.rerender(<Consumer unrelated={2} />);
  expect(values.at(-1)).not.toBe(first);
  expect(values.at(-1)?.[0].memo).toBe('Updated in Realm');
});
