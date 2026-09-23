import type { Transaction, LightningTransaction } from '../class/wallets/types';

type SearchableTransaction = Partial<Transaction & LightningTransaction>;

export function matchesTransactionSearch(tx: SearchableTransaction, query: string, memo = ''): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const fields = [
    tx.hash,
    tx.txid,
    memo,
    tx.memo,
    tx.description,
    tx.payment_hash,
    tx.payment_request,
    ...(tx.inputs ?? []).flatMap(input => [input.address, ...(input.addresses ?? [])]),
    ...(tx.outputs ?? []).flatMap(output => output.scriptPubKey?.addresses ?? []),
  ];
  const text = fields.filter(Boolean).join(' ').toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}
