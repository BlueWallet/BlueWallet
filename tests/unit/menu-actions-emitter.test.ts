import { act, renderHook } from '@testing-library/react-native';
import useMenuActions, { setNativeMenuWalletsInitialized, setNativeOpenFileHandler } from '../../hooks/useMenuActions.native';
import MenuActionsEmitter from '../../blue_modules/NativeMenuActionsEmitter';
import { navigationRef, navigateToWalletsList } from '../../NavigationService';
import type { MenuActionHandlers } from '../../blue_modules/menuActions';

jest.mock('@react-navigation/native', () => ({ CommonActions: { navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }) } }));
jest.mock('../../blue_modules/NativeMenuActionsEmitter', () => ({
  __esModule: true,
  default: {
    setAvailableActions: jest.fn(),
    setActionStates: jest.fn(),
    setMenuTitles: jest.fn(),
    setRecentItems: jest.fn(),
    onMenuAction: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('../../components/Context/recentMenuItems', () => ({
  getRecentMenuItems: jest.fn(() => [
    { id: 'wallet:wallet-1', kind: 'wallet', title: 'Savings', walletID: 'wallet-1' },
    { id: 'transaction:wallet-1:abc', kind: 'transaction', title: 'Rent', walletID: 'wallet-1', transactionID: 'abc' },
  ]),
  loadRecentMenuItems: jest.fn(async () => []),
  subscribeToRecentMenuItems: jest.fn(() => jest.fn()),
  findRecentMenuItem: jest.fn((id: string) =>
    id === 'wallet:wallet-1'
      ? { id, kind: 'wallet', title: 'Savings', walletID: 'wallet-1' }
      : id === 'transaction:wallet-1:abc'
        ? { id, kind: 'transaction', title: 'Rent', walletID: 'wallet-1', transactionID: 'abc' }
        : undefined,
  ),
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
const emit = (action: string) => jest.mocked(MenuActionsEmitter!.onMenuAction).mock.calls[0][0](action);
const notifyNavigation = (type: 'ready' | 'state') => {
  const callback = jest.mocked(navigationRef.addListener).mock.calls.find(([event]) => event === type)![1];
  act(() => {
    callback({ type } as never);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setNativeMenuWalletsInitialized(true);
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

it('hides post-unlock commands until wallets are initialized', () => {
  setNativeMenuWalletsInitialized(false);
  const hook = renderHook(useMenuActions);

  expect(MenuActionsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
  emit('openFile');
  emit('openRecent:wallet:wallet-1');
  emit('settings');
  expect(navigationRef.dispatch).not.toHaveBeenCalled();

  act(() => setNativeMenuWalletsInitialized(true));
  expect(jest.mocked(MenuActionsEmitter!.setAvailableActions).mock.lastCall![0]).toContain('openFile');
  hook.unmount();
});

it('sends localized menu titles to the native renderers', () => {
  const hook = renderHook(useMenuActions);
  const titles = JSON.parse(jest.mocked(MenuActionsEmitter!.setMenuTitles).mock.lastCall![0]);
  expect(titles).toEqual(
    expect.objectContaining({
      settings: 'Settings',
      tools: 'Tools',
      add_recipient: 'Add Recipient',
      copyTransactionId: 'Copy Transaction ID',
    }),
  );
  hook.unmount();
});

it('shares subscriptions, dispatches only to the current route, and cleans up', () => {
  const first = renderHook(useMenuActions);
  const second = renderHook(useMenuActions);
  expect(MenuActionsEmitter!.onMenuAction).toHaveBeenCalledTimes(1);
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
  expect(jest.mocked(MenuActionsEmitter!.setAvailableActions).mock.lastCall![0]).not.toContain('reloadTransactions');
  const subscription = jest.mocked(MenuActionsEmitter!.onMenuAction).mock.results[0].value;
  first.unmount();
  expect(subscription.remove).not.toHaveBeenCalled();
  second.unmount();
  expect(subscription.remove).toHaveBeenCalledTimes(1);
  expect(MenuActionsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
});

it('updates on ready, modal navigation, and lock state', () => {
  jest.mocked(navigationRef.isReady).mockReturnValue(false);
  const hook = renderHook(useMenuActions);
  expect(MenuActionsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  notifyNavigation('ready');
  expect(jest.mocked(MenuActionsEmitter!.setAvailableActions).mock.lastCall![0]).toContain('settings');
  setRoute('SendDetails');
  notifyNavigation('state');
  expect(MenuActionsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([
    'settings',
    'isItMyAddress',
    'broadcastTransaction',
    'generateWord',
    'keyboardShortcuts',
    'openFile',
  ]);
  emit('settings');
  expect(navigationRef.dispatch).toHaveBeenCalledWith({
    type: 'NAVIGATE',
    payload: {
      name: 'DrawerRoot',
      pop: true,
      params: { screen: 'DetailViewStackScreensStack', params: { screen: 'Settings' } },
    },
  });
  emit('keyboardShortcuts');
  expect(navigationRef.navigate).toHaveBeenCalledWith('KeyboardShortcuts');
  jest.mocked(navigationRef.dispatch).mockClear();
  jest.mocked(navigationRef.getRootState).mockReturnValue({
    stale: false,
    type: 'stack',
    key: 'root',
    index: 0,
    routeNames: ['UnlockWithScreen'],
    routes: [{ name: 'UnlockWithScreen', key: 'unlock' }],
  });
  notifyNavigation('state');
  expect(MenuActionsEmitter!.setAvailableActions).toHaveBeenLastCalledWith([]);
  emit('openRecent:wallet:wallet-1');
  expect(navigationRef.dispatch).not.toHaveBeenCalled();
  const removers = jest.mocked(navigationRef.addListener).mock.results.map(result => result.value);
  hook.unmount();
  removers.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
});

it.each([
  ['isItMyAddress', 'IsItMyAddress'],
  ['broadcastTransaction', 'Broadcast'],
  ['generateWord', 'GenerateWord'],
] as const)('opens the %s tool from the native menu', (action, screen) => {
  const hook = renderHook(useMenuActions);
  emit(action);
  expect(navigationRef.dispatch).toHaveBeenCalledWith({
    type: 'NAVIGATE',
    payload: {
      name: 'DrawerRoot',
      pop: true,
      params: { screen: 'DetailViewStackScreensStack', params: { screen } },
    },
  });
  hook.unmount();
});

it('opens files and recent wallets or transactions through current app navigation', () => {
  const openFile = jest.fn();
  setNativeOpenFileHandler(openFile);
  const hook = renderHook(useMenuActions);
  emit('openFile');
  expect(openFile).toHaveBeenCalledTimes(1);
  emit('openRecent:wallet:wallet-1');
  expect(navigationRef.dispatch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({
        params: expect.objectContaining({
          params: { screen: 'WalletTransactions', params: { walletID: 'wallet-1' } },
        }),
      }),
    }),
  );
  emit('openRecent:transaction:wallet-1:abc');
  expect(navigationRef.dispatch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({
        params: expect.objectContaining({
          params: { screen: 'TransactionStatus', params: { hash: 'abc', walletID: 'wallet-1' } },
        }),
      }),
    }),
  );
  hook.unmount();
  setNativeOpenFileHandler(undefined);
});

it('ignores a stale recent action whose wallet was deleted', () => {
  const recentItems = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
  jest.mocked(recentItems.findRecentMenuItem).mockReturnValueOnce(undefined);
  const hook = renderHook(useMenuActions);

  emit('openRecent:wallet:wallet-1');

  expect(navigationRef.dispatch).not.toHaveBeenCalled();
  hook.unmount();
});

it.each([
  ['WalletTransactions', 'send'],
  ['WalletTransactions', 'receive'],
  ['WalletTransactions', 'walletDetails'],
  ['ReceiveDetails', 'copyAddress'],
  ['TransactionStatus', 'copyTransactionId'],
] as const)('dispatches %s / %s only while its handler is registered', (screen, action) => {
  setRoute(screen);
  const hook = renderHook(useMenuActions);
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
  const hook = renderHook(useMenuActions);
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
