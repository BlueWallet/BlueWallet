import Realm from 'realm';

import type { TCounterpartyMetadata, TTXMetadata } from '../../class/blue-app';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import type { CreateTransactionUtxo, LightningTransaction, Transaction, TWallet, Utxo } from '../../class/wallets/types';

export const APP_DATA_SCHEMA_VERSION = 7;
export const APP_DATA_INITIALIZED_KEY = 'canonical-data-v1';
export const APP_UTXO_INITIALIZED_KEY = 'canonical-utxo-v1';

export const AppDataSchemas: Realm.ObjectSchema[] = [
  {
    name: 'WalletActivity',
    properties: {
      walletId: { type: 'string', indexed: true },
      transactionId: { type: 'string', indexed: true },
      paymentRequest: { type: 'string', indexed: true },
      timestamp: 'int',
      confirmations: 'int?',
      pending: 'bool',
      searchText: 'string',
      payloadJson: 'string',
    },
  },
  {
    name: 'WalletTransaction',
    properties: {
      walletId: { type: 'string', indexed: true },
      collection: 'string',
      index: 'int?',
      ordinal: 'int',
      payloadJson: 'string',
    },
  },
  {
    name: 'WalletUtxo',
    properties: {
      walletId: { type: 'string', indexed: true },
      txid: 'string',
      vout: 'int',
      outpoint: { type: 'string', indexed: true },
      height: 'int',
      value: 'double',
      memo: 'string',
      frozen: 'bool',
      payloadJson: 'string',
    },
  },
  {
    name: 'TransactionMetadata',
    primaryKey: 'txid',
    properties: {
      txid: 'string',
      memo: 'string?',
    },
  },
  {
    name: 'CounterpartyMetadata',
    primaryKey: 'counterparty',
    properties: {
      counterparty: 'string',
      label: 'string',
      hidden: 'bool',
    },
  },
  {
    name: 'AppDataState',
    primaryKey: 'key',
    properties: {
      key: 'string',
    },
  },
];

export interface WalletActivityRow extends Realm.Object<WalletActivityRow> {
  walletId: string;
  transactionId: string;
  paymentRequest: string;
  timestamp: number;
  confirmations: number | null;
  pending: boolean;
  searchText: string;
  payloadJson: string;
}

export interface WalletUtxoRow extends Realm.Object<WalletUtxoRow> {
  walletId: string;
  txid: string;
  vout: number;
  outpoint: string;
  height: number;
  value: number;
  memo: string;
  frozen: boolean;
  payloadJson: string;
}

export interface WalletTransactionRow extends Realm.Object<WalletTransactionRow> {
  walletId: string;
  collection: string;
  index: number | null;
  ordinal: number;
  payloadJson: string;
}

export interface TransactionMetadataRow extends Realm.Object<TransactionMetadataRow> {
  txid: string;
  memo: string | null;
}

export interface CounterpartyMetadataRow extends Realm.Object<CounterpartyMetadataRow> {
  counterparty: string;
  label: string;
  hidden: boolean;
}

export type RealmUtxo = Utxo & { memo?: string; frozen: boolean };

interface AppDataStateRow extends Realm.Object<AppDataStateRow> {
  key: string;
}

type ActivityTransaction = Transaction & LightningTransaction;

const transactionId = (transaction: ActivityTransaction): string => {
  const paymentHash =
    typeof transaction.payment_hash === 'string' ? transaction.payment_hash : JSON.stringify(transaction.payment_hash ?? '');
  return transaction.hash || transaction.txid || paymentHash || transaction.payment_request || '';
};

