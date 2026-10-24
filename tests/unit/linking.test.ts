import { getStateFromPath, NavigationState, PartialState } from '@react-navigation/native';
import { linking } from '../../navigation/linking';

const findRoute = (state: NavigationState | PartialState<NavigationState> | undefined, name: string): any => {
  if (!state) return undefined;

  for (const route of state.routes) {
    if (route.name === name) return route;
    const nestedRoute = findRoute(route.state, name);
    if (nestedRoute) return nestedRoute;
  }
};

describe('app shortcut linking', () => {
  test.each([
    ['send', 'SendDetails'],
    ['receive', 'ReceiveWalletSelection'],
    ['scan', 'ScanQRCode'],
    ['manage-wallets', 'ManageWallets'],
  ])('maps %s directly to %s', (path, screen) => {
    const state = getStateFromPath(path, linking.config);

    expect(findRoute(state, screen)).toBeDefined();
  });
});
