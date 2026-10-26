import { CommonActions, NavigationAction, NavigationState, PartialState, Router, StackActions } from '@react-navigation/native';
import { Chain } from '../models/bitcoinUnits';
import { getCompatibleShortcutWallets, getShortcutWalletDestination, ShortcutWalletSelectionMode } from './linking';

export const navigationGuardPolicies = {
  AppShortcut: { shortcut: true },
  SendDetails: { walletCapability: 'onchainSend' },
  ScanLNDInvoice: { walletCapability: 'offchainSend' },
  WalletExport: { biometrics: true },
  WalletXpub: { biometrics: true },
  ViewEditMultisigCosigners: { biometrics: true },
  ExportMultisigCoordinationSetupRoot: { biometrics: true },
  ReceiveDetails: { walletCapability: 'onchainReceive', walletExportSaved: true },
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
  chain: Chain;
  getID: () => string;
  getUserHasSavedExport: () => boolean;
  setUserHasSavedExport: (value: boolean) => void;
  allowSend: () => boolean;
  allowReceive: () => boolean;
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
  redirect?: { name: string; params?: NavigationParams };
  failure?: 'missingSendWallet' | 'missingReceiveWallet' | 'missingLightningWallet';
};

const asParams = (value: unknown): NavigationParams | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as NavigationParams) : undefined;

export type GuardRedirectAction = {
  action: NavigationAction;
  targetRouteName: string;
};

export const getGuardRedirectActions = (
  redirect: NonNullable<NavigationValidationResult['redirect']>,
  isShortcutPlaceholder: boolean,
): GuardRedirectAction[] => {
  if (!isShortcutPlaceholder) {
    return [{ action: CommonActions.navigate(redirect.name, redirect.params), targetRouteName: redirect.name }];
  }

  if (redirect.name === 'DrawerRoot') {
    const drawerParams = asParams(redirect.params);
    const detailStackParams = drawerParams?.screen === 'DetailViewStackScreensStack' ? asParams(drawerParams.params) : undefined;
    const destinationName = typeof detailStackParams?.screen === 'string' ? detailStackParams.screen : undefined;

    if (destinationName) {
      return [
        { action: StackActions.popTo('DrawerRoot'), targetRouteName: 'DrawerRoot' },
        {
          action: CommonActions.navigate(destinationName, asParams(detailStackParams?.params)),
          targetRouteName: destinationName,
        },
      ];
    }
  }

  return [{ action: StackActions.replace(redirect.name, redirect.params), targetRouteName: redirect.name }];
};

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
  const policy = navigationGuardPolicies[route.name];

  if ('shortcut' in policy) {
    const selectionMode = route.params?.selectionMode as ShortcutWalletSelectionMode | undefined;
    if (!selectionMode || !['send', 'receive', 'scan'].includes(selectionMode)) return { allowed: false };

    const wallet = getCompatibleShortcutWallets(selectionMode, dependencies.wallets)[0];
    if (!wallet) {
      return {
        allowed: false,
        failure: selectionMode === 'receive' ? 'missingReceiveWallet' : 'missingSendWallet',
      };
    }

    const destination = getShortcutWalletDestination(selectionMode, wallet.chain, wallet.getID());
    const destinationGuard = resolveGuardedRoute(destination.name, destination.params);
    if (destinationGuard) {
      const result = await validateGuardedRoute(destinationGuard, dependencies);
      if (!result.allowed) return result;
    }

    return { allowed: false, redirect: destination };
  }

  if ('walletCapability' in policy) {
    const hasSuitableWallet = dependencies.wallets.some(wallet => {
      switch (policy.walletCapability) {
        case 'onchainSend':
          return wallet.chain === Chain.ONCHAIN && wallet.allowSend();
        case 'onchainReceive':
          return wallet.chain === Chain.ONCHAIN && wallet.allowReceive();
        case 'offchainSend':
          return wallet.chain === Chain.OFFCHAIN && wallet.allowSend();
        default:
          return false;
      }
    });

    if (!hasSuitableWallet) {
      const failure =
        policy.walletCapability === 'onchainSend'
          ? 'missingSendWallet'
          : policy.walletCapability === 'onchainReceive'
            ? 'missingReceiveWallet'
            : 'missingLightningWallet';
      return {
        allowed: false,
        failure,
      };
    }
  }

  if (dependencies.currentRouteName === 'ScanQRCode') return { allowed: true };

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
