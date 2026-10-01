import { sha256 } from '@noble/hashes/sha256';

export const OCTOJOIN_DUST_THRESHOLD = 546;

export const OCTOJOIN_MIN_INPUTS = 3;
export const OCTOJOIN_MIN_OUTPUTS = 2;

export const OCTOJOIN_ROUND_UNIT = 1000;
export const OCTOJOIN_EQUAL_INPUTS_PERCENT = 10;
const SPLIT_ATTEMPTS = 10000;
const MAX_SELECTIONS = 200000;

export const UNEQUAL_INPUTS = 'unequalInputs';
export const UNNECESSARY_INPUT = 'unnecessaryInput';
export const CHANGE_IDENTIFIABLE = 'changeIdentifiable';
export const CHANGE_BESIDE_EQUAL_OUTPUTS = 'changeBesideEqualOutputs';
export type OctojoinWarning =
  | typeof UNEQUAL_INPUTS
  | typeof UNNECESSARY_INPUT
  | typeof CHANGE_IDENTIFIABLE
  | typeof CHANGE_BESIDE_EQUAL_OUTPUTS;

export function isOctojoinMemo(memo?: string | null): boolean {
  return !!memo && memo.toLowerCase().includes('octojoin');
}

const TWO_64 = BigInt('0x10000000000000000');
const BYTE = BigInt(256);

// Uniform integers from SHA-256 of a seed and a counter, the same stream as the
// reference implementation, so a seed gives the same plan in every implementation.
export class OctojoinRandomness {
  private readonly seed: Uint8Array;
  private counter = BigInt(0);

  constructor(seed: Uint8Array) {
    this.seed = seed;
  }

  below(n: number): number {
    const range = BigInt(n);
    const limit = TWO_64 - (TWO_64 % range);
    for (;;) {
      this.counter += BigInt(1);
      const message = new Uint8Array(this.seed.length + 8);
      message.set(this.seed);
      let counter = this.counter;
      for (let i = message.length - 1; i >= this.seed.length; i--) {
        message[i] = Number(counter % BYTE);
        counter /= BYTE;
      }
      const digest = sha256(message);
      let value = BigInt(0);
      for (let i = 0; i < 8; i++) value = value * BYTE + BigInt(digest[i]);
      if (value < limit) return Number(value % range);
    }
  }
}

export function isRound(value: number): boolean {
  return value % OCTOJOIN_ROUND_UNIT === 0;
}

export function inputsNearEqual(values: number[]): boolean {
  return Math.max(...values) * 100 <= Math.min(...values) * (100 + OCTOJOIN_EQUAL_INPUTS_PERCENT);
}

function divFloor(a: number, b: number): number {
  return (a - (a % b)) / b;
}

// The smallest and largest value of a payment output: above dust, and between
// half and one and a half times an even share of the payment.
export function splitRange(paymentSats: number, numOutputs: number, dust = OCTOJOIN_DUST_THRESHOLD): [number, number] {
  const share = 2 * numOutputs;
  const lo = divFloor(paymentSats, share) + (paymentSats % share ? 1 : 0);
  return [Math.max(dust + 1, lo), divFloor(3 * paymentSats, share)];
}

export function smallestSplittable(numOutputs: number, dust = OCTOJOIN_DUST_THRESHOLD, equalOutputs = false): number {
  if (equalOutputs) return numOutputs * (dust + 1);
  return numOutputs * (dust + 1) + (numOutputs * (numOutputs - 1)) / 2;
}

export function equalSplit(paymentSats: number, numOutputs: number): number[] {
  const share = divFloor(paymentSats, numOutputs);
  const rest = paymentSats % numOutputs;
  return Array.from({ length: numOutputs }, (_, i) => (i < rest ? share + 1 : share));
}

// Cut the payment at random points into values in the split range that are all
// different, not round and not equal to the change. With below, at least one of
// them is smaller than it. Returns null if no attempt gives such values.
export function splitAmount(
  paymentSats: number,
  numOutputs: number,
  dust: number,
  rng: OctojoinRandomness,
  { change = 0, below = null }: { change?: number; below?: number | null } = {},
): number[] | null {
  const [lo, hi] = splitRange(paymentSats, numOutputs, dust);
  const spread = paymentSats - numOutputs * lo;
  if (spread < 0) return null;
  for (let attempt = 0; attempt < SPLIT_ATTEMPTS; attempt++) {
    const cuts: number[] = [];
    for (let i = 0; i < numOutputs - 1; i++) cuts.push(rng.below(spread + 1));
    cuts.sort((a, b) => a - b);
    const lower = [0, ...cuts];
    const values = [...cuts, spread].map((upper, i) => lo + upper - lower[i]);
    if (
      Math.max(...values) <= hi &&
      new Set(values).size === numOutputs &&
      !values.includes(change) &&
      !values.some(isRound) &&
      (below === null || Math.min(...values) < below)
    ) {
      return values;
    }
  }
  return null;
}

