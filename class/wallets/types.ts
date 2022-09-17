import bitcoin from 'bitcoinjs-lib';
import { CoinSelectOutput, CoinSelectReturnInput } from 'coinselect';

export type Utxo = {
  // Returned by BlueElectrum
  height: number;
  address: string;
  txId: string;
  vout: number;
  value: number;

  // Others
  txhex?: string;
  txid?: string; // TODO: same as txId, do we really need it?
  confirmations?: number;
  amount?: number; // TODO: same as value, do we really need it?
  wif?: string | false;
};

/**
 * basically the same as coinselect.d.ts/CoinselectUtxo
 * and should be unified as soon as bullshit with txid/txId is sorted
 */
export type CreateTransactionUtxo = {
  txId: string;
  txid: string; // TODO: same as txId, do we really need it?
  txhex: string;
  vout: number;
  value: number;
  script?: {
    length: number;
  };
};

export type CreateTransactionResult = {
  tx?: bitcoin.Transaction;
  inputs: CoinSelectReturnInput[];
  outputs: CoinSelectOutput[];
  fee: number;
  psbt: bitcoin.Psbt;
};

type TransactionInput = {
  txid: string;
  vout: number;
  scriptSig: { asm: string; hex: string };
  txinwitness: string[];
  sequence: number;
  addresses?: string[];
  address?: string;
  value?: number;
};

export type TransactionOutput = {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    reqSigs: number;
    type: string;
    addresses: string[];
  };
};

export type Transaction = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  blockhash: string;
  confirmations?: number;
  time: number;
  blocktime: number;
  received?: number;
  value?: number;
};
