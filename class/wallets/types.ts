import bitcoin from 'bitcoinjs-lib';
import { CoinSelectOutput, CoinSelectReturnInput, CoinSelectUtxo } from 'coinselect';

import { BitcoinUnit } from '../../models/bitcoinUnits';
import { HDAezeedWallet } from './hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from './hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';
import { LegacyWallet } from './legacy-wallet';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
import { MultisigHDWallet } from './multisig-hd-wallet';
import { SegwitBech32Wallet } from './segwit-bech32-wallet';
import { SegwitP2SHWallet } from './segwit-p2sh-wallet';
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitBech32Wallet, SLIP39SegwitP2SHWallet } from './slip39-wallets';
import { WatchOnlyWallet } from './watch-only-wallet';

export type Utxo = {
  // Returned by BlueElectrum
  height: number;
  address: string;
  txid: string;
  vout: number;
  value: number;

  // Others
  txhex?: string;
  confirmations?: number;
  wif?: string | false;
};

/**
 * same as coinselect.d.ts/CoinSelectUtxo
 */
export interface CreateTransactionUtxo extends CoinSelectUtxo {}

/**
 * if address is missing and `script.hex` is set - this is a custom script (like OP_RETURN)
 */
export type CreateTransactionTarget = {
  address?: string;
  value?: number;
  script?: {
    length?: number; // either length or hex should be present
    hex?: string;
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

export type LightningTransaction = {
  memo?: string;
  type?: 'user_invoice' | 'payment_request' | 'bitcoind_tx' | 'paid_invoice';
  payment_hash?: string | { data: string };
  category?: 'receive';
  timestamp?: number;
  expire_time?: number;
  ispaid?: boolean;
  walletID?: string;
  value?: number;
  amt?: number;
  fee?: number;
  payment_preimage?: string;
  payment_request?: string;
  description?: string;
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
  confirmations: number;
  time: number;
  blocktime: number;
  received?: number;
  value?: number;

  /**
   * if known, who is on the other end of the transaction (BIP47 payment code)
   */
  counterparty?: string;
};

/**
 * in some cases we add additional data to each tx object so the code that works with that transaction can find the
 * wallet that owns it etc
 */
export type ExtendedTransaction = Transaction & {
  walletID: string;
  walletPreferredBalanceUnit: BitcoinUnit;
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
  | MultisigHDWallet
  | SLIP39LegacyP2PKHWallet
  | SLIP39SegwitBech32Wallet
  | SLIP39SegwitP2SHWallet
  | SegwitBech32Wallet
  | SegwitP2SHWallet
  | WatchOnlyWallet;

export type THDWalletForWatchOnly = HDSegwitBech32Wallet | HDSegwitP2SHWallet | HDLegacyP2PKHWallet;
