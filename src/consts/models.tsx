export enum Route {
  Dashboard = 'Dashboard',
  WalletDetails = 'WalletDetails',
  AddressBook = 'AddressBook',
  Settings = 'Settings',
  Message = 'Message',
  CreateWallet = 'CreateWallet',
  ImportWallet = 'ImportWallet',
}

export interface Wallet {
  balance: number;
  preferredBalanceUnit: string;
  label: string;
  transactions: any[];
  getBalance: () => void;
  getLatestTransactionTime: () => void;
  getLabel: () => string;
  address: string;
  secret: string;
  typeReadable: string;
}
