/**
 * H17 · A silent payment from a Legacy or PQ wallet is two transactions: the
 * first moves the coins to an ECDSA "bridge" address of the same words, the
 * second pays the recipient from there (`_buildSilentPaymentViaBridge`). Both
 * are signed before anything is sent.
 *
 * Before the first one is broadcast, both are written into the wallet (inside
 * the encrypted store) and the save must succeed; nothing is sent otherwise.
 * So whatever happens next (the app closes, the process dies, a broadcast
 * answer is lost) the next start knows what is missing and offers to finish
 * it with exactly the transactions the user approved. The record holds no
 * keys, only signed transactions.
 */
import { satsToXna } from './amounts';

/** One two-step payment that has not been seen complete yet. Persisted in the wallet JSON (`_chainedSends`). */
export type ChainedSend = {
  /** Txid and signed hex of the first transaction (wallet → bridge). */
  firstTxid: string;
  first: string;
  /** Txid and signed hex of the second transaction (bridge → recipient). */
  secondTxid: string;
  second: string;
  /** The ECDSA bridge address the second transaction spends from. */
  bridge: string;
  /** The recipient's payment code, for the notice. */
  to: string;
  /** Amount the recipient gets, in satoshis (decimal string). */
  amountSats: string;
  /** When it was recorded, in seconds. */
  createdAt: number;
};

/** Keeps only well-formed records (a stored value from another version may be anything). */
export function normalizeChainedSends(value: unknown): ChainedSend[] {
  if (!Array.isArray(value)) return [];
  const text = (v: unknown) => typeof v === 'string' && v.length > 0;
  return value.filter(
    (item): item is ChainedSend =>
      !!item &&
      typeof item === 'object' &&
      ['firstTxid', 'first', 'secondTxid', 'second', 'bridge', 'to', 'amountSats'].every(key =>
        text((item as Record<string, unknown>)[key]),
      ) &&
      typeof (item as Record<string, unknown>).createdAt === 'number',
  );
}

/** The recipient's amount in XNA, for the notice. */
export function chainedSendAmount(send: ChainedSend): string {
  return satsToXna(BigInt(send.amountSats));
}

/** The node already has this transaction: a repeated broadcast is a success, not an error. */
export function isAlreadyKnown(reason: string): boolean {
  return /already in (the )?(block ?chain|mempool)|txn-already-(known|in-mempool)|transaction already in block chain|already have transaction/i.test(
    reason,
  );
}

/**
 * The node refused the transaction for a reason a retry cannot change: its
 * inputs are spent or missing, it conflicts, or its fee or outputs are not
 * acceptable. Anything else (no answer, a timeout, a service error) may have
 * reached the node and is treated as unknown.
 */
export function isPermanentRejection(reason: string): boolean {
  return /missingorspent|missing inputs|mempool-conflict|txn-mempool-conflict|double.?spend|insufficient fee|min relay fee|mempool min fee|dust|non-final|non-mandatory-script-verify|mandatory-script-verify|bad-txns/i.test(
    reason,
  );
}

/** What the network has seen, from the bridge address's history and mempool. */
export type ChainedSendState = 'done' | 'first-seen' | 'not-seen';

export function chainedSendState(send: ChainedSend, bridgeTxids: ReadonlySet<string>): ChainedSendState {
  if (bridgeTxids.has(send.secondTxid)) return 'done';
  return bridgeTxids.has(send.firstTxid) ? 'first-seen' : 'not-seen';
}

/** What the flows need from a wallet. */
export interface ChainedSendWallet {
  recordChainedSend(send: ChainedSend): void;
  forgetChainedSend(firstTxid: string): void;
  broadcastTx(rawHex: string): Promise<string>;
  addPendingTx(txid: string, valueSats: bigint, asset?: unknown): void;
}

const reasonOf = (error: unknown): string => (error as Error)?.message ?? String(error);

/** Broadcasts `hex`; a node that already has it counts as success. */
async function broadcastOnce(wallet: ChainedSendWallet, hex: string, txid: string): Promise<string> {
  try {
    return await wallet.broadcastTx(hex);
  } catch (error) {
    if (isAlreadyKnown(reasonOf(error))) return txid;
    throw error;
  }
}

/** The payment cannot be finished: the node refused a transaction for good. */
export class ChainedSendClosedError extends Error {
  readonly leg: 'first' | 'second';
  constructor(leg: 'first' | 'second', reason: string) {
    super(reason);
    this.name = 'ChainedSendClosedError';
    this.leg = leg;
  }
}

/** The record could not be saved before sending: nothing was broadcast. */
export class ChainedSendNotSavedError extends Error {
  readonly cause: unknown;
  constructor(cause: unknown) {
    super(reasonOf(cause));
    this.name = 'ChainedSendNotSavedError';
    this.cause = cause;
  }
}

/**
 * Sends both transactions of `send`, the first only if `fromFirst`. The record
 * is removed once the second is accepted, or when a refusal makes the payment
 * impossible (`ChainedSendClosedError`; for the second leg the coins stay at
 * the bridge address). Any other failure keeps it, to be finished later.
 * `save` persists the wallet; its failure after a broadcast is not an error
 * of the payment (the record is simply removed on the next save).
 */
export async function finishChainedSend(
  wallet: ChainedSendWallet,
  send: ChainedSend,
  save: () => Promise<void>,
  fromFirst: boolean,
): Promise<string> {
  if (fromFirst) {
    try {
      await broadcastOnce(wallet, send.first, send.firstTxid);
    } catch (error) {
      if (isPermanentRejection(reasonOf(error))) {
        wallet.forgetChainedSend(send.firstTxid);
        await save().catch(() => {});
        throw new ChainedSendClosedError('first', reasonOf(error));
      }
      throw error;
    }
  }
  try {
    await broadcastOnce(wallet, send.second, send.secondTxid);
  } catch (error) {
    if (isPermanentRejection(reasonOf(error))) {
      wallet.forgetChainedSend(send.firstTxid);
      await save().catch(() => {});
      throw new ChainedSendClosedError('second', reasonOf(error));
    }
    throw error;
  }
  wallet.forgetChainedSend(send.firstTxid);
  await save().catch(() => {});
  return send.secondTxid;
}

/**
 * The send screen's path for a two-step payment: record, save, then
 * broadcast. A failed save sends nothing (`ChainedSendNotSavedError`).
 * `netDebitSats` is shown as a pending debit once the first transaction left.
 */
export async function sendChainedPayment(
  wallet: ChainedSendWallet,
  send: ChainedSend,
  netDebitSats: bigint,
  save: () => Promise<void>,
): Promise<string> {
  wallet.recordChainedSend(send);
  try {
    await save();
  } catch (error) {
    wallet.forgetChainedSend(send.firstTxid);
    throw new ChainedSendNotSavedError(error);
  }
  try {
    await broadcastOnce(wallet, send.first, send.firstTxid);
  } catch (error) {
    if (isPermanentRejection(reasonOf(error))) {
      // Refused for good: nothing left the wallet, nothing to finish.
      wallet.forgetChainedSend(send.firstTxid);
      await save().catch(() => {});
      throw new ChainedSendClosedError('first', reasonOf(error));
    }
    // No answer: it may have reached the node. The record stays, to be finished.
    throw error;
  }
  if (netDebitSats > 0n) wallet.addPendingTx(send.firstTxid, -netDebitSats);
  return finishChainedSend(wallet, send, save, false);
}
