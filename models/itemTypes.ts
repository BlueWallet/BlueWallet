import type { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';

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

export interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

export interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction & LightningTransaction;
}

export interface AddressItem {
  type: ItemType.AddressSection;
  data: AddressItemData;
}
