import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import Realm from 'realm';

import {
  APP_DATA_SCHEMA_VERSION,
  AppDataSchemas,
  replaceCanonicalData,
  replaceCanonicalWalletTransactions,
  setWalletUtxoMetadata,
} from '../../blue_modules/realm/appDataRepository';
import type { TWallet } from '../../class/wallets/types';
import { useWalletActivityPage, useWalletTransaction } from '../../hooks/useWalletActivity';
import { useWalletUtxoQuery } from '../../hooks/useWalletUtxos';

jest.unmock('realm');
jest.mock('../../blue_modules/realm/WalletDataRealmProvider', () => {
  const { createRealmContext } = jest.requireActual('@realm/react');
  const context = createRealmContext();
  return {
    useWalletDataQuery: context.useQuery,
    useWalletDataRealm: context.useRealm,
    TestRealmProvider: context.RealmProvider,
  };
});

const { TestRealmProvider } = jest.requireMock('../../blue_modules/realm/WalletDataRealmProvider');

it('uses one bounded Realm result with a look-ahead row for pagination', async () => {
  let transactions = [
    { hash: 'tx-3', txid: 'tx-3', timestamp: 3, confirmations: 0, value: -1 },
    { hash: 'tx-2', txid: 'tx-2', timestamp: 2, confirmations: 1, value: -1 },
    { hash: 'tx-1', txid: 'tx-1', timestamp: 1, confirmations: 1, value: -1 },
  ];
  const wallet = {
    type: 'test-wallet',
    _txs_by_external_index: { 0: transactions },
    _txs_by_internal_index: {},
    getID: () => 'wallet-page',
    getPreferredBalanceUnit: () => 'BTC',
    getTransactions: () => transactions,
    getUtxo: () => [],
    getUTXOMetadata: () => ({}),
  } as unknown as TWallet;
  const realm = await Realm.open({ inMemory: true, schema: AppDataSchemas, schemaVersion: APP_DATA_SCHEMA_VERSION });
  replaceCanonicalData(realm, [wallet], {}, {});

  const Consumer = () => {
    const page = useWalletActivityPage(wallet, '', 2);
    return <Text>{`${page.transactions.map(transaction => transaction.txid).join(',')}:${page.hasMore}`}</Text>;
  };

  const view = render(
    <TestRealmProvider realm={realm}>
      <Consumer />
    </TestRealmProvider>,
  );
  await waitFor(() => expect(view.getByText('tx-3,tx-2:true')).toBeTruthy());

  transactions = transactions.slice(0, 2);
  await act(async () => replaceCanonicalWalletTransactions(realm, [wallet], {}));
  await waitFor(() => expect(view.getByText('tx-3,tx-2:false')).toBeTruthy());

  view.unmount();
  realm.close();
  Realm.shutdown();
});

it('updates activity and UTXO hooks from live Realm writes', async () => {
  let transactions = [{ hash: 'tx-1', txid: 'tx-1', timestamp: 1, confirmations: 0, value: -1 }];
  const wallet = {
    type: 'test-wallet',
    _txs_by_external_index: {},
    _txs_by_internal_index: {},
    getID: () => 'wallet-1',
    getPreferredBalanceUnit: () => 'BTC',
    getTransactions: () => transactions,
    getUtxo: () => [{ txid: 'utxo-1', vout: 0, height: 1, value: 10_000, address: 'bc1qtest' }],
    getUTXOMetadata: () => ({}),
  } as unknown as TWallet;
  const realm = await Realm.open({ inMemory: true, schema: AppDataSchemas, schemaVersion: APP_DATA_SCHEMA_VERSION });
  replaceCanonicalData(realm, [wallet], {}, {});
  const activitySnapshots: unknown[] = [];

  const Consumer = ({ unrelated }: { unrelated: number }) => {
    const transaction = useWalletTransaction(wallet, 'tx-1');
    const utxos = useWalletUtxoQuery('wallet-1', { frozen: false });
    activitySnapshots.push(transaction);
    return <Text>{`${unrelated}:${transaction?.confirmations}:${utxos.count}:${utxos.totalValue}:${utxos.utxos[0]?.memo ?? ''}`}</Text>;
  };

  const view = render(
    <TestRealmProvider realm={realm}>
      <Consumer unrelated={0} />
    </TestRealmProvider>,
  );
  await waitFor(() => expect(view.getByText('0:0:1:10000:')).toBeTruthy());
  const initialTransaction = activitySnapshots.at(-1);

  view.rerender(
    <TestRealmProvider realm={realm}>
      <Consumer unrelated={1} />
    </TestRealmProvider>,
  );
  expect(activitySnapshots.at(-1)).toBe(initialTransaction);

  transactions = [{ ...transactions[0], confirmations: 2 }];
  await act(async () => {
    replaceCanonicalWalletTransactions(realm, [wallet], {});
    setWalletUtxoMetadata(realm, 'wallet-1', 'utxo-1', 0, { memo: 'Realm memo' });
  });

  await waitFor(() => expect(view.getByText('1:2:1:10000:Realm memo')).toBeTruthy());
  expect(activitySnapshots.at(-1)).not.toBe(initialTransaction);

  view.unmount();
  realm.close();
  Realm.shutdown();
});
