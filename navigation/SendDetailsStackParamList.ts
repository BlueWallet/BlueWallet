import { Psbt } from 'bitcoinjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet } from '../class/wallets/types';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';
import { ScanQRCodeParamList } from './DetailViewStackParamList';
import { IFee } from '../screen/send/SendDetails';
import { NetworkTransactionFeeType } from '../models/networkTransactionFees';

export type SendDetailsParams = {
  transactionMemo?: string;
  isTransactionReplaceable?: boolean;
  payjoinUrl?: string;
  feeUnit?: BitcoinUnit;
  frozenBalance?: number;
  amountUnit?: BitcoinUnit;
  address?: string;
  amount?: number;
  amountSats?: number;
  onBarScanned?: string;
  unit?: BitcoinUnit;
  noRbf?: boolean;
  walletID: string;
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
  navigate: () => void;
};

export type TNavigationWrapper = {
  navigation: TNavigation;
};

export type SendDetailsStackParamList = {
  SendDetails: SendDetailsParams;
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
    psbt: Psbt;
  };
  PsbtWithHardwareWallet: {
    memo?: string;
    walletID: string;
    launchedBy?: string;
    psbt?: Psbt;
    txhex?: string;
    deepLinkPSBT?: string;
    onBarScanned?: string;
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
  };
  PsbtMultisigQRCode: {
    memo?: string;
    psbtBase64: string;
    walletID: string;
    launchedBy?: string;
    isShowOpenScanner?: boolean;
    onBarScanned?: string;
  };
  Success: {
    fee?: number;
    amount: number;
    amountUnit?: BitcoinUnit;
    txid?: string;
    invoiceDescription?: string;
  };
  SelectWallet: {
    chainType?: Chain;
    onWalletSelect?: (wallet: TWallet, navigationWrapper: TNavigationWrapper) => void;
    availableWallets?: TWallet[];
    noWalletExplanationText?: string;
    onChainRequireSend?: boolean;
    selectedWalletID?: string; // Add this parameter to scroll to a specific wallet
  };
  CoinControl: {
    walletID: string;
  };
  PaymentCodeList: {
    walletID: string;
    merge?: boolean;
  };
  ScanQRCode: ScanQRCodeParamList;
};
