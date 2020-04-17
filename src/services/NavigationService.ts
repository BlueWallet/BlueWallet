import { NavigationContainerComponent, NavigationActions } from 'react-navigation';

import { Wallet } from 'app/consts';
import { EditTextProps } from 'app/screens/EditTextScreen';
import { MessageProps } from 'app/screens/MessageScreen';

type MessageScreenProps = Partial<MessageProps>;
type EditTextScreenProps = Partial<EditTextProps>;
type WalletDetailsScreenProps = { wallet: Wallet };
type ScreenProps = MessageScreenProps | EditTextScreenProps | WalletDetailsScreenProps;

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
}
