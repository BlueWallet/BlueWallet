/**
 * Checks a transaction signed by the hardware device against the draft the
 * user reviewed, before anything is broadcast (H16).
 *
 * Signing may only add signatures: the version, the lock time, every input
 * (previous output and sequence) and every output (amount and script, which
 * carries the address and any asset transfer) must be byte for byte the ones
 * of the draft, and every input must now carry a signature. The PSBT path
 * already finalizes from the original PSBT; the PQ path returns a raw
 * transaction and had no local check.
 */
import { Transaction } from 'bitcoinjs-lib';
import { Buffer } from 'buffer';

export class SignedTransactionMismatchError extends Error {
  constructor(detail: string) {
    super(`The device returned a transaction that differs from the one you approved (${detail}). Nothing was sent.`);
    this.name = 'SignedTransactionMismatchError';
  }
}

const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

/** @returns the txid of the signed transaction. */
export function assertSignedMatchesDraft(draftHex: string, signedHex: string): string {
  let draft: Transaction;
  let signed: Transaction;
  try {
    draft = Transaction.fromHex(draftHex);
    signed = Transaction.fromHex(signedHex);
  } catch {
    throw new SignedTransactionMismatchError('not a valid transaction');
  }
  if (signed.version !== draft.version) throw new SignedTransactionMismatchError('version');
  if (signed.locktime !== draft.locktime) throw new SignedTransactionMismatchError('lock time');
  if (signed.ins.length !== draft.ins.length) throw new SignedTransactionMismatchError('number of inputs');
  if (signed.outs.length !== draft.outs.length) throw new SignedTransactionMismatchError('number of outputs');

  draft.ins.forEach((input, i) => {
    const out = signed.ins[i];
    if (!same(out.hash, input.hash) || out.index !== input.index) throw new SignedTransactionMismatchError(`input ${i}`);
    if (out.sequence !== input.sequence) throw new SignedTransactionMismatchError(`sequence of input ${i}`);
    const hasSignature = out.witness.length > 0 || out.script.length > 0;
    if (!hasSignature) throw new SignedTransactionMismatchError(`input ${i} is not signed`);
  });
  draft.outs.forEach((output, i) => {
    const out = signed.outs[i];
    if (BigInt(out.value) !== BigInt(output.value)) throw new SignedTransactionMismatchError(`amount of output ${i}`);
    if (!same(out.script, output.script)) throw new SignedTransactionMismatchError(`destination of output ${i}`);
  });
  return signed.getId();
}
