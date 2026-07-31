import { NavigationAction, NavigationState, Router } from '@react-navigation/native';

const guardedRoutes = [
  'WalletExport',
  'WalletXpub',
  'ViewEditMultisigCosigners',
  'ExportMultisigCoordinationSetupRoot',
  'ReceiveDetails',
  'WalletAddresses',
  'ScanQRCode',
];

export type GuardedNavigationAction = NavigationAction & {
  navigationGuardValidated?: boolean;
};

export const getGuardedRoute = (action: Readonly<NavigationAction>) => {
  if (
    action.type !== 'NAVIGATE' ||
    !action.payload ||
    !('name' in action.payload) ||
    typeof action.payload.name !== 'string' ||
    !guardedRoutes.includes(action.payload.name)
  ) {
    return undefined;
  }

  return {
    name: action.payload.name,
    params:
      'params' in action.payload && action.payload.params !== null && typeof action.payload.params === 'object'
        ? action.payload.params
        : undefined,
  };
};

export const navigationGuardRouter = <State extends NavigationState, Action extends NavigationAction>(
  original: Router<State, Action>,
): Partial<Router<State, Action>> => ({
  getStateForAction(state, action, options) {
    const nextState = original.getStateForAction(state, action, options);

    if (nextState !== null && getGuardedRoute(action) && !(action as GuardedNavigationAction).navigationGuardValidated) {
      return null;
    }

    return nextState;
  },
});
