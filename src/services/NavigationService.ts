import { NavigationContainerRef, NavigationAction, NavigationState } from '@react-navigation/native';
import { createRef } from 'react';

import { GlobalParams, Route } from 'app/consts';

export const navigationRef = createRef<NavigationContainerRef>();

export default class NavigationService {
  goBack() {
    navigationRef.current?.goBack();
  }
  navigate(routeName: Route, params?: GlobalParams[Route]) {
    navigationRef.current?.navigate(routeName, params);
  }
  dispatch<State extends NavigationState = NavigationState>(
    action: NavigationAction | ((state: State) => NavigationAction),
  ) {
    navigationRef.current?.dispatch(action as any);
  }
}
