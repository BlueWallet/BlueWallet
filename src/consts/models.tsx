import { VaultTxType, Transaction as BtcTransaction, ECPair } from 'bitcoinjs-lib';
import { Dayjs } from 'dayjs';
import React from 'react';
import { KeyboardType, StyleProp, ViewStyle, Platform } from 'react-native';
import { ButtonProps } from 'react-native-elements';

import { FastImageSource } from 'app/components';
import {
  HDSegwitP2SHAirWallet,
  HDSegwitP2SHArWallet,
  HDSegwitBech32Wallet,
  SegwitP2SHWallet,
  HDSegwitP2SHWallet,
} from 'app/legacy';

export const CONST = {
  pinCodeLength: 4,
  transactionMinPasswordLength: 8,
  allWallets: 'All wallets',
  receive: 'receive',
  send: 'send',
  webGeneratorUrl: 'keygenerator.bitcoinvault.global',
  mnemonicWordsAmount: 12,
  satoshiInBtc: 100000000,
  preferredBalanceUnit: 'BTCV',
  alertBlocks: 144,
  confirmationsBlocks: 6,
  android: 'android',
  ios: 'ios',
  transactionPassword: 'transactionPassword',
  pin: 'pin',
  defaultLanguage: 'en',
  maxAddressLength: 48,
  tcVersionRequired: 1,
  tcVersion: 'tcVersion',
};

export const defaultKeyboardType = Platform.select({ android: 'visible-password', ios: 'default' }) as KeyboardType;

export interface SocketOptions {
  host: string;
  port: number;
  rejectUnauthorized: boolean;
}

export type SocketCallback = (address: string) => void;
export const ELECTRUM_VAULT_SEED_PREFIXES = {
  SEED_PREFIX: '01', // Standard wallet
  SEED_PREFIX_SW: '100', // Segwit wallet
  SEED_PREFIX_2FA: '101', // Two - factor authentication
  SEED_PREFIX_2FA_SW: '102', // Two-factor auth, using segwit
};

export enum TransactionStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  'CANCELED-DONE' = 'CANCELED-DONE',
}

enum AdditionalTags {
  BLOCKED = 'BLOCKED',
  UNBLOCKED = 'UNBLOCKED',
}

export type TagsType = TransactionStatus | AdditionalTags;

export const Tags = { ...TransactionStatus, ...AdditionalTags };

export const ELECTRUM_VAULT_SEED_KEY = 'Seed version';

export enum FlowType {
  password = 'password',
  newPin = 'newPin',
}

export enum Route {
  PasswordNavigator = 'PasswordNavigator',
  Dashboard = 'Dashboard',
  RecoverySend = 'RecoverySend',
  RecoverySeed = 'RecoverySeed',
  AuthenticatorList = 'AuthenticatorList',
  RecoveryTransactionList = 'RecoveryTransactionList',
  ImportAuthenticator = 'ImportAuthenticator',
  OptionsAuthenticator = 'OptionsAuthenticator',
  CreateWalletSuccess = 'CreateWalletSuccess',
  DeleteEntity = 'DeleteEntity',
  CreateAuthenticatorPublicKey = 'CreateAuthenticatorPublicKey',
  CreateAuthenticatorSuccess = 'CreateAuthenticatorSuccess',
  CreateAuthenticator = 'CreateAuthenticator',
  WalletDetails = 'WalletDetails',
  ContactList = 'ContactList',
  ContactDetails = 'ContactDetails',
  CreateContact = 'CreateContact',
  DeleteContact = 'DeleteContact',
  ContactQRCode = 'ContactQRCode',
  Settings = 'Settings',
  Message = 'Message',
  CreateWallet = 'CreateWallet',
  ImportWallet = 'ImportWallet',
  ExportWallet = 'ExportWallet',
  ExportWalletXpub = 'ExportWalletXub',
  TransactionDetails = 'TransactionDetails',
  ReceiveCoins = 'ReceiveCoins',
  SendCoins = 'SendCoins',
  SendCoinsConfirm = 'SendCoinsConfirm',
  EditText = 'EditText',
  AboutUs = 'AboutUs',
  SelectLanguage = 'SelectLanguage',
  ActionSheet = 'ActionSheet',
  SendTransactionDetails = 'SendTransactionDetailsScreen',
  ScanQrCode = 'ScanQrCode',
  ChooseContactList = 'ChooseContactList',
  MainCardStackNavigator = 'MainCardStackNavigator',
  CurrentPin = 'CurrentPin',
  CreatePin = 'CreatePin',
  ConfirmPin = 'ConfirmPin',
  CreateTransactionPassword = 'CreateTransactionPassword',
  ConfirmTransactionPassword = 'ConfirmTransactionPassword',
  AdvancedOptions = 'AdvancedOptions',
  UnlockTransaction = 'UnlockTransaction',
  FilterTransactions = 'FilterTransactions',
  IntegrateKey = 'IntegrateKey',
  ImportWalletChooseType = 'ImportWalletChooseType',
  ChunkedQrCode = 'ChunkedQrCode',
}