const activitySearchText = (transaction: ActivityTransaction, logicalId: string, memo: string): string =>
  [
    logicalId,
    transaction.hash,
    transaction.txid,
    transaction.payment_hash,
    transaction.payment_request,
    memo,
    transaction.description,
    transaction.value,
  ]
    .map(value => (typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')))
    .join('\n')
    .toLowerCase();

const createActivityRows = (wallets: TWallet[], metadata: TTXMetadata) => {
  const rows: Array<Record<string, unknown>> = [];
  for (const wallet of wallets) {
    const walletId = wallet.getID();
    let transactions: ActivityTransaction[];
    try {
      transactions = wallet.getTransactions();
    } catch (error) {
      console.warn(`[AppDataRealm] Could not project transactions for ${walletId}:`, error);
      continue;
    }

    for (const transaction of transactions) {
      const logicalId = transactionId(transaction) || `${transaction.timestamp}:${transaction.type ?? ''}:${transaction.value ?? ''}`;
      const memo = metadata[logicalId]?.memo ?? transaction.memo ?? transaction.description ?? '';

      rows.push({
        walletId,
        transactionId: logicalId,
        paymentRequest: transaction.payment_request ?? '',
        timestamp: Math.trunc(transaction.timestamp || transaction.time || 0),
        confirmations: typeof transaction.confirmations === 'number' ? Math.trunc(transaction.confirmations) : null,
        pending:
          typeof transaction.ispaid === 'boolean'
            ? transaction.ispaid === false && !transaction.failed
            : typeof transaction.confirmations === 'number' && transaction.confirmations === 0,
        searchText: activitySearchText(transaction, logicalId, memo),
        payloadJson: JSON.stringify(transaction),
      });
    }
  }
  return rows;
};

const createRawTransactionRows = (wallets: TWallet[]) => {
  const rows: Array<Record<string, unknown>> = [];
  const add = (walletId: string, collection: string, transactions: unknown[], index?: number) => {
    transactions.forEach((transaction, ordinal) => {
      rows.push({
        walletId,
        collection,
        index,
        ordinal,
        payloadJson: JSON.stringify(transaction),
      });
    });
  };

  for (const wallet of wallets) {
    const walletId = wallet.getID();
    const transactionWallet = ('_hdWalletInstance' in wallet && wallet._hdWalletInstance) || wallet;
    for (const [index, transactions] of Object.entries(transactionWallet._txs_by_external_index ?? {})) {
      add(walletId, 'external', transactions, Number(index));
    }
    for (const [index, transactions] of Object.entries(transactionWallet._txs_by_internal_index ?? {})) {
      add(walletId, 'internal', transactions, Number(index));
    }

    if (wallet.type === LightningCustodianWallet.type) {
      const lightningWallet = wallet as LightningCustodianWallet;
      add(walletId, 'lightningPending', lightningWallet.pending_transactions_raw);
      add(walletId, 'lightningTransactions', lightningWallet.transactions_raw);
      add(walletId, 'lightningInvoices', lightningWallet.user_invoices_raw);
    }
  }
  return rows;
};

const createUtxoRows = (wallets: TWallet[]) => {
  const rows: Array<Record<string, unknown>> = [];
  for (const wallet of wallets) {
    try {
      const walletId = wallet.getID();
      for (const utxo of wallet.getUtxo(true)) {
        const metadata = wallet.getUTXOMetadata(utxo.txid, utxo.vout);
        const publicUtxo = { ...utxo };
        delete publicUtxo.wif;
        rows.push({
          walletId,
          txid: utxo.txid,
          vout: utxo.vout,
          outpoint: `${utxo.txid}:${utxo.vout}`,
          height: utxo.height ?? 0,
          value: utxo.value,
          memo: metadata.memo ?? '',
          frozen: Boolean(metadata.frozen),
          payloadJson: JSON.stringify(publicUtxo),
        });
      }
    } catch {
      // Wallet types without on-chain outputs have nothing to persist here.
    }
  }
  return rows;
};

export function isAppDataInitialized(realm: Realm): boolean {
  return Boolean(realm.objectForPrimaryKey<AppDataStateRow>('AppDataState', APP_DATA_INITIALIZED_KEY));
}

export function isUtxoDataInitialized(realm: Realm): boolean {
  return Boolean(realm.objectForPrimaryKey<AppDataStateRow>('AppDataState', APP_UTXO_INITIALIZED_KEY));
}

export function readMetadata(realm: Realm): {
  txMetadata: TTXMetadata;
  counterpartyMetadata: TCounterpartyMetadata;
} {
  const txMetadata: TTXMetadata = {};
  for (const row of realm.objects<{ txid: string; memo: string | null }>('TransactionMetadata')) {
    txMetadata[row.txid] = row.memo === null ? {} : { memo: row.memo };
  }

  const counterpartyMetadata: TCounterpartyMetadata = {};
  for (const row of realm.objects<{
    counterparty: string;
    label: string;
    hidden: boolean;
  }>('CounterpartyMetadata')) {
    counterpartyMetadata[row.counterparty] = {
      label: row.label,
      ...(row.hidden ? { hidden: true } : {}),
    };
  }
  return { txMetadata, counterpartyMetadata };
}

export const queryTransactionMetadata = (realm: Realm): Realm.Results<TransactionMetadataRow> =>
  realm.objects<TransactionMetadataRow>('TransactionMetadata').sorted('txid');

export const queryCounterpartyMetadata = (realm: Realm): Realm.Results<CounterpartyMetadataRow> =>
  realm.objects<CounterpartyMetadataRow>('CounterpartyMetadata').sorted('counterparty');

export function setTransactionMemo(realm: Realm, txid: string, memo: string): void {
  realm.write(() => {
    realm.create('TransactionMetadata', { txid, memo }, Realm.UpdateMode.Modified);
    const activityRows = realm.objects<WalletActivityRow>('WalletActivity').filtered('transactionId == $0', txid);
    for (const row of activityRows) {
      const transaction = JSON.parse(row.payloadJson) as ActivityTransaction;
      row.searchText = activitySearchText(transaction, row.transactionId, memo);
    }
  });
}

export function setCounterpartyMetadata(realm: Realm, counterparty: string, metadata: TCounterpartyMetadata[string]): void {
  realm.write(() => {
    realm.create(
      'CounterpartyMetadata',
      { counterparty, label: metadata.label, hidden: Boolean(metadata.hidden) },
      Realm.UpdateMode.Modified,
    );
  });
}

/** Builds the canonical, live activity query shared by hooks and background consumers. */
export type WalletActivityQuery = {
  search?: string;
  transactionId?: string;
  pending?: boolean;
  confirmed?: boolean;
};

export function filterWalletActivity(
  collection: Realm.Results<WalletActivityRow>,
  walletId: string,
  { search = '', transactionId: requestedTransactionId, pending, confirmed }: WalletActivityQuery = {},
): Realm.Results<WalletActivityRow> {
  let results = collection.filtered('walletId == $0', walletId);
  if (requestedTransactionId) results = results.filtered('transactionId == $0', requestedTransactionId);
  if (pending !== undefined) results = results.filtered('pending == $0', pending);
  if (confirmed) results = results.filtered('confirmations > $0', 0);
  const normalizedSearch = search.trim().toLowerCase();
  if (normalizedSearch) results = results.filtered('searchText CONTAINS $0', normalizedSearch);
  return results.sorted([
    ['timestamp', true],
    ['transactionId', false],
  ]);
}

export function queryWalletActivity(realm: Realm, walletId: string, options: WalletActivityQuery = {}): Realm.Results<WalletActivityRow> {
  return filterWalletActivity(realm.objects<WalletActivityRow>('WalletActivity'), walletId, options);
}

/** Builds one globally sorted live query across the requested wallet IDs. */
export function filterWalletActivityForWallets(
  collection: Realm.Results<WalletActivityRow>,
  walletIds: string[],
  search = '',
): Realm.Results<WalletActivityRow> {
  let results = collection;
  if (walletIds.length === 0) {
    results = results.filtered('walletId == $0', '');
  } else {
    const parameters = walletIds.map((_, index) => `$${index}`).join(', ');
    results = results.filtered(`walletId IN {${parameters}}`, ...walletIds);
  }
  const normalizedSearch = search.trim().toLowerCase();
  if (normalizedSearch) results = results.filtered('searchText CONTAINS $0', normalizedSearch);
  return results.sorted([
    ['timestamp', true],
    ['transactionId', false],
  ]);
}

export function queryWalletActivityForWallets(realm: Realm, walletIds: string[], search = ''): Realm.Results<WalletActivityRow> {
  return filterWalletActivityForWallets(realm.objects<WalletActivityRow>('WalletActivity'), walletIds, search);
}

export function queryWalletActivityByPaymentRequest(
  realm: Realm,
  walletIds: string[],
  paymentRequest: string,
): Realm.Results<WalletActivityRow> {
  if (walletIds.length === 0 || !paymentRequest) {
    return realm.objects<WalletActivityRow>('WalletActivity').filtered('walletId == $0', '');
  }
  const parameters = walletIds.map((_, index) => `$${index + 1}`).join(', ');
  return realm
    .objects<WalletActivityRow>('WalletActivity')
    .filtered(`paymentRequest == $0 AND walletId IN {${parameters}}`, paymentRequest, ...walletIds);
}

export function filterWalletUtxos(
  collection: Realm.Results<WalletUtxoRow>,
  walletId: string,
  {
    sortType = 'height',
    sortDirection = 'asc',
    frozen,
    txid,
    vout,
    outpoints,
  }: {
    sortType?: 'height' | 'label' | 'value' | 'frozen';
    sortDirection?: 'asc' | 'desc';
    frozen?: boolean;
    txid?: string;
    vout?: number;
    outpoints?: string[];
  } = {},
): Realm.Results<WalletUtxoRow> {
  const descending = sortDirection === 'desc';
  const primarySort = sortType === 'label' ? 'memo' : sortType;
  const primaryDescending = sortType === 'frozen' ? !descending : descending;
  let results = collection.filtered('walletId == $0', walletId);
  if (frozen !== undefined) results = results.filtered('frozen == $0', frozen);
  if (txid) results = results.filtered('txid == $0', txid);
  if (vout !== undefined) results = results.filtered('vout == $0', vout);
  if (outpoints) {
    if (outpoints.length === 0) {
      results = results.filtered('outpoint == $0', '');
    } else {
      const parameters = outpoints.map((_, index) => `$${index}`).join(', ');
      results = results.filtered(`outpoint IN {${parameters}}`, ...outpoints);
    }
  }
  return results.sorted([
    [primarySort, primaryDescending],
    ['txid', descending],
    ['vout', descending],
  ]);
}

export function queryWalletUtxos(
  realm: Realm,
  walletId: string,
  options: Parameters<typeof filterWalletUtxos>[2] = {},
): Realm.Results<WalletUtxoRow> {
  return filterWalletUtxos(realm.objects<WalletUtxoRow>('WalletUtxo'), walletId, options);
}

export const queryWalletTransactions = (realm: Realm, walletId: string): Realm.Results<WalletTransactionRow> =>
  realm.objects<WalletTransactionRow>('WalletTransaction').filtered('walletId == $0', walletId);

export function setWalletUtxoMetadata(
  realm: Realm,
  walletId: string,
  txid: string,
  vout: number,
  metadata: { memo?: string; frozen?: boolean },
): void {
  realm.write(() => {
    const rows = realm.objects<WalletUtxoRow>('WalletUtxo').filtered('walletId == $0 AND txid == $1 AND vout == $2', walletId, txid, vout);
    for (const row of rows) {
      if (metadata.memo !== undefined) row.memo = metadata.memo;
      if (metadata.frozen !== undefined) row.frozen = metadata.frozen;
    }
  });
}

export function setWalletFrozenOutpoints(realm: Realm, walletId: string, frozenOutpoints: ReadonlySet<string>): void {
  realm.write(() => {
    const rows = realm.objects<WalletUtxoRow>('WalletUtxo').filtered('walletId == $0', walletId);
    for (const row of rows) row.frozen = frozenOutpoints.has(row.outpoint);
  });
}

/** Removes signing secrets written by app-data schema versions before v7. */
export function scrubWalletUtxoSecrets(realm: Realm): void {
  const replacements: Array<{ row: WalletUtxoRow; payloadJson: string }> = [];
  for (const row of realm.objects<WalletUtxoRow>('WalletUtxo')) {
    try {
      const payload = JSON.parse(row.payloadJson) as Utxo;
      if (!Object.prototype.hasOwnProperty.call(payload, 'wif')) continue;
      const publicUtxo = { ...payload };
      delete publicUtxo.wif;
      replacements.push({ row, payloadJson: JSON.stringify(publicUtxo) });
    } catch {
      // Invalid payloads are handled by readers and contain no usable structured WIF.
    }
  }
  if (replacements.length === 0) return;
  realm.write(() => {
    for (const replacement of replacements) replacement.row.payloadJson = replacement.payloadJson;
  });
}

export function replaceCanonicalData(
  realm: Realm,
  wallets: TWallet[],
  txMetadata: TTXMetadata,
  counterpartyMetadata: TCounterpartyMetadata,
): void {
  const activityRows = createActivityRows(wallets, txMetadata);
  const rawRows = createRawTransactionRows(wallets);
  const utxoRows = createUtxoRows(wallets);

  realm.write(() => {
    realm.deleteAll();

    for (const row of activityRows) realm.create('WalletActivity', row);
    for (const row of rawRows) realm.create('WalletTransaction', row);
    for (const row of utxoRows) realm.create('WalletUtxo', row);
    for (const [txid, entry] of Object.entries(txMetadata)) {
      realm.create('TransactionMetadata', { txid, memo: entry.memo ?? null });
    }
    for (const [counterparty, entry] of Object.entries(counterpartyMetadata)) {
      realm.create('CounterpartyMetadata', {
        counterparty,
        label: entry.label,
        hidden: Boolean(entry.hidden),
      });
    }
    realm.create('AppDataState', { key: APP_DATA_INITIALIZED_KEY });
    realm.create('AppDataState', { key: APP_UTXO_INITIALIZED_KEY });
  });
}

/** Replaces fetched wallet-owned rows without touching Realm-owned metadata collections. */
export function replaceCanonicalWalletData(realm: Realm, wallets: TWallet[], txMetadata: TTXMetadata): void {
  const activityRows = createActivityRows(wallets, txMetadata);
  const rawRows = createRawTransactionRows(wallets);
  const utxoRows = createUtxoRows(wallets);

  realm.write(() => {
    realm.delete(realm.objects('WalletActivity'));
    realm.delete(realm.objects('WalletTransaction'));
    realm.delete(realm.objects('WalletUtxo'));

    for (const row of activityRows) realm.create('WalletActivity', row);
    for (const row of rawRows) realm.create('WalletTransaction', row);
    for (const row of utxoRows) realm.create('WalletUtxo', row);
    realm.create('AppDataState', { key: APP_DATA_INITIALIZED_KEY }, Realm.UpdateMode.Modified);
    realm.create('AppDataState', { key: APP_UTXO_INITIALIZED_KEY }, Realm.UpdateMode.Modified);
  });
}

export function activityRowToTransaction(row: WalletActivityRow): ActivityTransaction {
  return JSON.parse(row.payloadJson) as ActivityTransaction;
}

export function utxoRowToUtxo(row: WalletUtxoRow): RealmUtxo {
  return {
    ...(JSON.parse(row.payloadJson) as Utxo),
    memo: row.memo || undefined,
    frozen: row.frozen,
  };
}

export function utxoToCreateTransactionInput(
  input: RealmUtxo | (CreateTransactionUtxo & { address?: string; memo?: string; frozen?: boolean; wif?: string | false }),
  wallet?: TWallet,
): CreateTransactionUtxo {
  const utxo = { ...input };
  delete utxo.memo;
  delete utxo.frozen;
  delete utxo.wif;
  const signingWallet = wallet && '_hdWalletInstance' in wallet && wallet._hdWalletInstance ? wallet._hdWalletInstance : wallet;
  const getWif = signingWallet && '_getWifForAddress' in signingWallet ? signingWallet._getWifForAddress.bind(signingWallet) : undefined;
  const wif = getWif && utxo.address ? getWif(utxo.address) : undefined;
  return { ...utxo, ...(wif ? { wif } : {}) } as CreateTransactionUtxo;
}
