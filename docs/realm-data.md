# Realm transaction data

Realm is the application source of truth for transaction records, transaction metadata, UTXOs, UTXO metadata, and counterparty metadata. Wallet secrets and wallet configuration remain in the encrypted storage bucket.

UTXO Realm payloads contain public outpoint data only. WIFs and other signing secrets must never be serialized into app-data Realm; signing code derives required keys from the wallet only for the duration of transaction construction. Schema v7 scrubs legacy UTXO payloads on open. After seeding a password-specific bucket, storage encryption clears every object from the previous known-key Realm before deleting it, verifies deletion, and reports failure if the file remains.

The implementation targets Realm JS 20.x. `BlueApp` owns one open app-data Realm per encrypted bucket and reuses the same open promise for concurrent callers. React receives that exact instance through `RealmProvider`; `useQuery` owns live-result subscriptions, and consumers must not open or close another app-data Realm.

## Data flow

1. Wallet implementations fetch data into their operational in-memory structures.
2. `BlueApp.saveToDisk()` builds canonical rows and commits activity, raw transaction rows, and UTXOs in one Realm write transaction. Existing Realm metadata collections are preserved.
3. The wallet configuration is saved only after the Realm commit succeeds. Raw on-chain/LNDHub transactions, UTXOs, and their metadata are stripped from that configuration.
4. On startup, wallet transaction structures, UTXOs, and metadata are hydrated from Realm. The old cache Realm and legacy bucket metadata are read only for a first-run migration; new bucket writes do not duplicate metadata.

Ark's SDK Realm remains responsible for Ark protocol state such as VTXOs, contracts, and swaps. The app-data Realm is the canonical application-facing transaction index across every wallet type.

## Reading in React

Use `useWalletActivityPage` rather than calling `wallet.getTransactions()` or slicing a transaction array in a screen:

```tsx
const [limit, setLimit] = useState(20);
const { transactions, hasMore } = useWalletActivityPage(wallet, search, limit);

const loadMore = () => {
  if (hasMore) setLimit(current => current + 20);
};
```

The hook creates live Realm `Results` scoped by `walletId`, applies search and sorting in Realm, materializes the requested window directly from that collection, and reports `hasMore` from the Realm result count. `@realm/react` rerenders the hook when those live results change, so screens should not add collection listeners or a separate initial read.

For the combined home-screen feed, use `useWalletActivityFeed()`. It issues one globally sorted Realm query across visible wallet IDs and applies the result limit before materialization. Do not merge, sort, or slice per-wallet transaction arrays in the screen.

Use `useWalletTransaction(wallet, transactionId)` for an exact transaction lookup and `useWalletActivitySummary(wallet)` for latest/pending wallet-card state. Both apply their filters in Realm; do not load a wallet activity array and call `find()`, `filter()`, or `some()` in the component.

Use `useWalletUtxos(walletId, { sortType, sortDirection, frozen, txid, vout, outpoints })` for coin lists and spend preparation. It performs Realm filtering and sorting for frozen status, exact outputs, selected outpoints, height, label, or value and updates automatically after a canonical save.

Wallet configuration and secrets can be selected with `useWallet(walletId)`. Do not manufacture wallet identity changes with a `Proxy` to observe transactions; subscribe to the relevant Realm activity or UTXO hook instead.

## Writing

Write transaction memos and counterparty metadata with the storage context's `setTransactionMemo()` and `setCounterpartyMetadata()` functions. Write UTXO memo/frozen state with `useWalletUtxoMutations()`. These functions execute Realm write transactions; screens must not mutate metadata maps or wallet UTXO metadata directly.

Fetched transaction snapshots are replaced through `BlueApp.saveToDisk()`, while metadata remains independently Realm-owned. This provides these guarantees:

- transaction rows and their searchable projection cannot diverge;
- memo changes update both metadata and transaction search atomically;
- deleted wallets and stale transactions are removed in the same commit;
- Realm write failures prevent a newer wallet configuration from being persisted without its data.

Use Realm query arguments (`walletId == $0`) rather than interpolating values into query strings. Add indexed columns only for fields frequently used in selective equality queries; keep the complete transaction in `payloadJson` so wallet-specific fields remain available without expanding the schema for every wallet implementation.

## Realm API references

- [Realm JS `Results`](https://github.com/realm/realm-js/blob/main/packages/realm/src/Results.ts) documents that query results are live collections.
- [Realm JS `Collection`](https://github.com/realm/realm-js/blob/main/packages/realm/src/Collection.ts) documents listener registration, initial notification, and removal.
- [Realm JS `Realm`](https://github.com/realm/realm-js/blob/main/packages/realm/src/Realm.ts) documents opening, closing, and write-transaction behavior.
