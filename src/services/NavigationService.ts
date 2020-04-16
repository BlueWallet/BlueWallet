import { NavigationContainerComponent, NavigationActions } from 'react-navigation';

import { EditTextProps } from 'app/screens/EditTextScreen';
import { MessageProps } from 'app/screens/MessageScreen';

type MessageScreenProps = Partial<MessageProps>;
type EditTextScreenProps = Partial<EditTextProps>;
type ScreenProps = MessageScreenProps | EditTextScreenProps;

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
