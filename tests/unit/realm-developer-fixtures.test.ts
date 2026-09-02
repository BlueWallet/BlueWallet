import Realm from 'realm';

import { insertDeveloperIncomingTransaction, removeDeveloperTransactions } from '../../blue_modules/realm/developerFixtures';
import { activityRowToTransaction, queryWalletActivity, readMetadata } from '../../blue_modules/realm/appDataRepository';

const RealmMock = Realm as typeof Realm & {
  __mockRealmHelpers: { reset: () => void };
};

beforeEach(() => RealmMock.__mockRealmHelpers.reset());

it('inserts pending and confirmed incoming transactions into canonical Realm and removes them', async () => {
  const realm = await Realm.open({ path: 'developer-fixtures.realm' });
  const pendingId = insertDeveloperIncomingTransaction(realm, 'wallet-1', 'pending', 'bc1qdeveloper');
  const confirmedId = insertDeveloperIncomingTransaction(realm, 'wallet-1', 'confirmed', 'bc1qdeveloper');

  const pendingRows = queryWalletActivity(realm, 'wallet-1', { pending: true });
  const confirmedRows = queryWalletActivity(realm, 'wallet-1', { confirmed: true });
  const pending = pendingRows.slice(0, 1)[0];
  const confirmed = confirmedRows.slice(0, 1)[0];
  expect(pendingRows.length).toBe(1);
  expect(confirmedRows.length).toBe(1);
  expect(pending.transactionId).toBe(pendingId);
  expect(confirmed.transactionId).toBe(confirmedId);
  expect(activityRowToTransaction(pending).value).toBe(25_000);
  expect(activityRowToTransaction(confirmed).value).toBe(75_000);
  expect(readMetadata(realm).txMetadata[pendingId]?.memo).toContain('pending');

  expect(removeDeveloperTransactions(realm)).toBe(2);
  expect(queryWalletActivity(realm, 'wallet-1').length).toBe(0);
  expect(readMetadata(realm).txMetadata[pendingId]).toBeUndefined();
  expect(readMetadata(realm).txMetadata[confirmedId]).toBeUndefined();
});
