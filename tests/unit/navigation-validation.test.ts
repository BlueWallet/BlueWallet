import { CommonActions, StackActions, StackRouter } from '@react-navigation/native';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { Chain } from '../../models/bitcoinUnits';
import {
  findNavigatorKeyForRoute,
  getGuardRedirectActions,
  getGuardedRoute,
  GuardedNavigationAction,
  NavigationGuardDependencies,
  navigationGuardRouter,
  validateGuardedRoute,
} from '../../navigation/navigationGuard';

const createDependencies = (): NavigationGuardDependencies => ({
  isBiometricUseEnabled: jest.fn(async () => false),
  unlockWithBiometrics: jest.fn(async () => true),
  wallets: [],
  saveToDisk: jest.fn(async () => {}),
  presentWalletExportReminder: jest.fn(async () => {}),
  requestCameraAuthorization: jest.fn(async () => {}),
});

const createWallet = (overrides: Partial<NavigationGuardDependencies['wallets'][number]> = {}) => ({
  chain: Chain.ONCHAIN,
  getID: () => 'wallet-1',
  getUserHasSavedExport: () => true,
  setUserHasSavedExport: jest.fn(),
  allowSend: () => true,
  allowReceive: () => true,
  ...overrides,
});

describe('navigation validation', () => {
  it('installs the guard on every navigator that registers the scanner', () => {
    const navigationDirectory = path.join(__dirname, '../../navigation');
    const scannerStacks = readdirSync(navigationDirectory)
      .filter(file => file.endsWith('.tsx'))
      .filter(file => readFileSync(path.join(navigationDirectory, file), 'utf8').includes('name="ScanQRCode"'));

    expect(scannerStacks).toEqual(
      expect.arrayContaining([
        'AddWalletStack.tsx',
        'LNDCreateInvoiceStack.tsx',
        'ScanLNDInvoiceStack.tsx',
        'SendDetailsStack.tsx',
        'index.tsx',
      ]),
    );

    for (const file of scannerStacks) {
      expect(readFileSync(path.join(navigationDirectory, file), 'utf8')).toContain('UNSTABLE_router={navigationGuardRouter}');
    }
  });

  it('registers Settings through createSettingsScreenOptions', () => {
    const stackSource = readFileSync(path.join(__dirname, '../../navigation/DetailViewScreensStack.tsx'), 'utf8');
    expect(stackSource).toContain('const settingsScreenOptions = createSettingsScreenOptions(theme)');
    expect(stackSource).toContain(
      '<DetailViewStack.Screen name="Settings" component={Settings} options={settingsScreenOptions(loc.settings.header)} />',
    );
    expect(stackSource).not.toMatch(/name="Settings"[\s\S]*headerLargeTitle:\s*Platform\.OS/);
  });

  it('finds a guarded route nested inside parent navigator params', () => {
    const action = CommonActions.navigate('DrawerRoot', {
      screen: 'DetailViewStackScreensStack',
      params: {
        screen: 'ReceiveDetails',
        params: { walletID: 'wallet-1' },
      },
    });

    expect(getGuardedRoute(action)).toEqual({ name: 'ReceiveDetails', params: { walletID: 'wallet-1' } });

    const original = StackRouter({});
    const router = { ...original, ...navigationGuardRouter(original) };
    const options = {
      routeNames: ['Home', 'DrawerRoot'],
      routeParamList: { Home: undefined, DrawerRoot: undefined },
      routeGetIdList: { Home: undefined, DrawerRoot: undefined },
    };
    const state = original.getInitialState(options);
    expect(router.getStateForAction(state, action, options)).toBeNull();
  });

  it('finds send details nested inside its modal stack', () => {
    const action = CommonActions.navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: { uri: 'bitcoin:bc1qexample' },
    });

    expect(getGuardedRoute(action)).toEqual({ name: 'SendDetails', params: { uri: 'bitcoin:bc1qexample' } });
  });

  it('does not allow biometric navigation when authentication fails', async () => {
    const dependencies = createDependencies();
    dependencies.isBiometricUseEnabled = jest.fn(async () => true);
    dependencies.unlockWithBiometrics = jest.fn(async () => false);

    await expect(validateGuardedRoute({ name: 'WalletExport' }, dependencies)).resolves.toEqual({ allowed: false });
    expect(dependencies.unlockWithBiometrics).toHaveBeenCalledTimes(1);
  });

  it('requires an on-chain wallet that can send before opening send details', async () => {
    const dependencies = createDependencies();

    await expect(validateGuardedRoute({ name: 'SendDetails' }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingSendWallet',
    });

    dependencies.wallets = [createWallet({ allowSend: () => false })];
    await expect(validateGuardedRoute({ name: 'SendDetails' }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingSendWallet',
    });

    dependencies.wallets = [createWallet()];
    await expect(validateGuardedRoute({ name: 'SendDetails' }, dependencies)).resolves.toEqual({ allowed: true });
  });

  it('requires an on-chain wallet that can receive before opening receive details', async () => {
    const dependencies = createDependencies();

    await expect(validateGuardedRoute({ name: 'ReceiveDetails' }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingReceiveWallet',
    });

    dependencies.wallets = [createWallet({ allowReceive: () => false })];
    await expect(validateGuardedRoute({ name: 'ReceiveDetails' }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingReceiveWallet',
    });

    dependencies.wallets = [createWallet()];
    await expect(validateGuardedRoute({ name: 'ReceiveDetails' }, dependencies)).resolves.toEqual({ allowed: true });
  });

  it('requires an off-chain wallet that can send before opening the Lightning scanner', async () => {
    const dependencies = createDependencies();

    await expect(validateGuardedRoute({ name: 'ScanLNDInvoice' }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingLightningWallet',
    });

    dependencies.wallets = [createWallet()];
    await expect(validateGuardedRoute({ name: 'ScanLNDInvoice' }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingLightningWallet',
    });

    dependencies.wallets = [createWallet({ chain: Chain.OFFCHAIN })];
    await expect(validateGuardedRoute({ name: 'ScanLNDInvoice' }, dependencies)).resolves.toEqual({ allowed: true });
  });

  it('resolves a shortcut to the first compatible wallet before navigating', async () => {
    const dependencies = createDependencies();
    dependencies.wallets = [
      createWallet({ getID: () => 'cannot-send', allowSend: () => false }),
      createWallet({ getID: () => 'first-compatible' }),
      createWallet({ getID: () => 'second-compatible' }),
    ];

    await expect(validateGuardedRoute({ name: 'AppShortcut', params: { selectionMode: 'send' } }, dependencies)).resolves.toEqual({
      allowed: false,
      redirect: {
        name: 'SendDetailsRoot',
        params: { screen: 'SendDetails', params: { walletID: 'first-compatible' } },
      },
    });
  });

  it('rejects a shortcut in the guard when there is no compatible wallet', async () => {
    const dependencies = createDependencies();
    dependencies.wallets = [createWallet({ allowReceive: () => false })];

    await expect(validateGuardedRoute({ name: 'AppShortcut', params: { selectionMode: 'receive' } }, dependencies)).resolves.toEqual({
      allowed: false,
      failure: 'missingReceiveWallet',
    });
  });

  it('runs the destination guard before resolving a receive shortcut', async () => {
    const dependencies = createDependencies();
    dependencies.presentWalletExportReminder = jest.fn(async () => {
      throw new Error('Show export');
    });
    dependencies.wallets = [createWallet({ getUserHasSavedExport: () => false })];

    await expect(validateGuardedRoute({ name: 'AppShortcut', params: { selectionMode: 'receive' } }, dependencies)).resolves.toEqual({
      allowed: false,
      redirect: { name: 'WalletExport', params: { walletID: 'wallet-1' } },
    });
    expect(dependencies.presentWalletExportReminder).toHaveBeenCalledTimes(1);
  });

  it('pops the shortcut placeholder before navigating the guarded detail stack for on-chain receive', async () => {
    const dependencies = createDependencies();
    dependencies.wallets = [createWallet()];

    const result = await validateGuardedRoute({ name: 'AppShortcut', params: { selectionMode: 'receive' } }, dependencies);
    expect(result).toEqual({
      allowed: false,
      redirect: {
        name: 'DrawerRoot',
        params: {
          screen: 'DetailViewStackScreensStack',
          params: { screen: 'ReceiveDetails', params: { walletID: 'wallet-1', address: '' } },
        },
      },
    });

    const redirectActions = getGuardRedirectActions(result.redirect!, true);
    expect(redirectActions).toEqual([
      { action: StackActions.popTo('DrawerRoot'), targetRouteName: 'DrawerRoot' },
      {
        action: CommonActions.navigate('ReceiveDetails', { walletID: 'wallet-1', address: '' }),
        targetRouteName: 'ReceiveDetails',
      },
    ]);

    const rootRouter = StackRouter({ initialRouteName: 'DrawerRoot' });
    const rootOptions = {
      routeNames: ['DrawerRoot', 'AppShortcut'],
      routeParamList: { DrawerRoot: undefined, AppShortcut: undefined },
      routeGetIdList: { DrawerRoot: undefined, AppShortcut: undefined },
    };
    const initialRootState = rootRouter.getInitialState(rootOptions);
    const rootState = rootRouter.getStateForAction(
      initialRootState,
      StackActions.push('AppShortcut', { selectionMode: 'receive' }),
      rootOptions,
    ) as typeof initialRootState | null;
    const drawerState =
      rootState &&
      rootRouter.getStateForAction(rootState, redirectActions[0].action as Parameters<typeof rootRouter.getStateForAction>[1], rootOptions);

    expect(drawerState?.routes[drawerState.index ?? 0].name).toBe('DrawerRoot');

    const original = StackRouter({});
    const guardedRouter = navigationGuardRouter(original);
    const options = {
      routeNames: ['WalletsList', 'ReceiveDetails'],
      routeParamList: { WalletsList: undefined, ReceiveDetails: undefined },
      routeGetIdList: { WalletsList: undefined, ReceiveDetails: undefined },
    };
    const initialState = original.getInitialState(options);
    const receiveAction = {
      ...redirectActions[1].action,
      navigationGuardValidated: true,
    } as Parameters<typeof guardedRouter.getStateForAction>[1];
    const receiveState = guardedRouter.getStateForAction(initialState, receiveAction, options);

    expect(receiveState).not.toBeNull();
    expect(receiveState?.routes[receiveState.index ?? 0].name).toBe('ReceiveDetails');
  });

  it('saves the wallet export acknowledgement before allowing navigation', async () => {
    const setUserHasSavedExport = jest.fn();
    const dependencies = createDependencies();
    dependencies.wallets = [
      createWallet({
        getUserHasSavedExport: () => false,
        setUserHasSavedExport,
      }),
    ];

    await expect(validateGuardedRoute({ name: 'ReceiveDetails', params: { walletID: 'wallet-1' } }, dependencies)).resolves.toEqual({
      allowed: true,
    });
    expect(dependencies.presentWalletExportReminder).toHaveBeenCalledTimes(1);
    expect(setUserHasSavedExport).toHaveBeenCalledWith(true);
    expect(dependencies.saveToDisk).toHaveBeenCalledTimes(1);
  });

  it('redirects to wallet export when the reminder is rejected', async () => {
    const dependencies = createDependencies();
    dependencies.presentWalletExportReminder = jest.fn(async () => {
      throw new Error('Show export');
    });
    dependencies.wallets = [
      createWallet({
        getUserHasSavedExport: () => false,
        setUserHasSavedExport: jest.fn(),
      }),
    ];

    await expect(validateGuardedRoute({ name: 'WalletAddresses', params: { walletID: 'wallet-1' } }, dependencies)).resolves.toEqual({
      allowed: false,
      redirect: { name: 'WalletExport', params: { walletID: 'wallet-1' } },
    });
    expect(dependencies.saveToDisk).not.toHaveBeenCalled();
  });

  it('waits for camera authorization before allowing scanner navigation', async () => {
    let authorizeCamera = () => {};
    const dependencies = createDependencies();
    dependencies.requestCameraAuthorization = jest.fn(
      () =>
        new Promise<void>(resolve => {
          authorizeCamera = resolve;
        }),
    );

    const validation = validateGuardedRoute({ name: 'ScanQRCode' }, dependencies);
    let settled = false;
    validation.finally(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(dependencies.requestCameraAuthorization).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    authorizeCamera();
    await expect(validation).resolves.toEqual({ allowed: true });
  });

  it('bypasses all validation when navigating from the scanner', async () => {
    const dependencies = createDependencies();
    dependencies.currentRouteName = 'ScanQRCode';
    dependencies.isBiometricUseEnabled = jest.fn(async () => true);

    await expect(validateGuardedRoute({ name: 'WalletExport' }, dependencies)).resolves.toEqual({ allowed: true });
    expect(dependencies.isBiometricUseEnabled).not.toHaveBeenCalled();
    expect(dependencies.unlockWithBiometrics).not.toHaveBeenCalled();
  });

  it('prefers the focused nested navigator over the root when both register the route', () => {
    const state = {
      stale: false as const,
      type: 'stack',
      key: 'root-stack',
      index: 1,
      routeNames: ['DrawerRoot', 'SendDetailsRoot', 'ScanQRCode'],
      routes: [
        { key: 'drawer-route', name: 'DrawerRoot' },
        {
          key: 'send-details-root-route',
          name: 'SendDetailsRoot',
          state: {
            stale: false as const,
            type: 'stack',
            key: 'send-details-stack',
            index: 0,
            routeNames: ['SendDetails', 'ScanQRCode'],
            routes: [{ key: 'send-details-route', name: 'SendDetails' }],
          },
        },
      ],
    };

    expect(findNavigatorKeyForRoute(state, 'ScanQRCode')).toBe('send-details-stack');
  });

  it('finds the navigator that owns a directly targeted nested route', () => {
    const state = {
      stale: false as const,
      type: 'stack',
      key: 'root-stack',
      index: 0,
      routeNames: ['DrawerRoot'],
      routes: [
        {
          key: 'drawer-route',
          name: 'DrawerRoot',
          state: {
            stale: false as const,
            type: 'stack',
            key: 'detail-stack',
            index: 0,
            routeNames: ['WalletsList', 'ReceiveDetails'],
            routes: [{ key: 'wallets-route', name: 'WalletsList' }],
          },
        },
      ],
    };

    expect(findNavigatorKeyForRoute(state, 'ReceiveDetails')).toBe('detail-stack');
  });

  it('holds guarded actions and allows explicitly validated actions', () => {
    const original = StackRouter({});
    const router = { ...original, ...navigationGuardRouter(original) };
    const options = {
      routeNames: ['Home', 'WalletExport'],
      routeParamList: { Home: undefined, WalletExport: undefined },
      routeGetIdList: { Home: undefined, WalletExport: undefined },
    };
    const state = original.getInitialState(options);
    const action = CommonActions.navigate('WalletExport');

    expect(router.getStateForAction(state, action, options)).toBeNull();

    const validatedAction = { ...action, navigationGuardValidated: true } as GuardedNavigationAction;
    const nextState = router.getStateForAction(state, validatedAction as any, options);
    expect(nextState?.routes[nextState.index ?? 0].name).toBe('WalletExport');
  });

  it('holds shortcut actions until the guard resolves their destination', () => {
    const original = StackRouter({});
    const router = { ...original, ...navigationGuardRouter(original) };
    const options = {
      routeNames: ['DrawerRoot', 'AppShortcut'],
      routeParamList: { DrawerRoot: undefined, AppShortcut: undefined },
      routeGetIdList: { DrawerRoot: undefined, AppShortcut: undefined },
    };
    const state = original.getInitialState(options);
    const action = CommonActions.navigate('AppShortcut', { selectionMode: 'scan' });

    expect(getGuardedRoute(action)).toEqual({ name: 'AppShortcut', params: { selectionMode: 'scan' } });
    expect(router.getStateForAction(state, action, options)).toBeNull();
  });
});
