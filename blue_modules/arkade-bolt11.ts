/**
 * The wallet's BOLT11 gate — the lightning corridor's `decode` override.
 *
 * Turns a BOLT11 string into the `InvoiceFacts` the swap client requires and
 * refuses what the wallet can already prove unusable before any solver sees
 * it. Wired once as the corridor override, it runs in both directions: the
 * payer's invoice on a send and the solver's hold invoice on a receive.
 *
 * Mirrors the reference wallet's `lnSwap.ts` gates: unparseable,
 * wrong-network, expired, zero-amount (the lockup amount IS the invoice
 * amount, so a donation invoice has nothing to fund) and missing payment
 * hash. A missing timestamp is treated as expired — liveness that cannot be
 * proven must not be paid.
 */

import type { InvoiceFacts } from '@arkade-os/swap';
import * as bolt11 from 'bolt11';

/** Why an invoice cannot start a swap. A closed set, so callers can branch. */
export type InvoiceRejection = 'unparseable' | 'wrong_network' | 'expired' | 'zero_amount' | 'no_payment_hash';

/** An invoice the wallet refuses before any solver is contacted. */
export class InvoiceRejected extends Error {
  readonly reason: InvoiceRejection;

  constructor(reason: InvoiceRejection, message: string) {
    super(message);
    this.name = 'InvoiceRejected';
    this.reason = reason;
  }
}

const NETWORK_PREFIXES: Record<string, string> = {
  bitcoin: 'lnbc',
  testnet: 'lntb',
  signet: 'lntbs',
  mutinynet: 'lntbs',
  regtest: 'lnbcrt',
};

interface DecodedFacts {
  paymentHash: string;
  amountSats: number;
  timestamp: number;
  expiry: number;
}

function decodeLocal(invoice: string): DecodedFacts {
  const decoded: any = (bolt11 as any).decode(invoice);
  const tags: any[] = decoded.tags ?? decoded.sections ?? [];
  let paymentHash = '';
  let expiry = 3600;
  for (const tag of tags) {
    const tagName = tag.tagName ?? tag.name;
    const data = tag.data ?? tag.value;
    if (tagName === 'payment_hash' && data) paymentHash = String(data);
    if ((tagName === 'expire_time' || tagName === 'expiry') && data !== undefined) expiry = +data;
  }
  const satoshis = decoded.satoshis ? +decoded.satoshis : 0;
  const millisatoshis = decoded.millisatoshis ? +decoded.millisatoshis : 0;
  const amountSats = satoshis > 0 ? satoshis : Math.floor(millisatoshis / 1000);
  const timestamp = decoded.timestamp ?? 0;
  if (!expiry) expiry = 3600;
  return { paymentHash, amountSats, timestamp, expiry };
}

/**
 * Decode a BOLT11 string into the facts the swap client needs, refusing
 * anything the wallet can already tell is unusable.
 */
export const toInvoiceFacts = (invoice: string, network: string = 'bitcoin', nowSeconds = Math.floor(Date.now() / 1000)): InvoiceFacts => {
  const trimmed = invoice.trim();

  let decoded: DecodedFacts;
  try {
    decoded = decodeLocal(trimmed);
  } catch {
    throw new InvoiceRejected('unparseable', 'not a valid BOLT11 invoice');
  }

  const prefix = NETWORK_PREFIXES[network] ?? NETWORK_PREFIXES.bitcoin;
  if (!trimmed.toLowerCase().startsWith(prefix)) {
    throw new InvoiceRejected('wrong_network', `invoice is not for ${network}`);
  }

  // isInvoiceExpired treats a missing timestamp as expired.
  if (!decoded.timestamp || nowSeconds >= decoded.timestamp + decoded.expiry) {
    throw new InvoiceRejected('expired', 'invoice has expired');
  }

  if (decoded.amountSats <= 0) {
    throw new InvoiceRejected('zero_amount', 'invoice does not specify an amount');
  }

  if (!decoded.paymentHash) {
    throw new InvoiceRejected('no_payment_hash', 'invoice carries no payment hash');
  }

  return {
    raw: trimmed,
    paymentHash: decoded.paymentHash,
    amountSats: decoded.amountSats,
    expiresAt: decoded.timestamp + decoded.expiry,
  };
};
