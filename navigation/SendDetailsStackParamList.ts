import { Psbt } from 'bitcoinjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet } from '../class/wallets/types';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';

export type SendDetailsParams = {
  memo?: string;
  address?: string;
  amount?: number;
  amountSats?: number;
  unit?: BitcoinUnit;
  noRbf?: boolean;
  walletID: string;
  launchedBy?: string;
  isEditable?: boolean;
  uri?: string;
  addRecipientParams?: {
    address: string;
    amount?: number;
    memo?: string;
  };
};

export type SendDetailsStackParamList = {
  SendDetails: SendDetailsParams;
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
    fromWallet: TWallet;
    launchedBy?: string;
    psbt?: Psbt;
    txhex?: string;
  };
  CreateTransaction: {
    wallet: TWallet;
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
    fromWallet: string;
    launchedBy?: string;
  };
  Success: {
    fee: number;
    amount: number;
    txid?: string;
  };
  SelectWallet: {
    chainType: Chain;
  };
  CoinControl: {
    walletID: string;
    onUTXOChoose: (u: CreateTransactionUtxo[]) => void;
  };
  PaymentCodeList: {
    walletID: string;
  };
  ScanQRCodeRoot: {
    screen: string;
    params: {
      isLoading?: boolean;
      cameraStatusGranted?: boolean;
      backdoorPressed?: boolean;
      launchedBy?: string;
      urTotal?: number;
      urHave?: number;
      backdoorText?: string;
      showFileImportButton?: boolean;
      onBarScanned: (data: string) => void;
    };
  };
};
