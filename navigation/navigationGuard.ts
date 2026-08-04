import { NavigationAction, NavigationState, PartialState, Router } from '@react-navigation/native';

export const navigationGuardPolicies = {
  WalletExport: { biometrics: true },
  WalletXpub: { biometrics: true },
  ViewEditMultisigCosigners: { biometrics: true },
  ExportMultisigCoordinationSetupRoot: { biometrics: true },
  ReceiveDetails: { walletExportSaved: true },
  WalletAddresses: { walletExportSaved: true },
  ScanQRCode: { camera: true },
} as const;

type GuardedRouteName = keyof typeof navigationGuardPolicies;
type NavigationParams = Record<string, unknown>;

export type GuardedRoute = {
  name: GuardedRouteName;
  params?: NavigationParams;
};

export type GuardedNavigationAction = NavigationAction & {
  navigationGuardValidated?: boolean;
};

type GuardWallet = {
  getID: () => string;
  getUserHasSavedExport: () => boolean;
  setUserHasSavedExport: (value: boolean) => void;
};

export type NavigationGuardDependencies = {
  currentRouteName?: string;
  isBiometricUseEnabled: () => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  wallets: readonly GuardWallet[];
  saveToDisk: () => Promise<void>;
  presentWalletExportReminder: () => Promise<unknown>;
  requestCameraAuthorization: () => Promise<unknown>;
};

export type NavigationValidationResult = {
  allowed: boolean;
  redirect?: { name: 'WalletExport'; params: { walletID: string } };
};

const asParams = (value: unknown): NavigationParams | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as NavigationParams) : undefined;

export const resolveGuardedRoute = (name: string, params?: NavigationParams): GuardedRoute | undefined => {
  const nestedScreen = params?.screen;
  if (typeof nestedScreen === 'string') {
    const nestedRoute = resolveGuardedRoute(nestedScreen, asParams(params?.params));
    if (nestedRoute) return nestedRoute;
  }

  if (name in navigationGuardPolicies) {
    return { name: name as GuardedRouteName, params };
  }

  return undefined;
};

export const getGuardedRoute = (action: Readonly<NavigationAction>): GuardedRoute | undefined => {
  if (action.type !== 'NAVIGATE' || !action.payload || !('name' in action.payload) || typeof action.payload.name !== 'string') {
    return undefined;
  }

  const params = 'params' in action.payload ? asParams(action.payload.params) : undefined;
  return resolveGuardedRoute(action.payload.name, params);
};

export const validateGuardedRoute = async (
  route: GuardedRoute,
  dependencies: NavigationGuardDependencies,
): Promise<NavigationValidationResult> => {
  if (dependencies.currentRouteName === 'ScanQRCode') return { allowed: true };

  const policy = navigationGuardPolicies[route.name];

  if ('biometrics' in policy && (await dependencies.isBiometricUseEnabled())) {
    if (!(await dependencies.unlockWithBiometrics())) return { allowed: false };
  }

  if ('walletExportSaved' in policy) {
    const walletID = typeof route.params?.walletID === 'string' ? route.params.walletID : undefined;
    const wallet = walletID ? dependencies.wallets.find(item => item.getID() === walletID) : undefined;

    if (walletID && wallet && !wallet.getUserHasSavedExport()) {
      try {
        await dependencies.presentWalletExportReminder();
        wallet.setUserHasSavedExport(true);
        await dependencies.saveToDisk();
      } catch {
        return { allowed: false, redirect: { name: 'WalletExport', params: { walletID } } };
      }
    }
  }

  if ('camera' in policy) await dependencies.requestCameraAuthorization();

  return { allowed: true };
};

export const findNavigatorKeyForRoute = (
  state: NavigationState | PartialState<NavigationState> | undefined,
  routeName: string,
): string | undefined => {
  if (!state) return undefined;

  // The focused navigator chain wins over this navigator's own registration: a
  // route registered both at the root (e.g. the modal ScanQRCode) and inside the
  // focused stack must resolve to the in-stack one, so popTo/launchedBy flows
  // return to the launching screen. Unfocused siblings are only a last resort.
  const focusedRoute = state.routes[state.index ?? 0];
  const focusedKey = findNavigatorKeyForRoute(focusedRoute?.state, routeName);
  if (focusedKey) return focusedKey;

  if (state.routeNames?.includes(routeName)) return state.key;

  for (const route of state.routes) {
    if (route.key === focusedRoute?.key) continue;
    const navigatorKey = findNavigatorKeyForRoute(route.state, routeName);
    if (navigatorKey) return navigatorKey;
  }

  return undefined;
};

export const navigationGuardRouter = <State extends NavigationState, Action extends NavigationAction>(
  original: Router<State, Action>,
): Router<State, Action> => ({
  ...original,
  getStateForAction(state, action, options) {
    const nextState = original.getStateForAction(state, action, options);

    if (nextState !== null && getGuardedRoute(action) && !(action as GuardedNavigationAction).navigationGuardValidated) {
      return null;
    }

    return nextState;
  },
});
