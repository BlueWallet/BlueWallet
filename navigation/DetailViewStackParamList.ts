import { LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { ElectrumServerItem } from '../screen/settings/ElectrumSettings';
import { SendDetailsParams } from './SendDetailsStackParamList';

export type ScanQRCodeParamList = {
  cameraStatusGranted?: boolean;
  backdoorPressed?: boolean;
  launchedBy?: string;
  urTotal?: number;
  urHave?: number;
  backdoorText?: string;
  onBarScanned?: (data: string) => void;
  showFileImportButton?: boolean;
  backdoorVisible?: boolean;
  animatedQRCodeData?: Record<string, any>;
};

export type DetailViewStackParamList = {
  UnlockWithScreen: undefined;
  WalletsList: { onBarScanned?: string };
  WalletTransactions: { isLoading?: boolean; walletID: string; walletType: string; onBarScanned?: string };
  WalletDetails: { walletID: string };
  TransactionDetails: { tx: Transaction; hash: string; walletID: string };
  TransactionStatus: { hash: string; walletID?: string };
  CPFP: {
    wallet: TWallet | null;
    txid: string;
  };
  RBFBumpFee: { txid: string; wallet: TWallet | null };
  RBFCancel: { txid: string; wallet: TWallet | null };
  SelectWallet: undefined;
  LNDViewInvoice: { invoice: LightningTransaction; walletID: string };
  LNDViewAdditionalInvoiceInformation: { invoiceId: string };
  LNDViewAdditionalInvoicePreImage: { invoiceId: string };
  Broadcast: { onBarScanned?: string };
  IsItMyAddress: { address?: string; onBarScanned?: string };
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
  ElectrumSettings: { server?: ElectrumServerItem; onBarScanned?: string };
  SettingsBlockExplorer: undefined;
  EncryptStorage: undefined;
  Language: undefined;
  LightningSettings: {
    url?: string;
    onBarScanned?: string;
  };
  NotificationSettings: undefined;
  SelfTest: undefined;
  ReleaseNotes: undefined;
  ToolsScreen: undefined;
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
      walletID?: string;
      address: string;
    };
  };
  ScanQRCode: ScanQRCodeParamList;
  PaymentCodeList: {
    paymentCode: string;
    walletID: string;
  };
  ManageWallets: undefined;
};
