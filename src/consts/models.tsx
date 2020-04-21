export enum Route {
  Dashboard = 'Dashboard',
  WalletDetails = 'WalletDetails',
  ContactList = 'ContactList',
  Settings = 'Settings',
  Message = 'Message',
  CreateWallet = 'CreateWallet',
  ImportWallet = 'ImportWallet',
  ExportWallet = 'ExportWallet',
  ImportWalletQRCode = 'ImportWalletQRCode',
  DeleteWallet = 'DeleteWallet',
  ExportWalletXpub = 'ExportWalletXub',
}

export interface Wallet {
  balance: number;
  preferredBalanceUnit: string;
  label: string;
  transactions: any[];
  getBalance: () => void;
  getLatestTransactionTime: () => void;
  getLabel: () => string;
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
}
