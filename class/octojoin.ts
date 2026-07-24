export const OCTOJOIN_STANDARD_DENOMINATIONS = [
  100000000, 50000000, 20000000, 10000000, 5000000, 2000000, 1000000, 500000, 200000, 100000,
] as const;

export const OCTOJOIN_DUST_THRESHOLD = 546;

export const OCTOJOIN_MIN_INPUTS = 3;
export const OCTOJOIN_MIN_OUTPUTS = 2;

export function isOctojoinMemo(memo?: string | null): boolean {
  return !!memo && memo.toLowerCase().includes('octojoin');
}

export function decomposeAmount(amountInSatoshis: number): number[] {
  const denominations: number[] = [];
  let remaining = amountInSatoshis;

  for (const denom of OCTOJOIN_STANDARD_DENOMINATIONS) {
    while (remaining >= denom) {
      denominations.push(denom);
      remaining -= denom;
    }
  }

  if (remaining > OCTOJOIN_DUST_THRESHOLD) {
    denominations.push(remaining);
  } else if (remaining > 0 && denominations.length > 0) {
    denominations[denominations.length - 1] += remaining;
  }

  return denominations;
}

export function bucketValues(values: number[], numBuckets: number): number[] {
  if (!numBuckets || numBuckets <= 0) return values.filter(v => v > 0);
  const buckets = new Array(numBuckets).fill(0);
  values.forEach((v, i) => {
    buckets[i % numBuckets] += v;
  });
  return buckets.filter(v => v > 0);
}

export function distributeOutputs(denominations: number[], addresses: string[]): Record<string, number> {
  const outputs: Record<string, number> = {};
  for (const addr of addresses) {
    outputs[addr] = 0;
  }

  for (let i = 0; i < denominations.length; i++) {
    const denom = denominations[i];
    const addr = addresses[i % addresses.length];
    outputs[addr] += denom;
  }

  return outputs;
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

export function selectOctojoinUtxos<T extends OctojoinSelectableUtxo>(
  utxos: T[],
  numInputs: number,
  targetAmount: number,
): OctojoinSelection<T> {
  const swappedUtxos = utxos.filter(u => u.isOctojoin);
  const otherUtxos = utxos.filter(u => !u.isOctojoin);

  const requiredSwapped = numInputs - 1;

  if (swappedUtxos.length < requiredSwapped) {
    throw new Error(`Not enough 'octojoin' coins. You need at least ${requiredSwapped}, but only found ${swappedUtxos.length}.`);
  }
  if (otherUtxos.length === 0) {
    throw new Error('Requires at least 1 non-octojoin coin.');
  }

  // Pick (numInputs - 1) swapped decoys plus exactly one sender coin, choosing the
  // combination that avoids the unnecessary input heuristic: the change MUST be
  // smaller than the smallest input, otherwise an input could be dropped while the
  // payment is still funded, fingerprinting the transaction. Prefer a UIH-clean
  // selection, then the smallest change. Smaller coins are searched first so totals
  // stay tight; the pool is bounded to keep the combination search cheap.
  const swappedPool = [...swappedUtxos].sort((a, b) => a.value - b.value).slice(0, requiredSwapped + 6);
  const senders = [...otherUtxos].sort((a, b) => a.value - b.value).slice(0, 10);

  let best: { swapped: T[]; other: T; total: number; change: number; clean: boolean } | null = null;
  for (const combo of chooseCombinations(swappedPool, requiredSwapped)) {
    const swappedValue = combo.reduce((sum, u) => sum + u.value, 0);
    for (const sender of senders) {
      const total = swappedValue + sender.value;
      if (total < targetAmount) continue;
      const change = total - targetAmount;
      const minInput = Math.min(sender.value, ...combo.map(u => u.value));
      const clean = change < minInput;
      if (!best || (clean && !best.clean) || (clean === best.clean && change < best.change)) {
        best = { swapped: combo, other: sender, total, change, clean };
      }
    }
  }

  if (!best) {
    throw new Error(
      `Insufficient funds. The swapped decoys plus a single sender coin cannot cover the target ` +
        `${(targetAmount / 100000000).toFixed(8)} BTC. Use larger coins.`,
    );
  }

  return {
    swapped: best.swapped,
    other: [best.other],
    all: [...best.swapped, best.other],
    totalValue: best.total,
  };
}

export function estimateOctojoinFee(numInputs: number, numOutputs: number, feeRate: number, inputVbytes = 68): number {
  const TX_OVERHEAD = 11;
  const OUTPUT_VBYTES = 34;
  return Math.ceil((TX_OVERHEAD + numInputs * inputVbytes + numOutputs * OUTPUT_VBYTES) * feeRate);
}

export interface OctojoinTarget {
  address: string;
  value: number;
}

export interface OctojoinPlan<T> {
  inputs: T[];
  paymentTargets: OctojoinTarget[];
  totalInput: number;
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
}): OctojoinPlan<T> {
  const { utxos, paymentSats, addresses, isSilentPayment, numInputs, numOutputs, feeRate, inputVbytes = 68 } = params;

  const denominations = decomposeAmount(paymentSats);
  if (denominations.length === 0) {
    throw new Error(`Payment amount ${paymentSats} sat is below the dust threshold and cannot be octojoined.`);
  }
  const paymentTargets: OctojoinTarget[] = isSilentPayment
    ? bucketValues(denominations, numOutputs ?? denominations.length).map(value => ({ address: addresses[0], value }))
    : Object.entries(distributeOutputs(denominations, addresses))
        .filter(([, value]) => value > 0)
        .map(([address, value]) => ({ address, value }));

  const nPay = paymentTargets.length;

  // size the selection to cover the payment plus a fee that assumes one change output
  const roughFee = estimateOctojoinFee(numInputs, nPay + 1, feeRate, inputVbytes);
  const selection = selectOctojoinUtxos(utxos, numInputs, paymentSats + roughFee);

  const minFee = estimateOctojoinFee(selection.all.length, nPay + 1, feeRate, inputVbytes);
  if (selection.totalValue < paymentSats + minFee) {
    throw new Error('Insufficient funds to cover the payment and fee. Increase the number of inputs or use larger coins.');
  }

  return { inputs: selection.all, paymentTargets, totalInput: selection.totalValue };
}
