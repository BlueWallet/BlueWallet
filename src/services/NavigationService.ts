import { MessageProps } from 'screens/MessageScreen';
import { EditTextProps } from 'screens/EditTextScreen';
import { NavigationContainerComponent, NavigationActions } from 'react-navigation';

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