/** Only for strongly typed RadioButton's values in ImportWalletChooseTypeScreen */
export type ImportWalletType = '3-Key Vault' | '2-Key Vault' | 'Standard';

export type WalletType = typeof HDSegwitP2SHAirWallet | typeof HDSegwitP2SHArWallet | StandardWalletType;

export type StandardWalletType = typeof HDSegwitP2SHWallet | typeof SegwitP2SHWallet | typeof HDSegwitBech32Wallet;

export interface Wallet {
  balance: number;
  hideBalance: boolean;
  preferredBalanceUnit: string;
  label: string;
  chain: string;
  num_addresses: number;
  transactions: Transaction[];
  getBalance: () => number;
  getLatestTransactionTime: () => void;
  getLabel: () => string;
  setLabel: (label: string) => void;
  getAddress: () => any;
  getSecret: () => string;
  getXpub: () => Promise<string>;
  address?: string;
  secret: string;
  type: string;
  typeReadable: string;
  unconfirmed_balance: number;
  confirmed_balance: number;
  outgoing_balance: number;
  incoming_balance: number;
  utxo: any[];
  _xpub: string;
  getID: () => string;
  weOwnAddress: (clipboard: string) => boolean;
  isInvoiceGeneratedByWallet?: (clipboard: string) => void;
  getPreferredBalanceUnit: () => string;
  isOutputScriptMine: (script: Uint8Array) => boolean;
  setMnemonic: (mnemonic: string) => void;
  generate: () => void;
  fetchBalance: () => void;
  fetchUtxos: () => void;
  fetchTransactions: () => void;
  isAnyOfAddressesMine: (addresses: string[]) => boolean;
  id: string;
  getScriptHashes: () => string[];
  getAddressForTransaction: () => string;
  password?: string;
}

export interface ActionMeta {
  onSuccess?: Function;
  onFailure?: Function;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
}

export enum TxType {
  NONVAULT = 'NONVAULT',
  ALERT_PENDING = 'ALERT_PENDING',
  ALERT_CONFIRMED = 'ALERT_CONFIRMED',
  ALERT_RECOVERED = 'ALERT_RECOVERED',
  INSTANT = 'INSTANT',
  RECOVERY = 'RECOVERY',
}
export interface Transaction {
  hash: string;
  txid: string;
  value: number;
  time?: number; // not present right after transaction is done
  received: string; // date string, same value as 'time' field but human readable
  walletLabel: string;
  confirmations: number;
  tx_type: TxType;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  note?: string;
  fee?: number;
  blockedAmount?: number;
  unblockedAmount?: number;
  toExternalAddress?: string;
  toInternalAddress?: string;
  recoveredTxsCounter?: number;
  valueWithoutFee: number;
  returnedFee?: number;
  isRecoveredAlertToMe?: boolean;
  height: number;
  status: TransactionStatus;
  walletPreferredBalanceUnit: string;
  tags: TagsType[];
}

export interface EnhancedTransaction extends Transaction {
  walletPreferredBalanceUnit: string;
  walletId: string;
  walletLabel: string;
  walletTypeReadable?: string;
}

export interface AppSettings {
  isPinSetup: boolean;
}

export interface Filters {
  isFilteringOn?: boolean;
  address?: string;
  dateKey?: number;
  isCalendarVisible?: boolean;
  fromDate?: string;
  toDate?: string;
  fromAmount?: string;
  toAmount?: string;
  transactionType?: string;
  transactionStatus?: string;
  transactionReceivedTags: TagsType[];
  transactionSentTags: TagsType[];
}

export interface TransactionOutput {
  addresses: string[];
  value: number;
  scriptPubKey: { asm: string; addresses: string[]; hex: string; type: string; reqSigs: number };
  n: number;
}

export interface TransactionInput {
  addresses: string[];
  txid: string;
  vout: number;
  value: number;
  scriptSig: { asm: string; hex: string };
  sequence: number;
  txinwitness: string[];
}

export interface Utxo {
  address: string;
  height: number;
  spend_tx_num: number;
  tx_hash: string;
  tx_pos: number;
  txid: string;
  value: number;
  vout: number;
  wif: string;
}

export interface Recipient {
  address: string;
  value: number;
}

export interface FinalizedPSBT {
  tx: BtcTransaction;
  vaultTxType: VaultTxType;
  recipients: Recipient[];
  fee: number;
}

export type MainTabNavigatorParams = {
  [Route.Dashboard]: undefined;
  [Route.AuthenticatorList]: undefined;
  [Route.ContactList]: undefined;
  [Route.Settings]: undefined;
};

