import { CommonActions, createNavigationContainerRef, NavigationAction, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function dispatch(action: NavigationAction) {
  if (navigationRef.isReady()) {
    navigationRef.current?.dispatch(action);
  }
}

export function reset() {
  if (navigationRef.isReady()) {
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: 'UnlockWithScreen' }],
    });
  }
}

export function popToTop() {
  if (navigationRef.isReady()) {
    navigationRef.current?.dispatch(StackActions.popToTop());
  }
}

export function pop() {
  if (navigationRef.isReady()) {
    navigationRef.current?.dispatch(StackActions.pop());
  }
}

export function navigateToWalletsList() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'DrawerRoot',
            state: {
              routes: [
                {
                  name: 'DetailViewStackScreensStack',
                  state: {
                    routes: [{ name: 'WalletsList' }],
                  },
                },
              ],
            },
          },
        ],
      }),
    );
  }
}
