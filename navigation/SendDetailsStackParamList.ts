import { Psbt } from 'bitcoinjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';

export type SendDetailsStackParamList = {
  SendDetails: { isEditable: boolean };
  Confirm: {
    fee: number;
    memo?: string;
    walletID: string;
    tx: string;
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
  };
  SelectWallet: {
    onWalletSelect: (wallet: TWallet) => void;
    chainType: Chain;
  };
  CoinControl: {
    walletID: string;
    onUTXOChoose: (u: CreateTransactionUtxo[]) => void;
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
