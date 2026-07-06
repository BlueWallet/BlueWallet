// Display state for the transaction detail screen.
//
// On-chain rows (a real Bitcoin txid is present in `hash`) keep the existing
// confirmations-based logic. Ark/Lightning rows synthesized by
// LightningArkWallet.getTransactions() carry no on-chain `hash` and never a
// `confirmations` field, so their state is derived from row semantics instead.
// The off-chain branch mirrors the off-chain cases of
// components/TransactionListItem.tsx `listTitleKey` so the list row and the detail
// screen always agree. A `boarding-utxo-` row is a refill still awaiting
// settlement and is pending (matches TransactionListItem.isPendingRefill); a
// settled `boarding-` refill is a confirmed receive. Today only `bitcoind_tx` Ark
// rows reach the detail screen (swap rows route to LNDViewInvoice); the invoice
// cases are handled defensively.
export type TxDisplayState = 'pending' | 'sent' | 'received';

export function isOnChainTransaction(tx: any): boolean {
  return typeof tx?.hash === 'string' && tx.hash.length > 0;
}

export function formatConfirmationsForDisplay(confirmations: unknown): string | undefined {
  const parsed = Number(confirmations);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed > 6 ? '6+' : String(parsed);
}

export function resolveTransactionNoteMetadataKey(tx: { hash?: string; txid?: string } | null | undefined): string | undefined {
  if (!tx) return undefined;
  const txid = tx.txid;
  // Ark refills keep the synthetic boarding- id as the note key (not the on-chain hash).
  // Pending rows (`boarding-utxo-<txid>:<vout>`) settle into `boarding-<txid>`, so
  // normalize to the settled form — otherwise a note saved while pending is orphaned.
  if (typeof txid === 'string' && txid.startsWith('boarding-utxo-')) {
    return `boarding-${txid.slice('boarding-utxo-'.length).split(':')[0]}`;
  }
  if (typeof txid === 'string' && txid.startsWith('boarding-')) return txid;
  return tx.hash ?? txid;
}

export function resolveTransactionNote(
  tx: { hash?: string; txid?: string; memo?: string } | null | undefined,
  txMetadata: Record<string, { memo?: string } | undefined>,
): { metadataKey: string | undefined; memo: string } {
  if (!tx) return { metadataKey: undefined, memo: '' };
  const metadataKey = resolveTransactionNoteMetadataKey(tx);
  const saved = (metadataKey && txMetadata[metadataKey]?.memo) || '';
  return { metadataKey, memo: (saved || tx.memo || '').trim() };
}

export function resolveTxDisplayState(tx: any): TxDisplayState {
  // Ark refills: check synthetic txid before generic on-chain logic. Rows carry
  // the real boarding txid in `hash` but often no `confirmations` until Electrum
  // responds — without this, settled refills flash "pending" on open.
  if (typeof tx?.txid === 'string' && tx.txid.startsWith('boarding-utxo-')) return 'pending';
  if (typeof tx?.txid === 'string' && tx.txid.startsWith('boarding-')) return 'received';

  if (isOnChainTransaction(tx)) {
    const confs = Number(tx?.confirmations);
    const pending = Number.isFinite(confs) ? confs <= 0 : !tx?.confirmations;
    if (pending) return 'pending';
    return Number(tx?.value) < 0 ? 'sent' : 'received';
  }
  // Off-chain Ark/Lightning row — never confirmations-based.
  switch (tx?.type) {
    case 'paid_invoice':
      return 'sent';
    case 'user_invoice':
    case 'payment_request':
      return tx?.ispaid ? 'received' : 'pending';
    default: // settled refill (boarding-<txid>), native Ark legs (ark-), any other hash-less row
      return Number(tx?.value) < 0 ? 'sent' : 'received';
  }
}
