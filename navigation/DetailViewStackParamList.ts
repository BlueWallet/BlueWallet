import { Transaction, TWallet } from '../class/wallets/types';
import { XnaUnit, Chain } from '../models/xnaUnits';
import { PromptPasswordConfirmationParams } from '../screen/PromptPasswordConfirmationSheet.types';
import { ElectrumServerItem } from '../screen/settings/ElectrumSettings';
import type { NeuraiNetwork } from '../blue_modules/neurai';
import type { JsonRpcId } from '@neuraiproject/neurai-connect-core';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AddWalletStackParamList } from './AddWalletStack';

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
  animatedQRCodeData?: Record<string, any>;
};

/**
 * Wallet selection callback used by `SelectWallet`. Mirrors the legacy
 * navigation wrapper but lives here since `SendDetailsStackParamList` was
 * removed alongside the Bitcoin Send flow.
 */
export type TNavigationWrapper = { navigation: { pop: () => void; navigate: (...args: unknown[]) => void } };

export type DetailViewStackParamList = {
  DrawerRoot: undefined;
  UnlockWithScreen: undefined;
  WalletsList: { onBarScanned?: string };
  WalletTransactions: { isLoading?: boolean; walletID: string; walletType: string; walletNetwork?: string; onBarScanned?: string };
  WalletDetails: { walletID: string };
  TransactionDetails: { tx: Transaction; hash: string; walletID: string };
  TransactionStatus: { hash: string; walletID?: string };
  SelectWallet: {
    chainType?: Chain;
    onWalletSelect?: (wallet: TWallet, navigationWrapper: TNavigationWrapper) => void;
    availableWallets?: TWallet[];
    noWalletExplanationText?: string;
    onChainRequireSend?: boolean;
    /** Scrolls the picker to the wallet with this ID. */
    selectedWalletID?: string;
  };
  IsItMyAddress: object;
  Broadcast: undefined;
  GenerateWord: undefined;
  WalletAddresses: { walletID: string };
  WalletTransactionHistory: { walletID: string };
  AddWalletRoot: NavigatorScreenParams<AddWalletStackParamList> | undefined;
  SendNeurai: {
    walletID: string;
    address?: string;
    amount?: string;
    onBarScanned?: string;
  };
  ImportNeurai: undefined;
  WalletExport: undefined;
  Settings: undefined;
  Currency: undefined;
  GeneralSettings: undefined;
  Licensing: undefined;
  NetworkSettings: undefined;
  NeuraiBackendEdit: { network: NeuraiNetwork };
  DepinRpcEdit: { network?: NeuraiNetwork };
  /**
   * Neurai Connect. `ConnectPair` receives the scanned `nc:` pairing and
   * replaces itself with one of the three approval screens; those take the
   * JSON-RPC id of the item waiting in the client's queue rather than the item
   * itself, because navigation params must stay serialisable and the event
   * carries live objects (`Session`, metadata) that must not be copied.
   */
  ConnectPair: { uri: string };
  ConnectLogin: { id: JsonRpcId };
  ConnectProposal: { id: JsonRpcId };
  ConnectRequest: { id: JsonRpcId };
  ConnectSessions: undefined;
  About: undefined;
  ElectrumSettings: { server?: ElectrumServerItem; onBarScanned?: string };
  SettingsBlockExplorer: undefined;
  PlausibleDeniability: undefined;
  EncryptStorage: undefined;
  Language: undefined;
  NotificationSettings: undefined;
  SelfTest: undefined;
  ReleaseNotes: undefined;
  SettingsTools: undefined;
  WalletXpub: { walletID: string; xpub: string };
  ReceiveDetails: {
    walletID?: string;
    address: string;
  };
  ReceiveCustomAmount: {
    address: string;
    currentLabel?: string;
    currentAmount?: string;
    currentUnit?: XnaUnit;
    preferredUnit?: XnaUnit;
  };
  ScanQRCode: ScanQRCodeParamList;
  PromptPasswordConfirmationSheet: PromptPasswordConfirmationParams | undefined;
  ManageWallets: undefined;
};
