import { getStateFromPath, NavigationState, PartialState } from '@react-navigation/native';
import { getShortcutWalletDestination, linking } from '../../navigation/linking';
import { Chain } from '../../models/bitcoinUnits';

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
    ['scan', 'ScanWalletSelection'],
    ['manage-wallets', 'ManageWallets'],
  ])('maps %s directly to %s', (path, screen) => {
    const state = getStateFromPath(path, linking.config);

    expect(findRoute(state, screen)).toBeDefined();
  });

  test.each([
    ['receive', Chain.ONCHAIN, 'ReceiveDetails'],
    ['receive', Chain.OFFCHAIN, 'LNDCreateInvoiceRoot'],
    ['scan', Chain.ONCHAIN, 'SendDetailsRoot'],
    ['scan', Chain.OFFCHAIN, 'ScanLNDInvoiceRoot'],
  ] as const)('routes %s through an available %s wallet', (mode, chain, routeName) => {
    expect(getShortcutWalletDestination(mode, chain, 'wallet-1').name).toBe(routeName);
  });
});
