import type { NavigatorScreenParams } from '@react-navigation/native';

import type { AddWalletStackParamList } from './AddWalletStack';
import type { DetailViewStackParamList, ScanQRCodeParamList } from './DetailViewStackParamList';
import type { DrawerParamList } from './DrawerParamList';
import type { ExportMultisigCoordinationSetupStackRootParamList } from './ExportMultisigCoordinationSetupStack';
import type { LNDStackParamsList } from './LNDStackParamsList';
import type { SendDetailsStackParamList } from './SendDetailsStackParamList';

type DirectRootRoutes = Pick<
  DetailViewStackParamList,
  | 'UnlockWithScreen'
  | 'ViewEditMultisigCosigners'
  | 'ViewEditMultisigCosignerViewSheet'
  | 'ViewEditMultisigProvideMnemonicsSheet'
  | 'ViewEditMultisigShareCosignerSheet'
  | 'WalletXpub'
>;

export type RootStackParamList = DirectRootRoutes & {
  DrawerRoot: NavigatorScreenParams<DrawerParamList>;
  AddWalletRoot: NavigatorScreenParams<AddWalletStackParamList> | undefined;
  SendDetailsRoot: NavigatorScreenParams<SendDetailsStackParamList>;
  LNDCreateInvoiceRoot: DetailViewStackParamList['LNDCreateInvoiceRoot'];
  ScanLNDInvoiceRoot: NavigatorScreenParams<LNDStackParamsList>;
  AztecoRedeemRoot: DetailViewStackParamList['AztecoRedeemRoot'];
  WalletExport: { walletID: string };
  ExportMultisigCoordinationSetupRoot: NavigatorScreenParams<ExportMultisigCoordinationSetupStackRootParamList>;
  SignVerifyRoot: DetailViewStackParamList['SignVerifyRoot'];
  ScanQRCode: ScanQRCodeParamList;
};
