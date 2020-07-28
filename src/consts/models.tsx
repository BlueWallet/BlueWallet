import { Dayjs } from 'dayjs';
import React from 'react';
import { KeyboardType, StyleProp, ViewStyle } from 'react-native';
import { ButtonProps } from 'react-native-elements';

import { FastImageSource } from 'app/components';

export const CONST = {
  pinCodeLength: 4,
  transactionMinPasswordLength: 8,
  allWallets: 'All wallets',
  receive: 'receive',
  send: 'send',
  webGeneratorUrl: 'www.keygenerator.bitcoinvault.global',
  mnemonicWordsAmount: 12,
  satoshiInBtc: 100000000,
  alertBlocks: 144,
  confirmationsBlocks: 6,
};

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
  EnterPIN = 'EnterPIN',
  ExportAuthenticator = 'ExportAuthenticator',
  ImportAuthenticator = 'ImportAuthenticator',
  CreateWalletSuccess = 'CreateWalletSuccess',
  DeleteEntity = 'DeleteEntity',
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
  ImportWalletQRCode = 'ImportWalletQRCode',
  DeleteWallet = 'DeleteWallet',
  ExportWalletXpub = 'ExportWalletXub',
  TransactionDetails = 'TransactionDetails',
  ReceiveCoins = 'ReceiveCoins',
  SendCoins = 'SendCoins',
  SendCoinsConfirm = 'SendCoinsConfirm',
  EditText = 'EditText',
  ElectrumServer = 'ElectrumServer',
  AboutUs = 'AboutUs',
  SelectLanguage = 'SelectLanguage',
  ReleaseNotes = 'ReleaseNotes',
  ActionSheet = 'ActionSheet',
  SendTransactionDetails = 'SendTransactionDetailsScreen',
  ScanQrCode = 'ScanQrCode',
  ChooseContactList = 'ChooseContactList',
  MainCardStackNavigator = 'MainCardStackNavigator',
  CurrentPin = 'CurrentPin',
  CreatePin = 'CreatePin',
  ConfirmPin = 'ConfirmPin',
  UnlockScreen = 'UnlockScreen',
  CreateTransactionPassword = 'CreateTransactionPassword',
  ConfirmTransactionPassword = 'ConfirmTransactionPassword',
  AdvancedOptions = 'AdvancedOptions',
  UnlockTransaction = 'UnlockTransaction',
  FilterTransactions = 'FilterTransactions',
  IntegrateKey = 'IntegrateKey',
}

export interface Wallet {
  balance: number;
  hideBalance: boolean;
  preferredBalanceUnit: string;
  label: string;
  chain: string;
  num_addresses: number;
  transactions: Transaction[];
  getBalance: () => void;
  getLatestTransactionTime: () => void;
  getLabel: () => string;
  setLabel: (label: string) => void;
  getAddress: () => string;
  getSecret: () => string;
  getXpub: () => Promise<string>;
  address: string;
  secret: string;
  type: string;
  typeReadable: string;
  unconfirmed_balance: number;
  utxo: any[];
  _xpub: string;
  getID: () => string;
  weOwnAddress: (clipboard: string) => void;
  isInvoiceGeneratedByWallet: (clipboard: string) => void;
  getPreferredBalanceUnit: () => string;
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
  RECOVERY = 'RECOVERY',
  INSTANT = 'INSTANT',
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
  inputs: any[];
  outputs: any[];
  note?: string;
  walletPreferredBalanceUnit: string;
}

export interface AppSettings {
  isPinSetup: boolean;
}

export interface Filters {
  isFilteringOn: boolean;
  dateKey?: number;
  isCalendarVisible?: boolean;
  address?: string;
  fromDate?: string;
  toDate?: string;
  fromAmount?: number;
  toAmount?: number;
  transactionType?: string;
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
  spent_height: number;
  tx_hash: string;
  tx_pos: number;
  txid: string;
  value: number;
  vout: number;
  wif: string;
}

// @ts-ignore
export type NavigationProp<T, R> = StackNavigationProp<T, R>;

export type MainTabNavigatorParams = {
  [Route.Dashboard]: undefined;
  [Route.AuthenticatorList]: undefined;
  [Route.ContactList]: undefined;
  [Route.Settings]: undefined;
};

export type RootStackParams = {
  [Route.MainCardStackNavigator]: undefined;
  [Route.ImportWalletQRCode]: undefined;
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
  [Route.DeleteWallet]: { wallet: Wallet };
  [Route.DeleteContact]: { contact?: Contact };
  [Route.MainCardStackNavigator]: undefined;
  [Route.SendTransactionDetails]: {
    fee: number;
    recipients: any;
    tx: any;
    satoshiPerByte: any;
    wallet: Wallet;
  };
};

export type PasswordNavigatorParams = {
  [Route.CreateTransactionPassword]: undefined;
  [Route.ConfirmTransactionPassword]: { setPassword: string };
};

export type MainCardStackNavigatorParams = {
  [Route.Dashboard]: { activeWallet?: Wallet };
  [Route.MainCardStackNavigator]: undefined;
  [Route.CreateWallet]: undefined;
  [Route.ImportWallet]: undefined;
  [Route.WalletDetails]: { wallet: Wallet };
  [Route.CreateContact]: undefined;
  [Route.ContactDetails]: { contact: Contact };
  [Route.ContactQRCode]: { contact: Contact };
  [Route.TransactionDetails]: { transaction: Transaction };
  [Route.ReceiveCoins]: { secret?: string };
  [Route.SendCoins]: {
    fromSecret?: string;
    fromAddress?: string;
    fromWallet?: Wallet;
    toAddress?: string;
  };
  [Route.SendCoinsConfirm]: {
    fee: number;
    feeSatoshi?: number;
    memo: string;
    recipients: any;
    size?: number;
    tx: any;
    satoshiPerByte: any;
    fromWallet: Wallet;
  };
  [Route.RecoveryTransactionList]: { wallet: Wallet };
  [Route.RecoverySend]: { transactions: Transaction[]; wallet: any };
  [Route.RecoverySeed]: {
    onSubmit: Function;
    subtitle: string;
    description: string;
    buttonText: string;
    onBackArrow?: () => void;
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
  [Route.ElectrumServer]: undefined;
  [Route.CreatePin]: {
    flowType: string;
  };
  [Route.CurrentPin]: undefined;
  [Route.ConfirmPin]: {
    flowType: string;
    pin: string;
  };
  [Route.FilterTransactions]: { onFilterPress: ({}) => void };
  [Route.CreateAuthenticator]: undefined;
  [Route.EnterPIN]: { id: string };
  [Route.CreateAuthenticatorSuccess]: { id: string };
  [Route.DeleteEntity]: { onConfirm: () => void; name: string; subtitle: string; title: string };
  [Route.ExportAuthenticator]: { id: string };
  [Route.ImportAuthenticator]: undefined;
  [Route.CreateWalletSuccess]: { secret: string };
  [Route.IntegrateKey]: {
    onBarCodeScan: Function;
    title: string;
    description: string;
    withLink?: boolean;
    headerTitle: string;
  };
};
export type DateType = Date | Dayjs;
export interface Authenticator {
  privateKey: Buffer | null;
  publicKey: string;
  entropy: string;
  name: string;
  id: string;
  QRCode: string;
  init: ({ entropy, mnemonic }: { entropy?: string; mnemonic?: string }) => void;
  pin: string;
  secret: string;
  createdAt: Dayjs;
}
