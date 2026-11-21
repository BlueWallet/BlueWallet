/**
 * Automatic network fee for a pool operation.
 *
 * The fee is not free-form: each operation form accepts only the levels its
 * manifest pins (0.1, 0.2 and 0.5 XNA in the TEST pools), and the proof
 * commits to the chosen one.
 *
 * From the NIP-028 height on (testnet from block 10) the Poseidon work of a
 * pool transaction counts in its policy size, and it dominates: a T3 weighs
 * about 18,000 vbytes although it serializes to about 6,000. The size comes
 * from neurai-privacy, which mirrors the node's work accounting per form.
 *
 * Two thresholds:
 *  - the network minimum (the node's relay floor), below which the worker
 *    refuses to prove; levels under it are not offered;
 *  - the wallet's relay rate (feePolicy.ts: 0.01 XNA per 1,000 vbytes plus
 *    20%), which "Auto" uses to keep a margin over that floor.
 */

import { poolRequiredFee, type PoolOperation } from '@neuraiproject/neurai-privacy/client';

import { xnaToSats } from '../amounts';
import { LOCAL_FEE_RATE_RPC } from '../feePolicy';

export const AUTO_FEE = 'auto';

const OPERATIONS: readonly PoolOperation[] = ['D', 'T1', 'T2', 'T3', 'W', 'J2'];
const LOCAL_RATE_PER_KVB = xnaToSats(LOCAL_FEE_RATE_RPC);

const isOperation = (form: string): form is PoolOperation => (OPERATIONS as readonly string[]).includes(form);

/** Fee for `form` (its costliest variant); an unknown form takes the costliest operation. */
function feeFor(form: string, feeRatePerKvB?: bigint): bigint {
  const options = feeRatePerKvB === undefined ? {} : { feeRatePerKvB };
  if (isOperation(form)) return poolRequiredFee(form, options);
  return OPERATIONS.reduce((max, op) => {
    const fee = poolRequiredFee(op, options);
    return fee > max ? fee : max;
  }, 0n);
}

/** The lowest fee the node relays for this form; the worker refuses to prove below it. */
export function minimumPoolFee(form: string): bigint {
  return feeFor(form);
}

/** Atomic fee the wallet's relay rate asks for a transaction of this form. */
export function requiredPoolFee(form: string): bigint {
  return feeFor(form, LOCAL_RATE_PER_KVB);
}

const ascending = (levels: string[]) => [...levels].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));

/** Pinned levels that pay at least the network minimum, in manifest order. */
export function payablePoolLevels(form: string, levels: string[]): string[] {
  const minimum = minimumPoolFee(form);
  return levels.filter(level => BigInt(level) >= minimum);
}

/** The lowest pinned level that covers `form` at the wallet's rate, or the highest one when none does. */
export function autoPoolFee(form: string, levels: string[]): string {
  if (!levels.length) return '';
  const sorted = ascending(levels);
  const required = requiredPoolFee(form);
  return sorted.find(level => BigInt(level) >= required) ?? sorted[sorted.length - 1];
}
