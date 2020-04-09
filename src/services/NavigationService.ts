import { MessageProps } from 'screens/MessageScreen';
import { NavigationContainerComponent, NavigationActions } from 'react-navigation';

type ScreenProps = Partial<MessageProps>;

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
