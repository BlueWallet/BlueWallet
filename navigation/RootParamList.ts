import type { AddWalletStackParamList } from './AddWalletStack';
import type { AztecoRedeemStackParamList } from './AztecoRedeemStack';
import type { DetailViewStackParamList } from './DetailViewStackParamList';
import type { DrawerParamList } from './DrawerParamList';
import type { ExportMultisigCoordinationSetupStackRootParamList } from './ExportMultisigCoordinationSetupStack';
import type { LNDStackParamsList } from './LNDStackParamsList';
import type { SendDetailsStackParamList } from './SendDetailsStackParamList';
import type { SignVerifyStackParamList } from './SignVerifyStack';

/**
 * Every route of every navigator, flat. `navigate()` bubbles up to whichever navigator owns the name,
 * and screens like SelectWallet or ScanQRCode are mounted in several stacks, so a per-stack list
 * cannot type the plain `useNavigation()`.
 */
export type RootParamList = DetailViewStackParamList &
  DrawerParamList &
  SendDetailsStackParamList &
  AddWalletStackParamList &
  LNDStackParamsList &
  SignVerifyStackParamList &
  AztecoRedeemStackParamList &
  ExportMultisigCoordinationSetupStackRootParamList;
