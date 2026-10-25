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
    ['send', 'SendWalletSelection'],
    ['receive', 'ReceiveWalletSelection'],
    ['scan', 'ScanWalletSelection'],
    ['manage-wallets', 'ManageWallets'],
  ])('maps %s directly to %s', (path, screen) => {
    const state = getStateFromPath(path, linking.config);

    expect(findRoute(state, screen)).toBeDefined();
  });

  test.each([
    ['send', Chain.ONCHAIN, 'SendDetailsRoot'],
    ['receive', Chain.ONCHAIN, 'ReceiveDetails'],
    ['receive', Chain.OFFCHAIN, 'LNDCreateInvoiceRoot'],
    ['scan', Chain.ONCHAIN, 'SendDetailsRoot'],
    ['scan', Chain.OFFCHAIN, 'ScanLNDInvoiceRoot'],
  ] as const)('routes %s through an available %s wallet', (mode, chain, routeName) => {
    expect(getShortcutWalletDestination(mode, chain, 'wallet-1').name).toBe(routeName);
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
