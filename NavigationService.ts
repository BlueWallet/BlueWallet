import {
  CommonActions,
  createNavigationContainerRef,
  NavigationAction,
  NavigationState,
  PartialState,
  StackActions,
} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function getCurrentWalletID(): string | undefined {
  if (!navigationRef.isReady()) return undefined;
  let state: NavigationState | PartialState<NavigationState> | undefined = navigationRef.getRootState();
  while (state?.routes[state.index ?? 0]?.state) state = state.routes[state.index ?? 0].state;
  // the focused screen can be a scanner or a picker on top of the screen that holds the wallet
  for (let i = state?.index ?? 0; i >= 0; i--) {
    const walletID = (state?.routes[i]?.params as { walletID?: unknown } | undefined)?.walletID;
    if (typeof walletID === 'string') return walletID;
  }
  return undefined;
}

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
