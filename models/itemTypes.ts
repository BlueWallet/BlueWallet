export enum ItemType {
  WalletSection = 'wallet',
  TransactionSection = 'transaction',
  AddressSection = 'address',
  WalletGroupSection = 'walletGroup',
}

export interface AddressItemData {
  address: string;
  walletID: string;
  index: number;
  isInternal: boolean;
}
