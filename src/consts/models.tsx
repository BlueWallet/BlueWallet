export const CONST = {
  pinCodeLength: 4,
  transactionMinPasswordLength: 8,
};

export enum FlowType {
  password = 'password',
  newPin = 'newPin',
}

export enum Route {
  Dashboard = 'Dashboard',
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
}

export interface Wallet {
  balance: number;
  preferredBalanceUnit: string;
  label: string;
  transactions: any[];
  getBalance: () => void;
  getLatestTransactionTime: () => void;
  getLabel: () => string;
  setLabel: (label: string) => void;
  getAddress: () => string;
  getSecret: () => string;
  getXpub: () => string;
  address: string;
  secret: string;
  type: string;
  typeReadable: string;
  getID: () => string;
  chain: string;
  weOwnAddress: (clipboard: string) => void;
  isInvoiceGeneratedByWallet: (clipboard: string) => void;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
}

export interface Transaction {
  hash: string;
  txid: string;
  value: number;
  time: number;
  walletLabel: string;
  confirmations: number;
  inputs: any[];
  outputs: any[];
  note?: string;
}

export interface AppSettings {
  isPinSetup: boolean;
}