export function estimateOctojoinFee(numInputs: number, numOutputs: number, feeRate: number, inputVbytes = 68, outputVbytes = 34): number {
  const TX_OVERHEAD = 11;
  return Math.ceil((TX_OVERHEAD + numInputs * inputVbytes + numOutputs * outputVbytes) * feeRate);
}

export interface OctojoinSizes {
  feeRate: number;
  inputVbytes?: number;
  outputVbytes?: number;
  dust?: number;
}

// Fee and change for spending these inputs on the payment outputs, shared with the
// wallet's forced coin selection so the transaction it builds is the planned one.
// Change that would be round gives 1 sat to the fee, and change at or below dust
// goes to the fee entirely. Returns null when the inputs cannot pay the fee.
export function octojoinFeeAndChange(
  totalInput: number,
  paymentSats: number,
  numInputs: number,
  numPaymentOutputs: number,
  { feeRate, inputVbytes = 68, outputVbytes = 34, dust = OCTOJOIN_DUST_THRESHOLD }: OctojoinSizes,
): { change: number; fee: number } | null {
  let fee = estimateOctojoinFee(numInputs, numPaymentOutputs + 1, feeRate, inputVbytes, outputVbytes);
  let change = totalInput - paymentSats - fee;
  if (change > dust && isRound(change)) {
    change -= 1;
    fee += 1;
  }
  if (change <= dust) {
    fee = totalInput - paymentSats;
    if (fee < estimateOctojoinFee(numInputs, numPaymentOutputs, feeRate, inputVbytes, outputVbytes)) return null;
    change = 0;
  }
  return { change, fee };
}

export interface OctojoinSelectableUtxo {
  value: number;
  isOctojoin: boolean;
}

export interface OctojoinSelection<T extends OctojoinSelectableUtxo> {
  swapped: T[];
  other: T[];
  all: T[];
  totalValue: number;
  change: number;
  fee: number;
}

function chooseCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of chooseCombinations(arr.slice(i + 1), k - 1)) {
      result.push([arr[i], ...rest]);
    }
  }
  return result;
}

function countCombinations(n: number, k: number): number {
  let count = 1;
  for (let i = 1; i <= k; i++) count = (count * (n - k + i)) / i;
  return count;
}

// Pick (numInputs - 1) swapped coins plus exactly one sender coin. The change
// should be smaller than the smallest input, otherwise an input could be dropped
// while the payment is still funded, the unnecessary input heuristic. No change is
// best. Otherwise it should lie in the split range, so that it looks like one of
// the payment outputs, which change next to equal outputs never does. With equal
// inputs, inputs of near-equal value come before all of that, and every swapped
// coin is a candidate. Pick at random among the selections that do best.
export function selectOctojoinUtxos<T extends OctojoinSelectableUtxo>(params: {
  utxos: T[];
  numInputs: number;
  paymentSats: number;
  numPaymentOutputs: number;
  sizes: OctojoinSizes;
  split: [number, number];
  rng: OctojoinRandomness;
  equalOutputs?: boolean;
  equalInputs?: boolean;
}): OctojoinSelection<T> {
  const { utxos, numInputs, paymentSats, numPaymentOutputs, sizes, split, rng, equalOutputs = false, equalInputs = false } = params;
  const swappedUtxos = utxos.filter(u => u.isOctojoin);
  const otherUtxos = utxos.filter(u => !u.isOctojoin);

  const requiredSwapped = numInputs - 1;

  if (swappedUtxos.length < requiredSwapped) {
    throw new Error(`Not enough 'octojoin' coins. You need at least ${requiredSwapped}, but only found ${swappedUtxos.length}.`);
  }
  if (otherUtxos.length === 0) {
    throw new Error('Requires at least 1 non-octojoin coin.');
  }

  const senders = [...otherUtxos].sort((a, b) => a.value - b.value);
  let pool = [...swappedUtxos].sort((a, b) => a.value - b.value);
  let extra = equalInputs ? pool.length - requiredSwapped : 6;
  while (extra && countCombinations(Math.min(pool.length, requiredSwapped + extra), requiredSwapped) * senders.length > MAX_SELECTIONS) {
    extra -= 1;
  }
  pool = pool.slice(0, requiredSwapped + extra);

  const [lo, hi] = split;
  let bestRank: number | null = null;
  let best: OctojoinSelection<T>[] = [];
  for (const combo of chooseCombinations(pool, requiredSwapped)) {
    for (const sender of senders) {
      const all = [...combo, sender];
      const totalValue = all.reduce((sum, u) => sum + u.value, 0);
      const funded = octojoinFeeAndChange(totalValue, paymentSats, numInputs, numPaymentOutputs, sizes);
      if (!funded) continue;
      const { change, fee } = funded;
      const minInput = Math.min(...all.map(u => u.value));
      const unnecessary = change >= minInput;
      const standsOut = change > 0 && (equalOutputs || !(lo <= change && change <= hi));
      const unequal = equalInputs && !inputsNearEqual(all.map(u => u.value));
      const rank = (unequal ? 8 : 0) + (unnecessary ? 4 : 0) + (standsOut ? 2 : 0) + (change > 0 ? 1 : 0);
      const selection = { swapped: combo, other: [sender], all, totalValue, change, fee };
      if (bestRank === null || rank < bestRank) {
        bestRank = rank;
        best = [selection];
      } else if (rank === bestRank) {
        best.push(selection);
      }
    }
  }

  if (!best.length) {
    throw new Error(
      `Insufficient funds. The swapped coins plus a single sender coin cannot cover ` +
        `${(paymentSats / 100000000).toFixed(8)} BTC and the fee. Use larger coins.`,
    );
  }
  return best[rng.below(best.length)];
}

