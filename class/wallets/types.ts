import bitcoin from 'bitcoinjs-lib';
import { CoinSelectOutput, CoinSelectReturnInput, CoinSelectUtxo } from 'coinselect';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';


export enum WalletType {
  AbstractWallet = 'abstract',
  AbstractHDWallet = 'abstracthd',
  HDAezeed = 'HDAezeedWallet',
  HDLegacyBreadwallet = 'HDLegacyBreadwallet',
  HDLegacyElectrumSeedP2PKH = 'HDlegacyElectrumSeedP2PKH',
  HDLegacyP2PKH = 'HDlegacyP2PKH',
  HDSegwitBech32 = 'HDsegwitBech32',
  HDSegwitElectrumSeedP2WPKH = 'HDSegwitElectrumSeedP2WPKHWallet',
  HDSegwitP2SH = 'HDsegwitP2SH',
  Legacy = 'legacy',
  LightningCustodian = 'lightningCustodianWallet',
  LightningLdk = 'lightningLdk',
  MultisigHD = 'HDmultisig',
  SLIP39LegacyP2PKH = 'SLIP39legacyP2PKH',
  SLIP39SegwitBech32 = 'SLIP39segwitBech32',
  SLIP39SegwitP2SH = 'SLIP39segwitP2SH',
  SegwitBech32 = 'segwitBech32',
  SegwitP2SH = 'segwitP2SH',
  WatchOnly = 'watchOnly',
  AbstractHDElectrumWallet = 'AbstractHDElectrumWallet',
}

type WalletClassMapping = {
  [key in WalletType]: () => Promise<any>;
};

export const walletClassMapping: WalletClassMapping = {
  [WalletType.AbstractWallet]: () => import('./abstract-wallet').then(m => m.AbstractWallet),
  [WalletType.AbstractHDWallet]: () => import('./abstract-hd-wallet').then(m => m.AbstractHDWallet),
  [WalletType.HDAezeed]: () => import('./hd-aezeed-wallet').then(m => m.HDAezeedWallet),
  [WalletType.HDLegacyBreadwallet]: () => import('./hd-legacy-breadwallet-wallet').then(m => m.HDLegacyBreadwalletWallet),
  [WalletType.HDLegacyElectrumSeedP2PKH]: () => import('./hd-legacy-electrum-seed-p2pkh-wallet').then(m => m.HDLegacyElectrumSeedP2PKHWallet),
  [WalletType.HDLegacyP2PKH]: () => import('./hd-legacy-p2pkh-wallet').then(m => m.HDLegacyP2PKHWallet),
  [WalletType.AbstractHDElectrumWallet]: () => import('./abstract-hd-electrum-wallet').then(m => m.AbstractHDElectrumWallet),
  [WalletType.HDSegwitBech32]: () => import('./hd-segwit-bech32-wallet').then(m => m.HDSegwitBech32Wallet),
  [WalletType.HDSegwitElectrumSeedP2WPKH]: () => import('./hd-segwit-electrum-seed-p2wpkh-wallet').then(m => m.HDSegwitElectrumSeedP2WPKHWallet),
  [WalletType.HDSegwitP2SH]: () => import('./hd-segwit-p2sh-wallet').then(m => m.HDSegwitP2SHWallet),
  [WalletType.Legacy]: () => import('./legacy-wallet').then(m => m.LegacyWallet),
  [WalletType.LightningCustodian]: () => import('./lightning-custodian-wallet').then(m => m.LightningCustodianWallet),
  [WalletType.LightningLdk]: () => import('./lightning-ldk-wallet').then(m => m.LightningLdkWallet),
  [WalletType.MultisigHD]: () => import('./multisig-hd-wallet').then(m => m.MultisigHDWallet),
  [WalletType.SLIP39LegacyP2PKH]: () => import('./slip39-wallets').then(m => ({ SLIP39LegacyP2PKHWallet: m.SLIP39LegacyP2PKHWallet })),
  [WalletType.SLIP39SegwitBech32]: () => import('./slip39-wallets').then(m => ({ SLIP39SegwitBech32Wallet: m.SLIP39SegwitBech32Wallet })),
  [WalletType.SLIP39SegwitP2SH]: () => import('./slip39-wallets').then(m => ({ SLIP39SegwitP2SHWallet: m.SLIP39SegwitP2SHWallet })),
  [WalletType.SegwitBech32]: () => import('./segwit-bech32-wallet').then(m => m.SegwitBech32Wallet),
  [WalletType.SegwitP2SH]: () => import('./segwit-p2sh-wallet').then(m => m.SegwitP2SHWallet),
  [WalletType.WatchOnly]: () => import('./watch-only-wallet').then(m => m.WatchOnlyWallet),
};

export type WalletClass<T extends WalletType> = T extends keyof WalletClassMapping
  ? Awaited<ReturnType<WalletClassMapping[T]>>
  : never;

export type TWallet = WalletClass<WalletType>;
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

export type THDWalletForWatchOnly = HDSegwitBech32Wallet | HDSegwitP2SHWallet | HDLegacyP2PKHWallet;