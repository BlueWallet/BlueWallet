import { LightningTransaction } from '../class/wallets/types';
import { SendDetailsParams } from './SendDetailsStackParamList';

export type DetailViewStackParamList = {
  UnlockWithScreen: undefined;
  WalletsList: { scannedData?: string };
  WalletTransactions: { isLoading?: boolean; walletID: string; walletType: string };
  WalletDetails: { walletID: string };
  TransactionDetails: { transactionId: string; hash: string; walletID: string };
  TransactionStatus: { hash?: string; walletID?: string };
  CPFP: { transactionId: string };
  RBFBumpFee: { transactionId: string };
  RBFCancel: { transactionId: string };
  SelectWallet: undefined;
  LNDViewInvoice: { invoice: LightningTransaction; walletID: string };
  LNDViewAdditionalInvoiceInformation: { invoiceId: string };
  LNDViewAdditionalInvoicePreImage: { invoiceId: string };
  Broadcast: { scannedData?: string };
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
    params: SendDetailsParams;
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
