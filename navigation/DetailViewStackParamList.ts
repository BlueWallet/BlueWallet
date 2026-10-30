import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { PromptPasswordConfirmationParams } from '../screen/PromptPasswordConfirmationSheet.types';
import { SelectWalletParams, SendDetailsParams, SendDetailsStackParamList, SuccessParams } from './SendDetailsStackParamList';
import { ReceiveDetailsStackParamList } from './ReceiveDetailsStackParamList';
import type { AddWalletStackParamList } from './AddWalletStack';
import type { AztecoRedeemStackParamList } from './AztecoRedeemStack';
import type { DrawerParamList } from './DrawerParamList';
import type { ExportMultisigCoordinationSetupStackRootParamList } from './ExportMultisigCoordinationSetupStack';
import type { LNDCreateInvoiceStackParamList, ScanLNDInvoiceStackParamList } from './LNDStackParamsList';
import type { SignVerifyStackParamList } from './SignVerifyStack';
import { ClipboardPaymentKind } from '../blue_modules/clipboardPayment';

export type ScanQRCodeParamList = {
  cameraStatusGranted?: boolean;
  backdoorPressed?: boolean;
  launchedBy?: string;
  urTotal?: number;
  urHave?: number;
  backdoorText?: string;
  onBarScanned?: (data: string, useBBQR: boolean) => void;
  showFileImportButton?: boolean;
  backdoorVisible?: boolean;
  orientation?: 'portrait';
};

type VaultKeyData = {
  keyIndex: number;
  seed: string;
  passphrase?: string;
  xpub: string;
  fp: string;
  path: string;
  cosignerXpubURv2: string;
  exportFilename: string;
  exportString?: string;
};

export type HeaderLeftRenderer = NonNullable<NativeStackNavigationOptions['headerLeft']>;
export type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;

export type DetailViewStackParamList = {
  DrawerRoot: NavigatorScreenParams<DrawerParamList> | undefined;
  UnlockWithScreen: undefined;
  KeyboardShortcuts: undefined;
  WalletsList: { onBarScanned?: string };
  WalletTransactions: {
    isLoading?: boolean;
    walletID: string;
    walletType?: string;
    onBarScanned?: string;
    headerIsScrolled?: boolean;
    headerWalletLabel?: string;
    headerWalletBalance?: string;
  };
  WalletDetails: { walletID: string };
  TransactionStatus: { hash: string; walletID: string; tx?: Transaction };
  CPFP: {
    wallet: TWallet | null;
    txid: string;
  };
  RBFBumpFee: { txid: string; wallet: TWallet | null };
  RBFCancel: { txid: string; wallet: TWallet | null };
  SelectWallet: SelectWalletParams;
  AppShortcut: { selectionMode: 'send' | 'receive' | 'scan' };
  LNDViewInvoice: { invoice: LightningTransaction | string; walletID: string };
  LNDViewAdditionalInvoicePreImage: { preImageData: string };
  Broadcast: undefined;
  IsItMyAddress: undefined;
  GenerateWord: undefined;
  LnurlPay: { lnurl: string; walletID: string };
  LnurlPaySuccess: {
    paymentHash: string;
    justPaid: boolean;
    fromWalletID: string;
  };
  LnurlAuth: { lnurl: string; walletID: string };
  Success: SuccessParams;
  WalletAddresses: { walletID: string };
  AddWalletRoot: NavigatorScreenParams<AddWalletStackParamList> | undefined;
  SendDetailsRoot: NavigatorScreenParams<SendDetailsStackParamList> | SendDetailsParams;
  LNDCreateInvoiceRoot: NavigatorScreenParams<LNDCreateInvoiceStackParamList>;
  ScanLNDInvoiceRoot: NavigatorScreenParams<ScanLNDInvoiceStackParamList>;
  AztecoRedeemRoot: NavigatorScreenParams<AztecoRedeemStackParamList>;
  WalletExport: { walletID: string };
  ExportMultisigCoordinationSetupRoot: NavigatorScreenParams<ExportMultisigCoordinationSetupStackRootParamList>;
  Settings: undefined;
  Currency: undefined;
  GeneralSettings: undefined;
  Licensing: undefined;
  NetworkSettings: undefined;
  About: undefined;
  // DefaultView: undefined; // Commented out - not accessible from UI
  // server: "host:port:t|s" as the setelectrumserver deeplink sends it
  ElectrumSettings: { server?: string; onBarScanned?: string; headerRight?: HeaderRightRenderer | null } | undefined;
  SettingsBlockExplorer: undefined;
  PlausibleDeniability: undefined;
  EncryptStorage: undefined;
  Language: undefined;
  LightningSettings:
    | {
        url?: string;
        onBarScanned?: string;
      }
    | undefined;
  NotificationSettings: undefined;
  SelfTest: undefined;
  ReleaseNotes: undefined;
  SettingsTools: undefined;
  ViewEditMultisigCosigners: {
    walletID: string;
    headerRight?: HeaderRightRenderer | null;
    sheetAction?: string;
    sheetImportText?: string;
    sheetAskPassphrase?: boolean;
    sheetCurrentlyEditingCosignerNum?: number;
  };
  ViewEditMultisigCosignerViewSheet: { walletID: string; vaultKeyData: VaultKeyData };
  ViewEditMultisigProvideMnemonicsSheet: {
    walletID: string;
    currentlyEditingCosignerNum: number;
    importText: string;
    askPassphrase: boolean;
  };
  ViewEditMultisigShareCosignerSheet: {
    walletID: string;
    cosignerXpub: string;
    cosignerXpubURv2: string;
    exportFilename: string;
  };
  WalletXpub: { walletID?: string; xpub: string };
  SignVerifyRoot: NavigatorScreenParams<SignVerifyStackParamList>;
  ReceiveDetails: ReceiveDetailsStackParamList['ReceiveDetails'];
  ReceiveCustomAmount: ReceiveDetailsStackParamList['ReceiveCustomAmount'];
  ReceiveMoreOptions: ReceiveDetailsStackParamList['ReceiveMoreOptions'];
  ReceiveAddressLabel: ReceiveDetailsStackParamList['ReceiveAddressLabel'];
  ScanQRCode: ScanQRCodeParamList;
  PaymentCodeList: { walletID: string };
  PromptPasswordConfirmationSheet: PromptPasswordConfirmationParams | undefined;
  ManageWallets: undefined;
  ClipboardDetected: {
    payload: string;
    kind: ClipboardPaymentKind;
    contentHash: string;
  };
};
