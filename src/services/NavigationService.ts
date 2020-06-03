import { NavigationContainerComponent, NavigationActions, StackActions } from 'react-navigation';
import { EditTextProps } from 'screens/EditTextScreen';
import { MessageProps } from 'screens/MessageScreen';

import { Wallet, Transaction } from 'app/consts';
import { ScanQrCodeProps } from 'app/screens/ScanQrCodeScreen';

type MessageScreenProps = Partial<MessageProps>;
type EditTextScreenProps = Partial<EditTextProps>;
type WalletDetailsScreenProps = { wallet: Wallet };
type TransactionDetailsScreenProps = { transaction: Transaction };
type ScreenProps =
  | MessageScreenProps
  | EditTextScreenProps
  | WalletDetailsScreenProps
  | ScanQrCodeProps
  | TransactionDetailsScreenProps;

export default class NavigationService {
  navigator?: NavigationContainerComponent;

  setTopLevelNavigator = (navigatorRef: NavigationContainerComponent) => {
    this.navigator = navigatorRef;
  };

  navigate = (routeName: string, params?: ScreenProps) => {
    this.navigator!.dispatch(
      NavigationActions.navigate({
        routeName,
        params,
      }),
    );
  };

  navigateWithReset = (routeName: string, params?: ScreenProps) => {
    const navigateAction = StackActions.reset({
      index: 0,
      key: null,
      actions: [
        NavigationActions.navigate({
          routeName,
          params,
        }),
      ],
    });
    this.navigator!.dispatch(navigateAction);
  };
}
