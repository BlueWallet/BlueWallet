import { sha256 } from '@noble/hashes/sha256';
import { bech32 } from 'bech32';
import * as bitcoin from 'bitcoinjs-lib';
import bolt11 from 'bolt11';

import { ContactList } from '../class/contact-list';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import Lnurl from '../class/lnurl';
import { Chain } from '../models/bitcoinUnits';
import ecc from './noble_ecc';
import { uint8ArrayToHex } from './uint8array-extras';

bitcoin.initEccLib(ecc);

const contacts = new ContactList();

export const ClipboardPaymentKind = {
  Bitcoin: 'bitcoin',
  Lightning: 'lightning',
  Lnurl: 'lnurl',
} as const;
export type ClipboardPaymentKind = (typeof ClipboardPaymentKind)[keyof typeof ClipboardPaymentKind];

export type ClipboardPayment = {
  kind: ClipboardPaymentKind;
  payload: string;
};

export type ClipboardOwnershipWallet = {
  chain: string;
  isAddressValid?: (address: string) => boolean;
  weOwnAddress: (address: string) => boolean;
  isInvoiceGeneratedByWallet?: (paymentRequest: string) => boolean;
};

export function hashClipboardContent(content: string): string {
  return uint8ArrayToHex(sha256(content));
}

export function stripBitcoinUriToAddress(text: string): string {
  return text.replace('://', ':').replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
}

export function stripLightningScheme(text: string): string {
  return text.replace(/^lightning:\/\//i, '').replace(/^lightning:/i, '');
}

function firstNonEmptyLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function isBolt11Invoice(invoice: string): boolean {
  if (!invoice) return false;
  try {
    bolt11.decode(invoice);
    return true;
  } catch {
    return false;
  }
}

function isDecodedLnurl(text: string): boolean {
  const found = Lnurl.findlnurl(text);
  if (!found) return false;
  try {
    bech32.decode(found, 10000);
    return true;
  } catch {
    return false;
  }
}

function classifyNormalized(text: string): ClipboardPayment | null {
  const both = DeeplinkSchemaMatch.isBothBitcoinAndLightning(text);
  if (both) {
    const invoice = stripLightningScheme(both.lndInvoice);
    if (DeeplinkSchemaMatch.isBitcoinAddress(both.bitcoin) && isBolt11Invoice(invoice)) {
      return { kind: ClipboardPaymentKind.Bitcoin, payload: text };
    }
    if (DeeplinkSchemaMatch.isBitcoinAddress(both.bitcoin)) {
      return { kind: ClipboardPaymentKind.Bitcoin, payload: both.bitcoin };
    }
  }

  if (DeeplinkSchemaMatch.isBitcoinAddress(text) || contacts.isPaymentCodeValid(text)) {
    return { kind: ClipboardPaymentKind.Bitcoin, payload: text };
  }

  const invoice = stripLightningScheme(text);
  if (isBolt11Invoice(invoice)) {
    return { kind: ClipboardPaymentKind.Lightning, payload: text };
  }

  if (DeeplinkSchemaMatch.isLnUrl(text) && isDecodedLnurl(text)) {
    return { kind: ClipboardPaymentKind.Lnurl, payload: text };
  }

  return null;
}

export function classifyClipboardPayment(raw: string | undefined | null): ClipboardPayment | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const direct = classifyNormalized(trimmed);
  if (direct) return direct;

  if (!/[\r\n]/.test(trimmed)) return null;
  const firstLine = firstNonEmptyLine(trimmed);
  if (!firstLine || firstLine === trimmed) return null;
  return classifyNormalized(firstLine);
}

export function isClipboardPaymentFromOwnWallet(payload: string, wallets: ClipboardOwnershipWallet[]): boolean {
  const scriptAddress = stripBitcoinUriToAddress(payload);
  const lightningInvoice = stripLightningScheme(payload);

  return wallets.some(wallet => {
    if (wallet.chain === Chain.ONCHAIN) {
      const address = scriptAddress || payload;
      return Boolean(wallet.isAddressValid?.(address) && wallet.weOwnAddress(address));
    }
    return Boolean(
      wallet.isInvoiceGeneratedByWallet?.(payload) ||
        wallet.isInvoiceGeneratedByWallet?.(lightningInvoice) ||
        wallet.weOwnAddress(payload) ||
        wallet.weOwnAddress(lightningInvoice),
    );
  });
}

export function evaluateClipboardOnForeground(
  clipboard: string | undefined,
  lastSeenHash: string | undefined,
  wallets: ClipboardOwnershipWallet[],
  options?: { ignoreLastSeen?: boolean },
): { offer: ClipboardPayment | null; nextHash: string } {
  const current = clipboard ?? '';
  const nextHash = hashClipboardContent(current);
  if (!options?.ignoreLastSeen && nextHash === lastSeenHash) {
    return { offer: null, nextHash };
  }
  if (!current) {
    return { offer: null, nextHash };
  }
  const classified = classifyClipboardPayment(current);
  if (!classified || isClipboardPaymentFromOwnWallet(classified.payload, wallets)) {
    return { offer: null, nextHash };
  }
  return { offer: classified, nextHash };
}

export type ClipboardAppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export type ClipboardForegroundAction = 'none' | 'read' | 'retry_read';

/** Let Electrum start connecting before the iOS paste prompt. */
export const CLIPBOARD_IDLE_DELAY_MS = 1500;
export const CLIPBOARD_RETRY_DELAY_MS = 800;
export const CLIPBOARD_REFRESH_POLL_MS = 400;

/**
 * Control Center / the iOS paste dialog both move the app to `inactive`.
 * Only re-read clipboard after a real background, or after a paste prompt that
 * returned empty.
 */
export function clipboardActionOnAppStateChange({
  previous,
  next,
  shouldRetryPaste,
}: {
  previous: ClipboardAppState;
  next: ClipboardAppState;
  shouldRetryPaste: boolean;
}): ClipboardForegroundAction {
  if (next !== 'active') return 'none';
  if (shouldRetryPaste) return 'retry_read';
  if (previous === 'background') return 'read';
  return 'none';
}
