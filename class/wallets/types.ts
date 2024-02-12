import bitcoin from 'bitcoinjs-lib';
import { CoinSelectOutput, CoinSelectReturnInput } from 'coinselect';
import { HDAezeedWallet } from './hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from './hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';
import { LegacyWallet } from './legacy-wallet';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
import { LightningLdkWallet } from './lightning-ldk-wallet';
import { MultisigHDWallet } from './multisig-hd-wallet';
import { SegwitBech32Wallet } from './segwit-bech32-wallet';
import { SegwitP2SHWallet } from './segwit-p2sh-wallet';
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitBech32Wallet, SLIP39SegwitP2SHWallet } from './slip39-wallets';
import { WatchOnlyWallet } from './watch-only-wallet';

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

export type TWallet =
  | HDAezeedWallet
  | HDLegacyBreadwalletWallet
  | HDLegacyElectrumSeedP2PKHWallet
  | HDLegacyP2PKHWallet
  | HDSegwitBech32Wallet
  | HDSegwitElectrumSeedP2WPKHWallet
  | HDSegwitP2SHWallet
  | LegacyWallet
  | LightningCustodianWallet
  | LightningLdkWallet
  | MultisigHDWallet
  | SLIP39LegacyP2PKHWallet
  | SLIP39SegwitBech32Wallet
  | SLIP39SegwitP2SHWallet
  | SegwitBech32Wallet
  | SegwitP2SHWallet
  | WatchOnlyWallet;
