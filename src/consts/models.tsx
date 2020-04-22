export enum Route {
  Dashboard = 'Dashboard',
  WalletDetails = 'WalletDetails',
  ContactList = 'ContactList',
  ContactDetails = 'ContactDetails',
  CreateContact = 'CreateContact',
  Settings = 'Settings',
  Message = 'Message',
  CreateWallet = 'CreateWallet',
  ImportWallet = 'ImportWallet',
  ExportWallet = 'ExportWallet',
  ImportWalletQRCode = 'ImportWalletQRCode',
  DeleteWallet = 'DeleteWallet',
  ExportWalletXpub = 'ExportWalletXub',
  TransactionDetails = 'TransactionDetails',
  ContactQRCode = 'ContactQRCode',
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
  typeReadable: string;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
}

export interface Transaction {
  value: number;
  time: number;
  walletLabel: string;
  confirmations: number;
  inputs: any[];
  outputs: any[];
}
