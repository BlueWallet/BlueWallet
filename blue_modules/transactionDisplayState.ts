// Display state for the transaction detail screen.
//
// On-chain rows (a real Bitcoin txid is present in `hash`) keep the existing
// confirmations-based logic. Ark/Lightning rows synthesized by
// LightningArkWallet.getTransactions() carry no on-chain `hash` and never a
// `confirmations` field, so their state is derived from row semantics instead.
// The off-chain branch mirrors the off-chain cases of
// components/TransactionListItem.tsx `listTitleKey` so the list row and the detail
// screen always agree. Today only `bitcoind_tx` Ark rows reach the detail screen
// (swap rows route to LNDViewInvoice); the invoice cases are handled defensively.
export type TxDisplayState = 'pending' | 'sent' | 'received';

export function isOnChainTransaction(tx: any): boolean {
  return typeof tx?.hash === 'string' && tx.hash.length > 0;
}

export function resolveTxDisplayState(tx: any): TxDisplayState {
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
    default: // 'bitcoind_tx' Ark rows (ark-/boarding-/boarding-utxo-) and any other hash-less row
      return Number(tx?.value) < 0 ? 'sent' : 'received';
  }
}
