import { parseRawSats, satsToXna, xnaToSats } from './amounts';

/** These paths belong to wallet DTOs, not arbitrary JSON or user metadata. */
const rawCollections = ['_utxo', '_txCache', '_pendingTxs'];
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);

function visitAmounts(dto: RecordValue, raw: (value: unknown) => unknown, decimal: (value: unknown) => unknown): void {
  for (const key of ['balance', 'unconfirmed_balance', '_silentBalance']) if (dto[key] !== undefined) dto[key] = raw(dto[key]);
  for (const collection of rawCollections) {
    const rows = dto[collection];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!record(row)) continue;
      if (row.value !== undefined) row.value = raw(row.value);
      if (row.assetAmount !== undefined) row.assetAmount = decimal(row.assetAmount);
      for (const key of ['inputs', 'outputs']) {
        if (!Array.isArray(row[key])) continue;
        for (const entry of row[key]) if (record(entry) && entry.value !== undefined) entry.value = raw(entry.value);
      }
    }
  }
  if (Array.isArray(dto._historyItems)) {
    for (const item of dto._historyItems) {
      if (!record(item)) continue;
      if (item.fee !== undefined) item.fee = decimal(item.fee);
      if (!Array.isArray(item.assets)) continue;
      for (const asset of item.assets) {
        if (!record(asset)) continue;
        if (asset.satoshis !== undefined) asset.satoshis = raw(asset.satoshis);
        if (asset.value !== undefined) asset.value = decimal(asset.value);
      }
    }
  }
  if (Array.isArray(dto._heldAssets)) {
    for (const asset of dto._heldAssets) if (record(asset) && asset.amount !== undefined) asset.amount = decimal(asset.amount);
  }
}

function cloneData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneData);
  if (record(value)) return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, cloneData(v)]));
  return value;
}

export function encodeWalletAmounts(wallet: object): RecordValue {
  // The storage layer clones wallets and loses prototype.toJSON; use this codec there too.
  const dto = cloneData({ ...wallet }) as RecordValue;
  visitAmounts(
    dto,
    value => parseRawSats(value).toString(),
    value => String(value),
  );
  dto.amountsVersion = 1;
  return dto;
}

export function decodeWalletAmounts(value: unknown): RecordValue {
  if (!record(value)) throw new Error('Invalid wallet data');
  if (value.amountsVersion !== undefined && value.amountsVersion !== 1) throw new Error('Unsupported wallet amounts version');
  const dto = cloneData(value) as RecordValue;
  let stale = dto.amountsStale === true;
  const raw = (input: unknown): bigint => {
    try {
      return parseRawSats(input);
    } catch {
      stale = true;
      return 0n;
    }
  };
  const decimal = (input: unknown): string => {
    try {
      if (typeof input !== 'string' && typeof input !== 'number') throw new Error('Invalid decimal');
      // Old decimal numbers beyond safe raw precision cannot be reconstructed.
      const result = xnaToSats(String(input));
      if (typeof input === 'number' && (result > BigInt(Number.MAX_SAFE_INTEGER) || result < -BigInt(Number.MAX_SAFE_INTEGER))) {
        throw new Error('Unsafe legacy decimal');
      }
      return satsToXna(result);
    } catch {
      stale = true;
      return '0';
    }
  };
  visitAmounts(dto, raw, decimal);
  if (stale) {
    // Keep identity, keys, labels and metadata. Only derived caches are discarded.
    dto.balance = 0n;
    dto.unconfirmed_balance = 0n;
    if (dto._silentBalance !== undefined) dto._silentBalance = 0n;
    dto._utxo = [];
    dto._txCache = [];
    dto._historyItems = [];
    dto._heldAssets = [];
    dto._addressStatus = {};
    dto._lastBalanceFetch = 0;
    dto._lastTxFetch = 0;
    // Keep pending txids for reconciliation, but never trust their invalid amounts.
    dto.amountsStale = true;
  }
  dto.amountsVersion = 1;
  return dto;
}
