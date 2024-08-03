import { Psbt } from 'bitcoinjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet, LightningTransaction } from '../class/wallets/types';
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

export type DetailViewStackParamList = {
  UnlockWithScreen: undefined;
  WalletsList: undefined;
  WalletTransactions: { walletID: string; walletType: string };
  WalletDetails: { walletID: string };
  TransactionDetails: { transactionId: string };
  TransactionStatus: { hash?: string; walletID?: string };
  CPFP: { transactionId: string };
  RBFBumpFee: { transactionId: string };
  RBFCancel: { transactionId: string };
  SelectWallet: undefined;
  LNDViewInvoice: { invoice: LightningTransaction; walletID: string };
  LNDViewAdditionalInvoiceInformation: { invoiceId: string };
  LNDViewAdditionalInvoicePreImage: { invoiceId: string };
  Broadcast: undefined;
  IsItMyAddress: undefined;
  GenerateWord: undefined;
  LnurlPay: undefined;
  LnurlPaySuccess: {
    paymentHash: string;
    justPaid: boolean;
    fromWalletID: string;
  };
  LnurlAuth: undefined;
  Success: undefined;
  WalletAddresses: { walletID: string };
  AddWalletRoot: undefined;
  SendDetailsRoot: {
    screen: string;
    params: {
      walletID: string;
      address?: string;
      amount?: number;
      amountSats?: number;
      unit?: BitcoinUnit;
      noRbf?: boolean;
      launchedBy?: string;
      isEditable?: boolean;
      uri?: string;
      addRecipientParams?: {
        address?: string;
        amount?: number;
        memo?: string;
      };
      memo?: string;
    };
    merge: boolean;
  };
  LNDCreateInvoiceRoot: undefined;
  ScanLndInvoiceRoot: {
    screen: string;
    params: {
      paymentHash: string;
      fromWalletID: string;
      justPaid: boolean;
    };
  };
  AztecoRedeemRoot: undefined;
  WalletExportRoot: undefined;
  ExportMultisigCoordinationSetupRoot: undefined;
  Settings: undefined;
  Currency: undefined;
  GeneralSettings: undefined;
  PlausibleDeniability: undefined;
  Licensing: undefined;
  NetworkSettings: undefined;
  About: undefined;
  DefaultView: undefined;
  ElectrumSettings: undefined;
  EncryptStorage: undefined;
  Language: undefined;
  LightningSettings: {
    url?: string;
  };
  NotificationSettings: undefined;
  SelfTest: undefined;
  ReleaseNotes: undefined;
  Tools: undefined;
  SettingsPrivacy: undefined;
  ViewEditMultisigCosignersRoot: { walletID: string; cosigners: string[] };
  WalletXpubRoot: undefined;
  SignVerifyRoot: {
    screen: 'SignVerify';
    params: {
      walletID: string;
      address: string;
    };
  };
  ReceiveDetailsRoot: {
    screen: 'ReceiveDetails';
    params: {
      walletID: string;
      address: string;
    };
  };
  ScanQRCodeRoot: {
    screen: string;
    params: {
      isLoading: false;
      cameraStatusGranted?: boolean;
      backdoorPressed?: boolean;
      launchedBy?: string;
      urTotal?: number;
      urHave?: number;
      backdoorText?: string;
      onDismiss?: () => void;
      showFileImportButton: true;
      backdoorVisible?: boolean;
      animatedQRCodeData?: Record<string, any>;
    };
  };
  PaymentCodeList: {
    paymentCode: string;
    walletID: string;
  };
  ManageWallets: undefined;
};
