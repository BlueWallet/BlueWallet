type Utxo = {
  height: number;
  value: number;
  address: string;
  txId: string;
  vout: number;
  wif?: string;
};

export type ElectrumTransaction = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: {
    txid: string;
    vout: number;
    scriptSig: { asm: string; hex: string };
    txinwitness: string[];
    sequence: number;
    addresses?: string[];
  }[];
  vout: {
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: string;
      addresses: string[];
    };
  }[];
  blockhash: string;
  confirmations?: number;
  time: number;
  blocktime: number;
};

type MempoolTransaction = {
  height: 0;
  tx_hash: string; // eslint-disable-line camelcase
  fee: number;
};

export async function connectMain(): Promise<void>;

export async function waitTillConnected(): Promise<boolean>;

export function forceDisconnect(): void;

export function getBalanceByAddress(address: string): Promise<{ confirmed: number; unconfirmed: number }>;

export function multiGetUtxoByAddress(addresses: string[]): Promise<Record<string, Utxo[]>>;

// TODO: this function returns different results based on the value of `verbose`, consider splitting it into two
export function multiGetTransactionByTxid(
  txIds: string[],
  batchsize: number = 45,
  verbose: true = true,
): Promise<Record<string, ElectrumTransaction>>;
export function multiGetTransactionByTxid(txIds: string[], batchsize: number, verbose: false): Promise<Record<string, string>>;

export function getTransactionsByAddress(address: string): ElectrumTransaction[];

export function getMempoolTransactionsByAddress(address: string): Promise<MempoolTransaction[]>;

export function estimateCurrentBlockheight(): number;

export interface ElectrumHistory {
  tx_hash: string; // eslint-disable-line camelcase
  height: number;
  address: string;
}

export function multiGetHistoryByAddress(addresses: string[]): Promise<Record<string, ElectrumHistory[]>>;

export function estimateFees(): Promise<{ fast: number; medium: number; slow: number }>;

export function broadcastV2(txhex: string): Promise<string>;

export function getTransactionsFullByAddress(address: string): Promise<ElectrumTransaction[]>;

export function txhexToElectrumTransaction(txhes: string): ElectrumTransaction;
