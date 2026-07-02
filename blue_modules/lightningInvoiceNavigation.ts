import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { LightningTransaction, TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import { isSyntheticOffChainTxKey } from './transactionDisplayState';
import { LND_INVOICE_MODAL_PARENTS, LND_INVOICE_MODAL_ROOT } from '../navigation/LNDInvoiceStackParamList';

export type LightningDetailRow = LightningTransaction & { txid?: string; hash?: string; walletID?: string };

export function normalizeLightningDetailRow(item: LightningDetailRow): LightningDetailRow {
  const hash = typeof item.hash === 'string' ? item.hash : undefined;
  const txid = typeof item.txid === 'string' ? item.txid : undefined;
  if (!txid && hash && hash.startsWith('ark-')) {
    return { ...item, txid: hash };
  }
  return item;
}

export function resolveLightningInvoiceRow(item: LightningDetailRow, wallet: TWallet): LightningDetailRow | undefined {
  if (wallet.chain !== Chain.OFFCHAIN) return undefined;

  const normalizedItem = normalizeLightningDetailRow(item);

  if (normalizedItem.payment_request || normalizedItem.payment_hash) return normalizedItem;
  if (normalizedItem.type === 'user_invoice' || normalizedItem.type === 'payment_request' || normalizedItem.type === 'paid_invoice') {
    return normalizedItem;
  }
  if (typeof normalizedItem.txid === 'string' && normalizedItem.txid.startsWith('swap-')) return normalizedItem;

  if (wallet.type !== LightningArkWallet.type) return undefined;

  const arkKey =
    (typeof normalizedItem.txid === 'string' && normalizedItem.txid.startsWith('ark-') ? normalizedItem.txid : undefined) ||
    (typeof normalizedItem.hash === 'string' && normalizedItem.hash.startsWith('ark-') ? normalizedItem.hash : undefined);
  if (!arkKey || (normalizedItem.value ?? 0) <= 0) return undefined;

  const arkWallet = wallet as LightningArkWallet;
  const enrichedRow = arkWallet.getTransactions().find(t => t.txid === arkKey && t.payment_request);
  if (enrichedRow) return enrichedRow as LightningDetailRow;

  return arkWallet.findInvoiceForArkLeg(normalizedItem);
}

export function isLightningDetailRow(item: LightningDetailRow, wallet?: TWallet): boolean {
  if (!wallet || wallet.chain !== Chain.OFFCHAIN) return false;

  const txid = typeof item.txid === 'string' ? item.txid : undefined;
  const hash = typeof item.hash === 'string' ? item.hash : undefined;
  if (txid?.startsWith('boarding-') || (hash && isSyntheticOffChainTxKey(hash) && hash.startsWith('boarding-'))) return false;

  if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice') return true;
  if (item.payment_request || item.payment_hash) return true;
  if (txid?.startsWith('swap-') || hash?.startsWith('swap-')) return true;

  return resolveLightningInvoiceRow(item, wallet) !== undefined;
}

export function isLightningInvoiceExpired(invoice: LightningTransaction): boolean {
  if (!invoice.timestamp || !invoice.expire_time) return false;
  const now = Math.floor(Date.now() / 1000);
  return invoice.timestamp + invoice.expire_time < now;
}

/** Unpaid receive invoices open the QR receive screen; in-flight receives and sends use the status screen. */
export function shouldOpenLightningReceiveScreen(
  invoice: LightningTransaction & { txid?: string; fundsInFlight?: boolean },
): boolean {
  if (!invoice.payment_request) return false;
  if (invoice.ispaid || invoice.type === 'paid_invoice') return false;
  if (invoice.failed) return false;
  if (invoice.type === 'payment_request') return false;
  if (invoice.type !== 'user_invoice') return false;
  if (isLightningInvoiceExpired(invoice)) return false;
  if (invoice.fundsInFlight === true) return false;
  return true;
}

export function isLightningInvoiceModalParent(routeName?: string): boolean {
  return LND_INVOICE_MODAL_PARENTS.some(parentRoute => parentRoute === routeName);
}

export function getLightningInvoiceModalNavigation(
  invoice: LightningTransaction & { txid?: string; fundsInFlight?: boolean },
  walletID: string,
) {
  return {
    screen: 'LNDReceiveInvoice' as const,
    params: { invoice, walletID },
  };
}

export function navigateToLightningInvoiceModal(
  navigate: (name: typeof LND_INVOICE_MODAL_ROOT, params: ReturnType<typeof getLightningInvoiceModalNavigation>) => void,
  invoice: LightningTransaction & { txid?: string; fundsInFlight?: boolean },
  walletID: string,
) {
  navigate(LND_INVOICE_MODAL_ROOT, getLightningInvoiceModalNavigation(invoice, walletID));
}

export function navigateToLightningInvoice(
  navigate: {
    (name: typeof LND_INVOICE_MODAL_ROOT, params: ReturnType<typeof getLightningInvoiceModalNavigation>): void;
    (name: 'LNDViewInvoice', params: { invoice: LightningTransaction | string; walletID: string }): void;
  },
  invoice: LightningTransaction & { txid?: string; fundsInFlight?: boolean },
  walletID: string,
) {
  if (shouldOpenLightningReceiveScreen(invoice)) {
    navigateToLightningInvoiceModal(navigate, invoice, walletID);
    return;
  }

  navigate('LNDViewInvoice', { invoice, walletID });
}
