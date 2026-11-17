import { getStateFromPath, NavigationState, PartialState } from '@react-navigation/native';
import { getCompatibleShortcutWallets, getShortcutWalletDestination, isShortcutWalletCompatible, linking } from '../../navigation/linking';
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
    ['send', 'AppShortcut'],
    ['receive', 'AppShortcut'],
    ['scan', 'AppShortcut'],
    ['manage-wallets', 'ManageWallets'],
  ])('maps %s directly to %s', (path, screen) => {
    const state = getStateFromPath(path, linking.config);

    expect(findRoute(state, screen)).toBeDefined();
  });

  test.each(['send', 'receive', 'scan'] as const)('passes %s as the shortcut mode', selectionMode => {
    const state = getStateFromPath(selectionMode, linking.config);

    expect(findRoute(state, 'AppShortcut')?.params).toEqual({ selectionMode });
  });

  it('keeps the existing drawer as the base route instead of nesting another detail stack', () => {
    const state = getStateFromPath('send', linking.config);

    expect(state?.routes.map(route => route.name)).toEqual(['DrawerRoot', 'AppShortcut']);
    expect(findRoute(state?.routes[0]?.state, 'AppShortcut')).toBeUndefined();
  });

  it('puts the wallet list behind manage wallets on a cold deep link', () => {
    const state = getStateFromPath('manage-wallets', linking.config);
    const detailStack = findRoute(state, 'DetailViewStackScreensStack');

    expect(detailStack?.state?.routes.map((route: { name: string }) => route.name)).toEqual(['WalletsList', 'ManageWallets']);
    expect(detailStack?.state?.index).toBe(1);
  });

  test.each([
    ['send', Chain.ONCHAIN, 'SendDetailsRoot'],
    ['receive', Chain.ONCHAIN, 'DrawerRoot'],
    ['receive', Chain.OFFCHAIN, 'LNDCreateInvoiceRoot'],
    ['scan', Chain.ONCHAIN, 'SendDetailsRoot'],
    ['scan', Chain.OFFCHAIN, 'ScanLNDInvoiceRoot'],
  ] as const)('routes %s through an available %s wallet', (mode, chain, routeName) => {
    expect(getShortcutWalletDestination(mode, chain, 'wallet-1').name).toBe(routeName);
  });

  it('routes on-chain receive through the existing drawer stack', () => {
    expect(getShortcutWalletDestination('receive', Chain.ONCHAIN, 'wallet-1')).toEqual({
      name: 'DrawerRoot',
      params: {
        screen: 'DetailViewStackScreensStack',
        params: { screen: 'ReceiveDetails', params: { walletID: 'wallet-1', address: '' } },
      },
    });
  });

  test.each([
    ['send', Chain.ONCHAIN, true, true],
    ['send', Chain.OFFCHAIN, true, false],
    ['receive', Chain.ONCHAIN, false, false],
    ['receive', Chain.OFFCHAIN, true, true],
    ['scan', Chain.ONCHAIN, true, true],
    ['scan', Chain.OFFCHAIN, false, false],
  ] as const)('checks %s shortcut compatibility for a %s wallet', (mode, chain, capability, expected) => {
    expect(
      isShortcutWalletCompatible(mode, {
        chain,
        allowSend: () => capability,
        allowReceive: () => capability,
      }),
    ).toBe(expected);
  });

  it('keeps storage order so shortcuts use the first compatible wallet', () => {
    const wallets = [
      {
        id: 'unavailable',
        chain: Chain.ONCHAIN,
        allowSend: () => false,
        allowReceive: () => false,
      },
      {
        id: 'first',
        chain: Chain.OFFCHAIN,
        allowSend: () => true,
        allowReceive: () => true,
      },
      {
        id: 'second',
        chain: Chain.ONCHAIN,
        allowSend: () => true,
        allowReceive: () => true,
      },
    ];

    expect(getCompatibleShortcutWallets('scan', wallets).map(wallet => wallet.id)).toEqual(['first', 'second']);
    expect(getCompatibleShortcutWallets('send', wallets).map(wallet => wallet.id)).toEqual(['second']);
  });
});
