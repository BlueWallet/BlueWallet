import { CommonActions, StackRouter } from '@react-navigation/native';
import { GuardedNavigationAction, navigationGuardRouter } from '../../navigation/navigationGuard';

describe('navigation validation router', () => {
  const original = StackRouter({});
  const router = { ...original, ...navigationGuardRouter(original) };
  const options = {
    routeNames: ['Home', 'WalletExport'],
    routeParamList: { Home: undefined, WalletExport: undefined },
    routeGetIdList: { Home: undefined, WalletExport: undefined },
  };
  const state = original.getInitialState(options);

  it('holds guarded navigation actions before validation', () => {
    expect(router.getStateForAction(state, CommonActions.navigate('WalletExport'), options)).toBeNull();
  });

  it('allows guarded navigation actions after validation', () => {
    const action = {
      ...CommonActions.navigate('WalletExport'),
      navigationGuardValidated: true,
    } as GuardedNavigationAction;
    const nextState = router.getStateForAction(state, action as any, options);

    expect(nextState?.routes[nextState.index ?? 0].name).toBe('WalletExport');
  });
});
