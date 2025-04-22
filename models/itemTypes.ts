export enum ItemType {
  WalletSection = 'wallet',
  TransactionSection = 'transaction',
  AddressSection = 'address',
}

export interface AddressItemData {
  address: string;
  walletID: string;
  index: number;
  isInternal: boolean;
}
