/**
 * The details of one transaction for its screen, from the node's verbose
 * `getrawtransaction` (through the wallet service): inputs with their value
 * and address (the node keeps a spent index), outputs, block and size. The
 * wallet's history only knows the net amount; this adds the fee, the block
 * and who paid or was paid.
 */
import { parseRawSats } from './amounts';

/** `asset`: the Neurai asset an output carries, with its amount in full units when the node gives it. */
export type TxEndpoint = { address?: string; valueSats: bigint; asset?: { name: string; amount?: string } };

export type TxDetails = {
  inputs: TxEndpoint[];
  outputs: TxEndpoint[];
  /** XNA in minus XNA out; null when an input's value is unknown (or a coinbase). */
  feeSats: bigint | null;
  blockHeight: number | null;
  /** Live from the node; null for a transaction it does not report. */
  confirmations: number | null;
  /** Seconds. */
  time: number | null;
};

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function sats(value: unknown): bigint | null {
  try {
    return parseRawSats(value);
  } catch {
    return null;
  }
}

const positiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

/** Reads the node's answer; anything it cannot read is left out rather than guessed. */
export function parseVerboseTransaction(raw: unknown): TxDetails | null {
  if (!record(raw) || !Array.isArray(raw.vin) || !Array.isArray(raw.vout)) return null;
  let inputsKnown = raw.vin.length > 0;
  const inputs: TxEndpoint[] = raw.vin.filter(record).map(vin => {
    const value = sats(vin.valueSat);
    if (value === null || vin.coinbase !== undefined) inputsKnown = false;
    return { address: typeof vin.address === 'string' ? vin.address : undefined, valueSats: value ?? 0n };
  });
  const outputs: TxEndpoint[] = raw.vout.filter(record).map(vout => {
    const script = record(vout.scriptPubKey) ? vout.scriptPubKey : {};
    const addresses = Array.isArray(script.addresses) ? script.addresses.filter((a): a is string => typeof a === 'string') : [];
    const carried = record(script.asset) ? script.asset : null;
    const amount =
      carried && (typeof carried.amount === 'number' || typeof carried.amount === 'string') ? String(carried.amount) : undefined;
    const asset = carried && typeof carried.name === 'string' ? { name: carried.name, amount } : undefined;
    return { address: addresses[0], valueSats: sats(vout.valueSat) ?? 0n, asset };
  });
  const totalIn = inputs.reduce((sum, input) => sum + input.valueSats, 0n);
  const totalOut = outputs.reduce((sum, output) => sum + output.valueSats, 0n);
  const confirmations = typeof raw.confirmations === 'number' && raw.confirmations >= 0 ? raw.confirmations : null;
  return {
    inputs,
    outputs,
    feeSats: inputsKnown && totalIn >= totalOut ? totalIn - totalOut : null,
    blockHeight: positiveInteger(raw.height),
    confirmations,
    time: positiveInteger(raw.blocktime) ?? positiveInteger(raw.time),
  };
}

/**
 * One address of the transaction, as the screen lists it. `valueSats` is what
 * it got from this transaction (null when nothing worth showing); `own` marks
 * the wallet's own addresses.
 */
export type Counterparty = { address: string; valueSats: bigint | null; asset?: { name: string; amount?: string }; own: boolean };

/**
 * Where a send went, or where a receipt came from.
 *
 * Send: every output address, the wallet's own included (change, or the
 * destination of a payment to oneself), others first. An address that also
 * paid into the transaction shows what it gained: a privacy pool spends its
 * balance and gets it back with the deposit, and the deposit is what counts.
 * One that only passes state through (pays in as much as it gets, like the
 * pool's state token) is not a destination and is left out.
 *
 * Receipt: the addresses that paid, not the wallet's own, without amounts
 * (what a sender spends includes its own change).
 */
export function counterparties(details: TxDetails, sent: boolean, isOwn: (address: string) => boolean): Counterparty[] {
  if (!sent) {
    const from = details.inputs.map(input => input.address).filter((address): address is string => !!address && !isOwn(address));
    return Array.from(new Set(from)).map(address => ({ address, valueSats: null, own: false }));
  }
  const paidIn = new Map<string, bigint>();
  for (const input of details.inputs) if (input.address) paidIn.set(input.address, (paidIn.get(input.address) ?? 0n) + input.valueSats);
  const received = new Map<string, { valueSats: bigint; asset?: { name: string; amount?: string } }>();
  for (const output of details.outputs) {
    if (!output.address) continue;
    const seen = received.get(output.address);
    if (seen) seen.valueSats += output.valueSats;
    else received.set(output.address, { valueSats: output.valueSats, asset: output.asset });
  }
  const parties: Counterparty[] = [];
  for (const [address, got] of received) {
    const own = isOwn(address);
    const spent = paidIn.get(address);
    if (own || spent === undefined) {
      parties.push({ address, own, valueSats: got.valueSats > 0n ? got.valueSats : null, asset: got.asset });
      continue;
    }
    const gained = got.valueSats - spent;
    if (gained > 0n) parties.push({ address, own, valueSats: gained });
  }
  return [...parties.filter(party => !party.own), ...parties.filter(party => party.own)];
}

/** Every output goes back to the wallet: a payment to oneself. */
export function isSelfTransfer(details: TxDetails, isOwn: (address: string) => boolean): boolean {
  const addresses = details.outputs.map(output => output.address);
  return addresses.length > 0 && addresses.every(address => !!address && isOwn(address));
}
