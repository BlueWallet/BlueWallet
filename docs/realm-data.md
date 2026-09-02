# Realm transaction data

Realm is the application source of truth for transaction records, transaction metadata, UTXOs, UTXO metadata, and counterparty metadata. Wallet secrets and wallet configuration remain in the encrypted storage bucket.
Wallet display order is non-secret application metadata stored in Realm. Dragging a wallet updates `WalletOrder` positions in one write transaction; the storage context maps secure wallet objects onto that live order without rewriting or cloning the wallet array.

UTXO Realm payloads contain public outpoint data only. WIFs and other signing secrets must never be serialized into app-data Realm; signing code derives required keys from the wallet only for the duration of transaction construction. Schema v7 scrubs legacy UTXO payloads on open. App-data files live under the app-private Library directory, not the user-shareable Documents directory. Existing Documents files and migrated cache Realms are scrubbed and deleted after a successful copy.

Bucket changes are serialized with wallet saves. Encryption and decryption publish the destination Realm before scrubbing and deleting the source Realm. Creating plausible-deniability storage publishes a brand-new empty decoy Realm and waits for mounted hooks to switch before it returns, so a subsequent wallet reset cannot write wallet order into the hidden vault and stale fetches cannot persist hidden history into the decoy. While encrypted storage is locked, every public app-data access—including `RealmProvider`—receives an in-memory empty Realm; the known-key durable Realm is never opened before a bucket is unlocked.

The implementation targets Realm JS 20.x. `BlueApp` owns one open app-data Realm per encrypted bucket and reuses the same open promise for concurrent callers. React receives that exact instance through `RealmProvider`; `useQuery` owns live-result subscriptions, and consumers must not open or close another app-data Realm.

## Data flow

1. Wallet implementations fetch data into temporary operational structures.
2. Transaction and UTXO fetch methods replace only that wallet's corresponding Realm rows. Ordinary `saveToDisk()` calls persist wallet configuration without rebuilding canonical data from memory.
3. Raw on-chain/LNDHub transactions, UTXOs, and their metadata are stripped from the wallet configuration.
   `WalletActivity` stores the single canonical transaction payload. `WalletTransaction` stores only address-chain, index, and ordinal markers for the address browser; it does not duplicate transaction JSON.
4. On startup, wallet configuration is reconstructed from the encrypted bucket while transactions, UTXOs, and metadata remain in Realm. The old cache Realm and legacy bucket metadata are read only for a first-run migration.

Activity hooks pass search, pending/confirmed filters, ordering, and page bounds to Realm. Home feeds and carousel summaries use Realm's native `LIMIT` descriptor; JavaScript only maps the bounded managed rows into the existing view-model shape. Metadata is read and mutated by `WalletDataRealmProvider` hooks at the consuming component instead of being copied through `WalletStorageProvider`.

Coin control queries sorting, frozen status, selected outpoints, and selected value directly from Realm. Mass freeze/unfreeze writes only the selected outpoints with a Realm `IN` predicate; React owns only the transient selection itself.
UTXO refresh preserves memo and frozen values from existing Realm rows; it never restores stale metadata from the wallet object's legacy cache.

The send flow also derives selected, spendable, and frozen UTXO values with live Realm queries and native `sum()` aggregates. It no longer mirrors UTXO refreshes through a dummy React state toggle.

Wallet discovery candidates remain temporary wallet-engine objects because rejected candidates must never enter canonical storage. When a candidate is accepted, any transactions fetched during discovery are committed to Realm before the wallet configuration is saved and the import screen closes.

The in-app self-test opens an isolated in-memory Realm and verifies native filtering, `LIMIT`, and UTXO aggregation without reading or modifying the user's canonical Realm.

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
Use `useWalletUtxoQuery()` when the component also needs Realm's `sum()` or result count. Use `useGetWalletUtxos()` only inside an async action that must read the current snapshot immediately after a refresh.

Metadata readers and writers are intentionally separate: `useTransactionMemo()` and `useCounterpartyMetadata()` subscribe to data, while `useSetTransactionMemo()` and `useSetCounterpartyMetadata()` return stable Realm writers without subscribing to unrelated rows.

Wallet configuration and secrets can be selected with `useWallet(walletId)`. Do not manufacture wallet identity changes with a `Proxy` to observe transactions; subscribe to the relevant Realm activity or UTXO hook instead.

## Writing

Write transaction memos with `useTransactionMetadata()`, `useTransactionMemo()`, or `useSetTransactionMemo()`. Write counterparty metadata with `useCounterpartyMetadata()` and UTXO memo/frozen state with `useWalletUtxoMutations()`. These hooks execute Realm write transactions; screens must not mutate metadata maps or wallet UTXO metadata directly.

Fetched transaction snapshots are replaced through `BlueApp.fetchWalletTransactions()` or `persistWalletTransactions()`. `saveToDisk()` is only the serialized queue for wallet configuration/secrets, encrypted-bucket state, migration initialization, and pruning rows for deleted wallets. It never rebuilds initialized transaction data from wallet memory. This provides these guarantees:

- transaction rows and their searchable projection cannot diverge;
- memo changes update both metadata and transaction search atomically;
- deleted-wallet rows are pruned only after the wallet configuration is durable;
- concurrent wallet saves execute in order and report their own failures to callers.

Use Realm query arguments (`walletId == $0`) rather than interpolating values into query strings. Add indexed columns only for fields frequently used in selective equality queries; keep the complete transaction in `payloadJson` so wallet-specific fields remain available without expanding the schema for every wallet implementation.

## Realm API references

- [Realm JS `Results`](https://github.com/realm/realm-js/blob/main/packages/realm/src/Results.ts) documents that query results are live collections.
- [Realm JS `Collection`](https://github.com/realm/realm-js/blob/main/packages/realm/src/Collection.ts) documents listener registration, initial notification, and removal.
- [Realm JS `Realm`](https://github.com/realm/realm-js/blob/main/packages/realm/src/Realm.ts) documents opening, closing, and write-transaction behavior.
