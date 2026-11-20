import { getActionFromState, getStateFromPath, NavigationState, PartialState } from '@react-navigation/native';
import { Platform } from 'react-native';
import {
  getCompatibleShortcutWallets,
  getElectrumSettingsLink,
  getShortcutWalletDestination,
  isShortcutWalletCompatible,
  linking,
} from '../../navigation/linking';
import { createElectrumServerHistoryDeepLink, serializeElectrumServerDocument } from '../../blue_modules/electrumServer';
import { Chain } from '../../models/bitcoinUnits';

const findRoute = (state: NavigationState | PartialState<NavigationState> | undefined, name: string): any => {
  if (!state) return undefined;

  for (const route of state.routes) {
    if (route.name === name) return route;
    const nestedRoute = findRoute(route.state, name);
    if (nestedRoute) return nestedRoute;
  }
};

describe('Electrum settings linking', () => {
  const parsePath = (path: string) => linking.getStateFromPath!(path, linking.config);

  test.each(['bluewallet:', 'bluewallet://', 'blue:', 'blue://', 'lapp:', 'lapp://'])(
    'accepts the existing %s server link scheme',
    prefix => {
      const href = getElectrumSettingsLink(`${prefix}setelectrumserver?server=electrum1.bluewallet.io%3A443%3As`);
      expect(href).toBeDefined();
      const state = parsePath(href!);
      expect(findRoute(state, 'ElectrumSettings')?.params).toEqual({ server: { host: 'electrum1.bluewallet.io', ssl: 443 } });
      expect(linking.prefixes).toContain(prefix);
    },
  );

  test.each(['', '/'])('parses legacy %ssetelectrumserver paths through the linking prop', slash => {
    const state = parsePath(`${slash}setelectrumserver?server=umbrel.local%3A50001%3At`);
    expect(findRoute(state, 'ElectrumSettings')?.params).toEqual({ server: { host: 'umbrel.local', tcp: 50001 } });
  });

  it('opens plain settings with the wallet list behind it and produces a navigation action for warm links', () => {
    const state = parsePath('electrum-settings');
    expect(findRoute(state, 'DetailViewStackScreensStack')?.state.routes.map((route: { name: string }) => route.name)).toEqual([
      'WalletsList',
      'ElectrumSettings',
    ]);
    const action = getActionFromState(state!, linking.config);
    expect(action).toMatchObject({ type: 'NAVIGATE', payload: { name: 'DrawerRoot' } });
  });

  test.each(['', '//'])('migrates Apple-only history imports using %s links', slash => {
    const servers = [{ host: 'node.example.com', ssl: 50002 }];
    const url = createElectrumServerHistoryDeepLink(servers).replace('bluewallet:', `bluewallet:${slash}`);
    const originalPlatform = Platform.OS;
    try {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      const href = getElectrumSettingsLink(url)!;
      expect(findRoute(parsePath(href), 'ElectrumSettings')?.params).toEqual({
        serverHistoryImport: serializeElectrumServerDocument(servers),
      });
      expect(findRoute(parsePath(url.replace(/^bluewallet:(?:\/\/)?/, '')), 'ElectrumSettings')?.params).toEqual({
        serverHistoryImport: serializeElectrumServerDocument(servers),
      });
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      expect(getElectrumSettingsLink(url)).toBeUndefined();
      expect(parsePath(href)).toBeUndefined();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  test.each([
    'setelectrumserver',
    'setelectrumserver?server=invalid',
    'setelectrumserver?server=node.example%3A70000%3As',
    'setelectrumserver?server=%E0%A4%A',
    'importelectrumserverhistory?data=invalid',
    `importelectrumserverhistory?data=${encodeURIComponent('{"version":999,"servers":[{"host":"node.example","ssl":50002}]}')}`,
  ])('rejects invalid Electrum links without navigating: %s', path => {
    expect(parsePath(path)).toBeUndefined();
  });

  it('does not accept unrelated schemes or forward arbitrary route parameters', () => {
    expect(getElectrumSettingsLink('ololo:setelectrumserver?server=node.example%3A50002%3As')).toBeUndefined();
    expect(getElectrumSettingsLink('setTrololo?server=node.example%3A50002%3As')).toBeUndefined();
    const state = parsePath('setelectrumserver?server=node.example%3A50002%3As&hasServerHistory=true&onSearchTextChange=invalid');
    expect(findRoute(state, 'ElectrumSettings')?.params).toEqual({ server: { host: 'node.example', ssl: 50002 } });
  });
});

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
