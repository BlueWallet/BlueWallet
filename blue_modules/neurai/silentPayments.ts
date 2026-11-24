/**
 * NIP-047 silent payments: helpers shared by the receive and send screens.
 * The protocol itself lives in `@neuraiproject/neurai-silent-payments`.
 */

import type { NetworkName } from '@neuraiproject/neurai-silent-payments';
import { isTestnetChain, type NeuraiChainType } from './networkConfig';

/** Accent of everything silent payment in the UI, so it is told apart from the plain address flows. */
export const SILENT_PAYMENT_ACCENT = '#7C3AED';

/** The accent for icons and text on a dark ground, where the deep one hardly shows. */
export const silentPaymentTint = (dark: boolean): string => (dark ? '#d8b4fe' : SILENT_PAYMENT_ACCENT);

/** Network of the payment codes of a wallet chain (`nsp1…` main, `tnsp1…` test). */
export function silentPaymentNetworkFor(chain: NeuraiChainType): NetworkName {
  return isTestnetChain(chain) ? 'test' : 'main';
}

/** True for text shaped like a payment code. The checksum and network are checked when it is used. */
export function looksLikeSilentPaymentCode(text: string): boolean {
  return /^t?nsp1/i.test(text.trim());
}
