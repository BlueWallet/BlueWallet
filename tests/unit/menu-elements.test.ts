import { act, renderHook } from '@testing-library/react-native';
import useMenuElements from '../../hooks/useMenuElements.native';
import MenuElementsEmitter from '../../blue_modules/NativeMenuElementsEmitter';
import { navigationRef, navigateToWalletsList } from '../../NavigationService';
import type { MenuActionHandlers } from '../../blue_modules/menuActions';

jest.mock('@react-navigation/native', () => ({ CommonActions: { navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }) } }));
jest.mock('../../blue_modules/NativeMenuElementsEmitter', () => ({
  __esModule: true,
  default: { setAvailableActions: jest.fn(), onMenuAction: jest.fn(() => ({ remove: jest.fn() })) },
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
      params: { screen: 'DetailViewStackScreensStack', params: { screen: 'Settings' } },
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
  ['WalletTransactions', 'searchTransactions'],
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
