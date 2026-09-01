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
    const address = stripBitcoinUriToAddress(both.bitcoin);
    const invoice = stripLightningScheme(both.lndInvoice);
    if (contacts.isAddressValid(address) && isBolt11Invoice(invoice)) {
      return { kind: ClipboardPaymentKind.Bitcoin, payload: text };
    }
    if (contacts.isAddressValid(address)) {
      return { kind: ClipboardPaymentKind.Bitcoin, payload: both.bitcoin };
    }
  }

  const scriptAddress = stripBitcoinUriToAddress(text);
  if (scriptAddress && contacts.isAddressValid(scriptAddress)) {
    return { kind: ClipboardPaymentKind.Bitcoin, payload: text };
  }

  if (contacts.isPaymentCodeValid(text)) {
    return { kind: ClipboardPaymentKind.Bitcoin, payload: text };
  }

  const invoice = stripLightningScheme(text);
  if (isBolt11Invoice(invoice)) {
    return { kind: ClipboardPaymentKind.Lightning, payload: text };
  }

  if (isDecodedLnurl(text)) {
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

export type ClipboardForegroundAction = 'none' | 'read' | 'retry_read' | 'flush_pending' | 'resume_scheduled';

/** Let Electrum start connecting before the iOS paste prompt. */
export const CLIPBOARD_IDLE_DELAY_MS = 1500;
export const CLIPBOARD_RETRY_DELAY_MS = 800;
export const CLIPBOARD_RESUME_DELAY_MS = 400;
export const CLIPBOARD_REFRESH_POLL_MS = 400;
export const CLIPBOARD_PRESENT_RETRY_MS = 400;
export const CLIPBOARD_PRESENT_SLOW_RETRY_MS = 2000;
export const CLIPBOARD_PRESENT_MAX_ATTEMPTS = 12;
/** Keep polling after iOS Allow Paste; the system dialog often outlives a single follow-up. */
export const CLIPBOARD_PASTE_POLL_MAX_ATTEMPTS = 20;
/** Android 12+ toasts on each clipboard read; keep paste-blocked follow-ups short. */
export const CLIPBOARD_ANDROID_PASTE_POLL_MAX_ATTEMPTS = 3;

export type ClipboardReadRetryReason = 'paste_blocked' | 'empty';

export function clipboardReadRetryLimit(platform: 'ios' | 'android', reason: ClipboardReadRetryReason): number {
  if (reason === 'empty') return 0;
  return platform === 'ios' ? CLIPBOARD_PASTE_POLL_MAX_ATTEMPTS : CLIPBOARD_ANDROID_PASTE_POLL_MAX_ATTEMPTS;
}

export function shouldIgnoreLastSeenOnClipboardRetry(reason: ClipboardReadRetryReason): boolean {
  return reason === 'paste_blocked';
}

export function isWalletUpdateInProgress(status: string): boolean {
  return status !== 'NONE';
}

export function delayForClipboardAction(action: ClipboardForegroundAction): number {
  switch (action) {
    case 'retry_read':
      return CLIPBOARD_RETRY_DELAY_MS;
    case 'resume_scheduled':
      return CLIPBOARD_RESUME_DELAY_MS;
    case 'flush_pending':
      return CLIPBOARD_RESUME_DELAY_MS;
    case 'read':
      return CLIPBOARD_IDLE_DELAY_MS;
    default:
      return CLIPBOARD_IDLE_DELAY_MS;
  }
}

export function delayForClipboardPresentAttempt(attempt: number): number {
  return attempt >= CLIPBOARD_PRESENT_MAX_ATTEMPTS ? CLIPBOARD_PRESENT_SLOW_RETRY_MS : CLIPBOARD_PRESENT_RETRY_MS;
}

/**
 * Control Center / the iOS paste dialog both move the app to `inactive`.
 * Only re-read clipboard after a real background, or after a paste prompt that
 * returned empty / could not present a sheet yet. An interrupted idle wait
 * (`hasScheduledCheck`) resumes without treating Control Center as a new copy.
 */
export function clipboardActionOnAppStateChange({
  previous,
  next,
  hasPendingOffer,
  shouldRetryPaste,
  hasScheduledCheck = false,
}: {
  previous: ClipboardAppState;
  next: ClipboardAppState;
  hasPendingOffer: boolean;
  shouldRetryPaste: boolean;
  hasScheduledCheck?: boolean;
}): ClipboardForegroundAction {
  if (next !== 'active') return 'none';
  if (hasPendingOffer) return 'flush_pending';
  if (shouldRetryPaste) return 'retry_read';
  if (previous === 'background') return 'read';
  if (hasScheduledCheck) return 'resume_scheduled';
  return 'none';
}