export type RootStackParams = {
  [Route.MainCardStackNavigator]: undefined;
  [Route.ActionSheet]: { wallets: Wallet[]; selectedIndex: number; onPress: (index: number) => void };
  [Route.UnlockTransaction]: { onSuccess: () => void };
  [Route.PasswordNavigator]: undefined;
  [Route.EditText]: {
    title: string;
    onSave: (value: string) => void;
    label: string;
    header?: React.ReactNode;
    value?: string;
    validate?: (value: string) => string | undefined;
    validateOnSave?: (value: string) => void;
    keyboardType?: KeyboardType;
    maxLength?: number;
    emptyValueAllowed?: boolean;
  };
  [Route.Message]: {
    title: string;
    source: FastImageSource;
    description: string;
    buttonProps?: ButtonProps;
    imageStyle?: StyleProp<ViewStyle>;
    asyncTask?: () => void;
  };
  [Route.ExportWallet]: { wallet: Wallet };
  [Route.ExportWalletXpub]: { wallet: Wallet };
  [Route.DeleteContact]: { contact?: Contact };
  [Route.SendTransactionDetails]: {
    fee: number;
    recipients: any;
    tx: any;
    satoshiPerByte: any;
    wallet: Wallet;
    size: number;
    feeSatoshi: number;
  };
};

export type PasswordNavigatorParams = {
  [Route.CreatePin]: {
    flowType: string;
  };
  [Route.ConfirmPin]: {
    flowType: string;
    pin: string;
  };
  [Route.Message]: {
    title: string;
    source: FastImageSource;
    description: string;
    buttonProps?: ButtonProps;
    imageStyle?: StyleProp<ViewStyle>;
    asyncTask?: () => void;
  };
  [Route.CreateTransactionPassword]: undefined;
  [Route.ConfirmTransactionPassword]: { setPassword: string };
};

export type MainCardStackNavigatorParams = {
  [Route.Dashboard]: { activeWallet?: Wallet } | undefined;
  [Route.MainCardStackNavigator]: undefined;
  [Route.CreateWallet]: undefined;
  [Route.ImportWallet]: { walletType: ImportWalletType };
  [Route.CreateTransactionPassword]: undefined;
  [Route.WalletDetails]: { id: string };
  [Route.CreateContact]: { address?: string } | undefined;
  [Route.ContactDetails]: { contact: Contact };
  [Route.ContactQRCode]: { contact: Contact };
  [Route.TransactionDetails]: { transaction: EnhancedTransaction };
  [Route.ReceiveCoins]: { id: string };
  [Route.SendCoins]: { fromSecret?: string; fromAddress?: string; fromWallet?: Wallet; toAddress?: string };
  [Route.SendCoinsConfirm]: {
    fee: number;
    feeSatoshi?: number;
    memo?: string;
    recipients: any;
    size?: number;
    txDecoded: BtcTransaction;
    isAlert?: boolean;
    satoshiPerByte: any;
    fromWallet: Wallet;
    pendingAmountDecrease?: number;
    headerTitle?: string;
    buttonTitle?: string;
    successMsgDesc?: string;
  };
  [Route.RecoveryTransactionList]: { wallet: Wallet };
  [Route.RecoverySend]: { transactions: Transaction[]; wallet: any };
  [Route.RecoverySeed]: {
    onSubmit: Function;
    subtitle: string;
    description: string;
    buttonText: string;
    onBackArrow?: () => void;
    mnemonic?: Array<string>;
  };
  [Route.ScanQrCode]: { onBarCodeScan: (code: string) => void };
  [Route.ChooseContactList]: {
    onContactPress?: (data: string) => void;
    title?: string;
  };
  [Route.Settings]: undefined;
  [Route.SelectLanguage]: undefined;
  [Route.AboutUs]: undefined;
  [Route.AdvancedOptions]: undefined;
  [Route.CreatePin]: {
    flowType: string;
  };
  [Route.CurrentPin]: undefined;
  [Route.ConfirmPin]: {
    flowType: string;
    pin: string;
  };
  [Route.FilterTransactions]: { onFilterPress: () => void };
  [Route.CreateAuthenticator]: undefined;
  [Route.AuthenticatorList]: undefined;
  [Route.CreateAuthenticatorPublicKey]: { id: string };
  [Route.CreateAuthenticatorSuccess]: { id: string };
  [Route.DeleteEntity]: { onConfirm: () => void; name: string | undefined; subtitle: string; title: string };
  [Route.ImportAuthenticator]: undefined;
  [Route.OptionsAuthenticator]: { id: string };
  [Route.CreateWalletSuccess]: { secret: string };
  [Route.IntegrateKey]: {
    onBarCodeScan: (text: string) => void;
    title: string;
    description: string;
    withLink?: boolean;
    headerTitle?: string;
    onBackArrow?: () => void;
  };
  [Route.ImportWalletChooseType]: undefined;
  [Route.ChunkedQrCode]: {
    chunkNo: number;
    chunksQuantity: number;
    onScanned: () => void;
  };
};
export type DateType = Date | Dayjs;
export interface Authenticator {
  keyPair: ECPair.ECPairInterface | null;
  publicKey: string;
  name: string;
  QRCode: string;
  id: string;
  init: ({ mnemonic }: { mnemonic?: string }) => void;
  pin: string;
  secret: string;
  createdAt: Dayjs;
}

export type GlobalParams = MainCardStackNavigatorParams &
  PasswordNavigatorParams &
  RootStackParams &
  MainTabNavigatorParams;