export interface OctojoinTarget {
  address: string;
  value: number;
}

export interface OctojoinPlan<T> {
  inputs: T[];
  paymentTargets: OctojoinTarget[];
  totalInput: number;
  change: number;
  fee: number;
  uihClean: boolean;
  changeHidden: boolean;
  equalOutputs: boolean;
  equalInputs: boolean;
  warnings: OctojoinWarning[];
}

export function planOctojoin<T extends OctojoinSelectableUtxo>(params: {
  utxos: T[];
  paymentSats: number;
  addresses: string[];
  isSilentPayment: boolean;
  numInputs: number;
  numOutputs?: number;
  feeRate: number;
  inputVbytes?: number;
  outputVbytes?: number;
  dust?: number;
  rng: OctojoinRandomness;
  equalOutputs?: boolean;
  equalInputs?: boolean;
}): OctojoinPlan<T> {
  const { utxos, paymentSats, addresses, isSilentPayment, numInputs, feeRate, rng, equalOutputs = false, equalInputs = false } = params;
  const { inputVbytes = 68, outputVbytes = 34, dust = OCTOJOIN_DUST_THRESHOLD } = params;
  const numOutputs = isSilentPayment ? (params.numOutputs ?? OCTOJOIN_MIN_OUTPUTS) : addresses.length;

  if (paymentSats <= dust) {
    throw new Error(`Payment amount ${paymentSats} sat is below the dust threshold and cannot be octojoined.`);
  }
  const tooSmall = () =>
    new Error(
      `${paymentSats} sat cannot be split into ${numOutputs} ${equalOutputs ? 'equal' : 'different'} outputs above the dust ` +
        `threshold of ${dust} sat. Lower the number of outputs or raise the amount.`,
    );
  if (paymentSats < smallestSplittable(numOutputs, dust, equalOutputs)) throw tooSmall();

  const split = splitRange(paymentSats, numOutputs, dust);
  const selection = selectOctojoinUtxos({
    utxos,
    numInputs,
    paymentSats,
    numPaymentOutputs: numOutputs,
    sizes: { feeRate, inputVbytes, outputVbytes, dust },
    split,
    rng,
    equalOutputs,
    equalInputs,
  });

  const { change } = selection;
  const minInput = Math.min(...selection.all.map(u => u.value));
  const [lo, hi] = split;
  let values: number[] | null;
  let changeHidden: boolean;
  if (equalOutputs) {
    values = equalSplit(paymentSats, numOutputs);
    changeHidden = change === 0;
  } else {
    // with change below every input, a payment output below every input as well
    // keeps the change from being the only output the heuristic points to
    const below = change && change < minInput && minInput > lo ? minInput : null;
    values = splitAmount(paymentSats, numOutputs, dust, rng, { change, below });
    if (!values && below !== null) values = splitAmount(paymentSats, numOutputs, dust, rng, { change });
    if (!values) throw tooSmall();
    changeHidden = change === 0 || (lo <= change && change <= hi && (change >= minInput || Math.min(...values) < minInput));
  }

  const uihClean = change < minInput;
  const warnings: OctojoinWarning[] = [];
  if (equalInputs && !inputsNearEqual(selection.all.map(u => u.value))) warnings.push(UNEQUAL_INPUTS);
  if (!uihClean) warnings.push(UNNECESSARY_INPUT);
  if (!changeHidden) warnings.push(equalOutputs ? CHANGE_BESIDE_EQUAL_OUTPUTS : CHANGE_IDENTIFIABLE);

  return {
    inputs: selection.all,
    paymentTargets: values.map((value, i) => ({ address: isSilentPayment ? addresses[0] : addresses[i], value })),
    totalInput: selection.totalValue,
    change,
    fee: selection.fee,
    uihClean,
    changeHidden,
    equalOutputs,
    equalInputs,
    warnings,
  };
}
