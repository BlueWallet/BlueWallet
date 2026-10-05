import { act, renderHook } from '@testing-library/react-native';
import useMenuElements, { resetRecentScreens } from '../../hooks/useMenuElements.native';
import MenuElementsEmitter from '../../blue_modules/NativeMenuElementsEmitter';
import { navigationRef, navigateToWalletsList } from '../../NavigationService';
import type { MenuActionHandlers } from '../../blue_modules/menuActions';

jest.mock('@react-navigation/native', () => ({
  CommonActions: {
    navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }),
  },
}));
jest.mock('../../blue_modules/NativeMenuElementsEmitter', () => ({
  __esModule: true,
  default: {
    setHeaderMenu: jest.fn(),
    setAvailableActions: jest.fn(),
    onMenuAction: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('../../NavigationService', () => ({
  navigationRef: {
    isReady: jest.fn(),
    getCurrentRoute: jest.fn(),
    getRootState: jest.fn(),
    navigate: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  },
  navigateToWalletsList: jest.fn(),
}));

const setRoute = (name: string, key = name) => jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name, key });
const emit = (action: string) => jest.mocked(MenuElementsEmitter!.onMenuAction).mock.calls[0][0](action);
const notifyNavigation = (type: 'ready' | 'state') => {
  const callback = jest.mocked(navigationRef.addListener).mock.calls.find(([event]) => event === type)![1];
  act(() => {
    callback({ type } as never);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetRecentScreens();
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  jest.mocked(navigationRef.getRootState).mockReturnValue({
    stale: false,
    type: 'stack',
    key: 'root',
    index: 0,
    routeNames: ['DrawerRoot', 'KeyboardShortcuts'],
    routes: [{ name: 'DrawerRoot', key: 'drawer' }],
  });
  setRoute('WalletTransactions', 'wallet-1');
});

it('treats missing native header metadata as an empty menu without throwing', () => {
  const { getHeaderMenuEntries, getHeaderMenuHandlers } =
    require('../../hooks/useMenuElements.native') as typeof import('../../hooks/useMenuElements.native');
  expect(getHeaderMenuEntries(undefined)).toEqual([]);
  expect(getHeaderMenuEntries({} as any)).toEqual([]);
  expect(getHeaderMenuHandlers(undefined)).toEqual({});
  expect(getHeaderMenuHandlers({} as any)).toEqual({});
});

it('shares subscriptions, dispatches only to the current route, and cleans up', () => {
  const first = renderHook(useMenuElements);
  const second = renderHook(useMenuElements);
  expect(MenuElementsEmitter!.onMenuAction).toHaveBeenCalledTimes(1);
  const refresh = jest.fn();
  let unregister!: () => void;
  act(() => {
    unregister = first.result.current.registerMenuActions({ reloadTransactions: refresh }, 'wallet-1');
  });
  emit('reloadTransactions');
  expect(refresh).toHaveBeenCalledTimes(1);
  setRoute('WalletTransactions', 'wallet-2');
  emit('reloadTransactions');
  expect(refresh).toHaveBeenCalledTimes(1);
  setRoute('UnlockWithScreen');
  emit('settings');
  expect(navigationRef.dispatch).not.toHaveBeenCalled();
  setRoute('WalletTransactions', 'wallet-1');
  act(unregister);
  expect(jest.mocked(MenuElementsEmitter!.setAvailableActions).mock.lastCall![0]).not.toContain('reloadTransactions');
  const subscription = jest.mocked(MenuElementsEmitter!.onMenuAction).mock.results[0].value;
  first.unmount();
  expect(subscription.remove).not.toHaveBeenCalled();
  second.unmount();
  expect(subscription.remove).toHaveBeenCalledTimes(1);
  expect(MenuElementsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
});

it('updates on ready, modal navigation, and lock state', () => {
  jest.mocked(navigationRef.isReady).mockReturnValue(false);
  const hook = renderHook(useMenuElements);
  expect(MenuElementsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  notifyNavigation('ready');
  expect(jest.mocked(MenuElementsEmitter!.setAvailableActions).mock.lastCall![0]).toContain('settings');
  setRoute('SendDetails');
  notifyNavigation('state');
  expect(MenuElementsEmitter!.setAvailableActions).toHaveBeenLastCalledWith(['settings', 'keyboardShortcuts']);
  emit('settings');
  expect(navigationRef.dispatch).toHaveBeenCalledWith({
    type: 'NAVIGATE',
    payload: {
      name: 'DrawerRoot',
      pop: true,
      params: {
        screen: 'DetailViewStackScreensStack',
        params: { screen: 'Settings' },
      },
    },
  });
  emit('keyboardShortcuts');
  expect(navigationRef.navigate).toHaveBeenCalledWith('KeyboardShortcuts');
  jest.mocked(navigationRef.getRootState).mockReturnValue({
    stale: false,
    type: 'stack',
    key: 'root',
    index: 0,
    routeNames: ['UnlockWithScreen'],
    routes: [{ name: 'UnlockWithScreen', key: 'unlock' }],
  });
  notifyNavigation('state');
  expect(MenuElementsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
  const removers = jest.mocked(navigationRef.addListener).mock.results.map(result => result.value);
  hook.unmount();
  removers.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
});

it.each([
  ['WalletTransactions', 'send'],
  ['WalletTransactions', 'receive'],
  ['WalletTransactions', 'walletDetails'],
  ['ReceiveDetails', 'copyAddress'],
  ['TransactionStatus', 'copyTransactionId'],
] as const)('dispatches %s / %s only while its handler is registered', (screen, action) => {
  setRoute(screen);
  const hook = renderHook(useMenuElements);
  const handler = jest.fn();
  let unregister!: () => void;
  act(() => {
    unregister = hook.result.current.registerMenuActions({ [action]: handler } as MenuActionHandlers, screen);
  });
  emit(action);
  expect(handler).toHaveBeenCalledTimes(1);
  act(unregister);
  emit(action);
  expect(handler).toHaveBeenCalledTimes(1);
  hook.unmount();
});

it('keeps newer registrations when an older owner cleans up and routes Back to Wallets', () => {
  const hook = renderHook(useMenuElements);
  const old = jest.fn();
  const current = jest.fn();
  let removeOld!: () => void;
  let removeCurrent!: () => void;
  act(() => {
    removeOld = hook.result.current.registerMenuActions({ send: old }, 'wallet-1');
    removeCurrent = hook.result.current.registerMenuActions({ send: current }, 'wallet-1');
  });
  act(removeOld);
  emit('send');
  expect(current).toHaveBeenCalledTimes(1);
  expect(old).not.toHaveBeenCalled();
  emit('backToWallets');
  expect(navigateToWalletsList).toHaveBeenCalledTimes(1);
  act(removeCurrent);
  hook.unmount();
});

it('reopens a screen selected from the actual navigation history', () => {
  const hook = renderHook(useMenuElements);
  setRoute('Settings', 'settings');
  notifyNavigation('state');
  emit('header:recent:open_recent_wallet-1');
  expect(navigationRef.dispatch).toHaveBeenCalledWith({
    type: 'NAVIGATE',
    payload: {
      name: 'DrawerRoot',
      params: { screen: 'WalletTransactions', params: undefined },
    },
  });
  hook.unmount();
});

it('dispatches dynamic header menus only for the active unlocked route and drops disabled actions', () => {
  setRoute('CoinControl', 'coin-1');
  const hook = renderHook(useMenuElements);
  const sort = jest.fn();
  const done = jest.fn();
  let unregister!: () => void;
  act(() => {
    unregister = hook.result.current.registerHeaderMenu(
      [
        { id: 'sort', text: 'Sort', onPress: sort },
        { id: 'done', text: 'Done', disabled: true, onPress: done },
      ],
      'coin-1',
    );
  });
  expect(
    JSON.parse(jest.mocked(MenuElementsEmitter!.setHeaderMenu).mock.lastCall![0]).filter(
      (item: { id: string }) => item.id !== 'category:file',
    ),
  ).toHaveLength(2);
  emit('header:coin-1:sort');
  emit('header:coin-1:done');
  expect(sort).toHaveBeenCalledTimes(1);
  expect(done).not.toHaveBeenCalled();
  setRoute('CoinControl', 'coin-2');
  emit('header:coin-1:sort');
  expect(sort).toHaveBeenCalledTimes(1);
  notifyNavigation('state');
  expect(MenuElementsEmitter!.setHeaderMenu).toHaveBeenLastCalledWith('[]');
  setRoute('UnlockWithScreen');
  emit('header:coin-1:sort');
  expect(sort).toHaveBeenCalledTimes(1);
  act(unregister);
  hook.unmount();
});

it('keeps commands already present in the system menu from appearing twice', () => {
  setRoute('WalletsList', 'wallets');
  const hook = renderHook(useMenuElements);
  let unregister!: () => void;
  act(() => {
    unregister = hook.result.current.registerHeaderMenu(
      [
        { id: 'AddWalletButton', text: 'Add Wallet', onPress: jest.fn() },
        { id: 'ImportWallet', text: 'Import Wallet', onPress: jest.fn() },
        { id: 'SettingsButton', text: 'Settings', onPress: jest.fn() },
        { id: 'custom', text: 'Custom', onPress: jest.fn() },
      ],
      'wallets',
    );
  });
  const items = JSON.parse(jest.mocked(MenuElementsEmitter!.setHeaderMenu).mock.lastCall![0]);
  const wallet = items.find((item: { id: string }) => item.id === 'category:file');
  expect(wallet.title).toBe('File');
  expect(wallet.children.map((item: { title: string }) => item.title)).toContain('Custom');
  act(unregister);
  hook.unmount();
});

it('does not duplicate Wallet Details while the stable system command is disabled', () => {
  setRoute('WalletTransactions', 'wallet');
  const hook = renderHook(useMenuElements);
  let unregister!: () => void;
  act(() => {
    unregister = hook.result.current.registerHeaderMenu(
      [
        {
          id: 'WalletDetails',
          text: 'Wallet Details',
          disabled: true,
          onPress: jest.fn(),
        },
      ],
      'wallet',
    );
  });
  const items = JSON.parse(jest.mocked(MenuElementsEmitter!.setHeaderMenu).mock.lastCall![0]);
  expect(items).toHaveLength(0);
  expect(jest.mocked(MenuElementsEmitter!.setAvailableActions).mock.lastCall![0]).not.toContain('walletDetails');
  act(unregister);
  hook.unmount();
});

it.each(['Drawer', 'DrawerRoot', 'DetailViewStackScreensStack'])('excludes navigation container %s from Open Recent', name => {
  setRoute(name, 'container');
  const hook = renderHook(useMenuElements);
  let unregister!: () => void;
  act(() => {
    unregister = hook.result.current.registerHeaderMenu([], 'container');
  });
  expect(MenuElementsEmitter!.setHeaderMenu).toHaveBeenLastCalledWith('[]');
  act(unregister);
  hook.unmount();
});

it('combines WalletsList Scan with stack menu entries and scopes its handler to the screen', () => {
  setRoute('WalletsList', 'wallets');
  const hook = renderHook(useMenuElements);
  const scan = jest.fn();
  let removeStack!: () => void;
  let removeScan!: () => void;
  act(() => {
    removeStack = hook.result.current.registerHeaderMenu([{ id: 'existing', text: 'Existing', onPress: jest.fn() }], 'wallets');
    removeScan = hook.result.current.registerHeaderMenu([{ id: 'scan_qr', text: 'Scan', onPress: scan }], 'wallets');
  });
  const entries = JSON.stringify(JSON.parse(jest.mocked(MenuElementsEmitter!.setHeaderMenu).mock.lastCall![0]));
  expect(entries).toContain('header:wallets:existing');
  expect(entries).toContain('header:wallets:scan_qr');
  emit('header:wallets:scan_qr');
  expect(scan).toHaveBeenCalledTimes(1);
  setRoute('Settings', 'settings');
  emit('header:wallets:scan_qr');
  expect(scan).toHaveBeenCalledTimes(1);
  act(() => {
    removeScan();
    removeStack();
  });
  hook.unmount();
});

it('hides the current route from Open Recent and retains it when navigating away', () => {
  setRoute('WalletsList', 'wallets');
  const hook = renderHook(useMenuElements);
  let removeWallets!: () => void;
  let removeSettings!: () => void;
  act(() => {
    removeWallets = hook.result.current.registerHeaderMenu([], 'wallets');
  });
  expect(MenuElementsEmitter!.setHeaderMenu).toHaveBeenLastCalledWith('[]');
  setRoute('Settings', 'settings');
  act(() => {
    removeSettings = hook.result.current.registerHeaderMenu([], 'settings');
  });
  let menu = jest.mocked(MenuElementsEmitter!.setHeaderMenu).mock.lastCall![0];
  expect(menu).toContain('open_recent_wallets');
  expect(menu).not.toContain('open_recent_settings');
  setRoute('WalletsList', 'wallets');
  notifyNavigation('state');
  menu = jest.mocked(MenuElementsEmitter!.setHeaderMenu).mock.lastCall![0];
  expect(menu).toContain('open_recent_settings');
  expect(menu).not.toContain('open_recent_wallets');
  act(() => {
    removeSettings();
    removeWallets();
  });
  hook.unmount();
});
