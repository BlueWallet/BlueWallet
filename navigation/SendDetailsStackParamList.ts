import { Psbt } from 'bitcoinjs-lib';
import type { NavigationProp } from '@react-navigation/native';
import type { RootParamList } from './RootParamList';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet, Utxo } from '../class/wallets/types';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';
import { DetailViewStackParamList, ScanQRCodeParamList } from './DetailViewStackParamList';
import { IFee } from '../screen/send/SendDetails';
import { NetworkTransactionFeeType } from '../models/networkTransactionFees';

export const CoinControlSortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type CoinControlSortDirection = (typeof CoinControlSortDirection)[keyof typeof CoinControlSortDirection];

export const CoinControlSortType = {
  HEIGHT: 'height',
  LABEL: 'label',
  VALUE: 'value',
  FROZEN: 'frozen',
} as const;
export type CoinControlSortType = (typeof CoinControlSortType)[keyof typeof CoinControlSortType];

export type SendDetailsParams = {
  openScanner?: boolean;
  transactionMemo?: string;
  isTransactionReplaceable?: boolean;
  payjoinUrl?: string;
  payjoinAddress?: string;
  payjoinDisableOutputSubstitution?: boolean;
  feeUnit?: BitcoinUnit;
  frozenBalance?: number;
  amountUnit?: BitcoinUnit;
  address?: string;
  onBarScanned?: string;
  walletID?: string;
  launchedBy?: string;
  utxos?: CreateTransactionUtxo[] | null;
  isEditable?: boolean;
  uri?: string;
  paymentCode?: string;
  selectedFeeRate?: string | undefined;
  selectedFeeType?: NetworkTransactionFeeType;
  addRecipientParams?: {
    address: string;
    amount?: number;
    memo?: string;
  };
};

export type TNavigation = {
  pop: () => void;
  navigate: NavigationProp<RootParamList>['navigate'];
};

export type TNavigationWrapper = {
  navigation: TNavigation;
};

export type SelectWalletParams = {
  chainType?: Chain;
  onWalletSelect?: (wallet: TWallet, navigationWrapper: TNavigationWrapper) => void;
  availableWallets?: TWallet[];
  noWalletExplanationText?: string;
  onChainRequireSend?: boolean;
  selectedWalletID?: string; // scroll to this wallet
};

export type SuccessParams = {
  fee?: number;
  amount?: number;
  amountUnit?: BitcoinUnit;
  txid?: string;
  invoiceDescription?: string;
  walletID?: string;
  walletType?: string;
};

export type SendDetailsStackParamList = {
  SendDetails: SendDetailsParams;
  CoinControlOutput: {
    walletID: string;
    utxo: Utxo;
  };
  SelectFee: {
    networkTransactionFees: {
      fastestFee: number;
      mediumFee: number;
      slowFee: number;
    };
    feePrecalc: IFee;
    feeRate: string;
    feeUnit?: BitcoinUnit;
    walletID: string;
    customFee?: string | null;
  };
  Confirm: {
    fee: number;
    memo?: string;
    walletID: string;
    tx: string;
    targets?: CreateTransactionTarget[]; // needed to know if there were paymentCodes, which turned into addresses in `recipients`
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    payjoinUrl?: string | null;
    payjoinAddress?: string;
    payjoinDisableOutputSubstitution?: boolean;
    psbt: Psbt;
  };
  PsbtWithHardwareWallet: {
    memo?: string;
    walletID?: string;
    launchedBy?: string;
    psbt?: Psbt;
    txhex?: string;
    deepLinkPSBT?: string;
    onBarScanned?: string;
  };
  PsbtRaw: {
    psbtBase64: string;
  };
  CreateTransaction: {
    memo?: string;
    psbt?: Psbt;
    txhex?: string;
    tx: string;
    fee: number;
    showAnimatedQr?: boolean;
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    feeSatoshi?: number;
  };
  PsbtMultisig: {
    memo?: string;
    psbtBase64: string;
    walletID: string;
    launchedBy?: string;
    receivedPSBTBase64?: string;
    txhex?: string;
  };
  PsbtMultisigQRCode: {
    psbtBase64: string;
    walletID: string;
    isShowOpenScanner: boolean;
    onBarScanned?: string;
  };
  Success: SuccessParams;
  SelectWallet: SelectWalletParams;
  CoinControl: {
    walletID: string;
    sortDirection?: CoinControlSortDirection;
    sortType?: CoinControlSortType;
    hasUtxos?: boolean;
  };
  PaymentCodeList: DetailViewStackParamList['PaymentCodeList'];
  ScanQRCode: ScanQRCodeParamList;
};
