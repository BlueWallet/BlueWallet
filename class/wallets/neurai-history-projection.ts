/**
 * How a Neurai wallet's history becomes the transaction list the UI shows,
 * and how locally recorded pending sends merge with it (H30).
 *
 * Pure functions: no wallet state, no network, the clock passed in. They were
 * methods of `AbstractNeuraiWallet`, which still exposes the same behaviour
 * through `getTransactions`, `getUnconfirmedBalance` and `addPendingTx`.
 */
import { absSats, minSats, parseRawSats, satsToXna } from '../../blue_modules/neurai/amounts';
import type { Transaction } from './types';

/** One entry of `@neuraiproject/neurai-history-list`'s output. */
export type HistoryItem = {
  isSent: boolean;
  fee: string;
  assets: { assetName: string; satoshis: bigint; value: string }[];
  blockHeight: number;
  transactionId: string;
};

/** A locally-tracked pending send stops counting after this long without confirming. */
export const PENDING_TX_TTL_MS = 24 * 60 * 60 * 1000;

function baseEntry(txid: string, time: number): Transaction {
  return {
    txid,
    hash: txid,
    version: 0,
    size: 0,
    vsize: 0,
    weight: 0,
    locktime: 0,
    inputs: [],
    outputs: [],
    blockhash: '',
    confirmations: 0,
    time,
    blocktime: time,
    timestamp: time,
    value: 0n,
  } as unknown as Transaction;
}

/**
 * A history item as a list transaction. Confirmations are tip − block + 1, or
 * 1 when the tip is unknown or behind; mempool items (height 0) and blocks
 * without a known time are dated `nowSec`.
 */
export function historyItemToTransaction(
  item: HistoryItem,
  blockTimes: Record<number, number>,
  tipHeight: number,
  nowSec: number,
): Transaction {
  const xnaAsset = item.assets.find(a => a.assetName === 'XNA');
  const value = xnaAsset ? parseRawSats(xnaAsset.satoshis) : 0n;
  const confirmations = item.blockHeight > 0 ? Math.max(1, tipHeight - item.blockHeight + 1) : 0;
  // A transfer of a Neurai asset carries a non-XNA entry: the list shows it as
  // an asset movement ("Sent · 100 FOO") rather than a plain XNA row.
  const nonXnaAsset = item.assets.find(a => a.assetName !== 'XNA');
  const time = item.blockHeight > 0 ? (blockTimes[item.blockHeight] ?? nowSec) : nowSec;
  return {
    ...baseEntry(item.transactionId, time),
    confirmations,
    value: item.isSent ? -absSats(value) : absSats(value),
    assetName: nonXnaAsset?.assetName,
    assetAmount: nonXnaAsset?.value,
  } as Transaction;
}

/** The entry recorded for a just-broadcast send; `assetAmount` is the (positive) amount sent. */
export function pendingSendEntry(
  txid: string,
  valueSats: bigint,
  nowSec: number,
  asset?: { name: string; amountSats: bigint },
): Transaction {
  return {
    ...baseEntry(txid, nowSec),
    value: valueSats,
    assetName: asset?.name,
    // Pending entries are always outgoing sends: negative asset amount.
    assetAmount: asset ? satsToXna(-absSats(asset.amountSats)) : undefined,
  } as Transaction;
}

export function isConfirmedIn(history: readonly Transaction[], txid: string): boolean {
  return history.some(t => t.txid === txid && t.confirmations > 0);
}

/** Pending sends that neither confirmed nor aged past `cutoffSec`. */
export function prunePending(pending: readonly Transaction[], history: readonly Transaction[], cutoffSec: number): Transaction[] {
  return pending.filter(t => !isConfirmedIn(history, t.txid) && t.timestamp >= cutoffSec);
}

/** Pending sends first, minus any the history already lists (0-conf or confirmed). */
export function withPendingFirst(pending: readonly Transaction[], history: Transaction[]): Transaction[] {
  if (pending.length === 0) return history;
  const listed = new Set(history.map(t => t.txid));
  const stillPending = pending.filter(t => !listed.has(t.txid));
  return stillPending.length === 0 ? history : [...stillPending, ...history];
}

/**
 * The unconfirmed balance with local pending sends. A pending send keeps
 * subtracting until it confirms; when the server already reports the same
 * spend, the more negative of the two is used so it is not counted twice.
 */
export function unconfirmedWithPending(
  serverUnconfirmed: bigint,
  pending: readonly Transaction[],
  history: readonly Transaction[],
): bigint {
  const pendingDelta = pending.filter(t => !isConfirmedIn(history, t.txid)).reduce((sum, t) => sum + ((t.value as bigint) ?? 0n), 0n);
  return pendingDelta < 0 ? minSats(serverUnconfirmed, pendingDelta) : serverUnconfirmed;
}
