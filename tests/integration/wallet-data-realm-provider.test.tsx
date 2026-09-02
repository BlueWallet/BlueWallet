import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import Realm from 'realm';
import { tmpdir } from 'os';

import {
  APP_DATA_SCHEMA_VERSION,
  AppDataSchemas,
  type TransactionMetadataRow,
  type WalletOrderRow,
} from '../../blue_modules/realm/appDataRepository';

jest.unmock('realm');

let mockRealmListener: ((realm: Realm | undefined) => void) | undefined;
const mockBlueApp = {
  getWalletDataRealmForProvider: jest.fn<Promise<Realm>, []>(),
  releaseAppDataRealm: jest.fn((realm: Realm) => realm.close()),
  subscribeToAppDataRealm: jest.fn((listener: (realm: Realm | undefined) => void) => {
    mockRealmListener = listener;
    return () => {
      mockRealmListener = undefined;
    };
  }),
};

jest.mock('../../class/blue-app', () => ({
  BlueApp: { getInstance: () => mockBlueApp },
}));

const { WalletDataRealmProvider, useWalletDataQuery, useWalletDataObject, useWalletDataRealm } =
  require('../../blue_modules/realm/WalletDataRealmProvider') as typeof import('../../blue_modules/realm/WalletDataRealmProvider');

it('switches live queries without remounting their consumers', async () => {
  const suffix = `${Date.now()}-${Math.random()}`;
  const firstRealm = await Realm.open({
    inMemory: true,
    path: `${tmpdir()}/wallet-data-provider-first-${suffix}.realm`,
    schema: AppDataSchemas,
    schemaVersion: APP_DATA_SCHEMA_VERSION,
  });
  const secondRealm = await Realm.open({
    inMemory: true,
    path: `${tmpdir()}/wallet-data-provider-second-${suffix}.realm`,
    schema: AppDataSchemas,
    schemaVersion: APP_DATA_SCHEMA_VERSION,
  });
  firstRealm.write(() => {
    firstRealm.create('WalletOrder', { walletId: 'first', position: 0 });
    firstRealm.create('TransactionMetadata', { txid: 'shared', memo: 'first memo' });
  });
  secondRealm.write(() => {
    secondRealm.create('WalletOrder', { walletId: 'second', position: 0 });
    secondRealm.create('TransactionMetadata', { txid: 'shared', memo: 'second memo' });
  });
  mockBlueApp.getWalletDataRealmForProvider.mockResolvedValue(firstRealm);

  let mounts = 0;
  const Consumer = () => {
    const [mount] = React.useState(() => ++mounts);
    const currentRealm = useWalletDataRealm();
    const rows = useWalletDataQuery<WalletOrderRow>('WalletOrder');
    const metadata = useWalletDataObject<TransactionMetadataRow>('TransactionMetadata', 'shared');
    return <Text>{`${mount}:${currentRealm.path}:${rows[0]?.walletId ?? 'empty'}:${metadata?.memo ?? 'empty'}`}</Text>;
  };

  const view = render(
    <WalletDataRealmProvider>
      <Consumer />
    </WalletDataRealmProvider>,
  );

  await act(async () => mockRealmListener?.(firstRealm));
  await waitFor(() => expect(view.getByText(`1:${firstRealm.path}:first:first memo`)).toBeTruthy());

  await act(async () => mockRealmListener?.(secondRealm));
  await waitFor(() => expect(view.getByText(`1:${secondRealm.path}:second:second memo`)).toBeTruthy());
  expect(mounts).toBe(1);
  expect(mockBlueApp.releaseAppDataRealm).toHaveBeenCalledWith(firstRealm);
  expect(firstRealm.isClosed).toBe(true);

  view.unmount();
  secondRealm.close();
  Realm.shutdown();
});
