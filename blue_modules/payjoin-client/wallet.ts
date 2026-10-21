import { Psbt } from 'bitcoinjs-lib';

export interface IPayjoinClientWallet {
  /** Fully signed, finalizable original (non-payjoin) PSBT to submit to the receiver. */
  getPsbt(): Promise<Psbt>;
  /** Sign and finalize our inputs in the receiver's proposal; receiver inputs are already finalized. */
  signPsbt(payjoinProposal: Psbt): Promise<Psbt>;
  /** Broadcast; return '' on success, error message string on failure. */
  broadcastTx(txHex: string): Promise<string>;
  /** Schedule broadcast of the original tx after `milliSeconds`; must not throw. */
  scheduleBroadcastTx(txHex: string, milliSeconds: number): Promise<void>;
}
