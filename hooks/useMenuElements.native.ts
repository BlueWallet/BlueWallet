import { buildHeaderMenu, groupHeaderMenu, type HeaderMenuEntry } from '../blue_modules/headerMenuActions';
import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { isTablet, isDesktop } from '../blue_modules/environment';
import { CommonActions } from '@react-navigation/native';
import MenuElementsEmitter from '../blue_modules/NativeMenuElementsEmitter';
import { availableMenuActions, MenuActionHandlers, ScreenMenuAction } from '../blue_modules/menuActions';
import { navigationRef, navigateToWalletsList } from '../NavigationService';

const handlerRegistry = new Map<string, Map<symbol, MenuActionHandlers>>();
const headerRegistry = new Map<string, Map<symbol, ReturnType<typeof buildHeaderMenu>>>();
let consumers = 0;
let dispose: (() => void) | undefined;

function currentContext() {
  const ready = navigationRef.isReady();
  const route = ready ? navigationRef.getCurrentRoute() : undefined;
  const root = ready ? navigationRef.getRootState() : undefined;
  // MainRoot registers DrawerRoot only after storage has been unlocked.
  const unlocked = !!root?.routeNames.includes('DrawerRoot') && root.routes[root.index]?.name !== 'UnlockWithScreen';
  const handlers: MenuActionHandlers = Object.assign({}, ...(route ? (handlerRegistry.get(route.key)?.values() ?? []) : []));
  const header = route ? [...(headerRegistry.get(route.key)?.values() ?? [])].at(-1) : undefined;
  const actions = availableMenuActions(route?.name, Object.keys(handlers) as ScreenMenuAction[], unlocked);
  const migratedCommands = {
    AddWalletButton: 'addWallet',
    ImportWallet: 'importWallet',
    SettingsButton: 'settings',
    WalletDetails: 'walletDetails',
  } as const;
  // Existing system commands already expose these actions; avoid duplicate entries.
  const items = header?.items.filter(
    item =>
      !Object.entries(migratedCommands).some(
        ([id, action]) => item.id.endsWith(`:${id}`) && (Platform.OS === 'ios' || isTablet || isDesktop || actions.includes(action)),
      ),
  );

  return {
    header: unlocked && header ? { ...header, items: groupHeaderMenu(items!, route?.name ?? '') } : undefined,
    handlers,
    actions,
  };
}

function syncMenu() {
  const { actions, header } = currentContext();
  MenuElementsEmitter?.setAvailableActions(actions);
  MenuElementsEmitter?.setHeaderMenu(JSON.stringify(header?.items ?? []));
}

function subscribe() {
  if (!MenuElementsEmitter) return;
  const subscription = MenuElementsEmitter.onMenuAction(action => {
    const { actions, handlers, header } = currentContext();
    if (action.startsWith('header:')) {
      header?.handlers[action]?.();
      return;
    }
    if (!actions.some(available => available === action)) return;
    switch (action) {
      case 'settings':
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'DrawerRoot',
            params: {
              screen: 'DetailViewStackScreensStack',
              params: { screen: 'Settings' },
            },
            pop: true,
          }),
        );
        break;
      case 'keyboardShortcuts':
        navigationRef.navigate('KeyboardShortcuts');
        break;
      case 'backToWallets':
        navigateToWalletsList();
        break;
      case 'addWallet':
        navigationRef.navigate('AddWalletRoot');
        break;
      case 'importWallet':
        navigationRef.navigate('AddWalletRoot', { screen: 'ImportWallet' });
        break;
      default:
        handlers[action as ScreenMenuAction]?.();
    }
  });
  const removeStateListener = navigationRef.addListener('state', syncMenu);
  const removeReadyListener = navigationRef.addListener('ready', syncMenu);
  syncMenu();
  return () => {
    subscription.remove();
    removeStateListener();
    removeReadyListener();
    MenuElementsEmitter?.setAvailableActions([]);
    MenuElementsEmitter?.setHeaderMenu('[]');
  };
}

const useMenuElements = () => {
  useEffect(() => {
    if (consumers++ === 0) dispose = subscribe();
    return () => {
      if (--consumers === 0) {
        dispose?.();
        dispose = undefined;
      }
    };
  }, []);

  const registerMenuActions = useCallback((handlers: MenuActionHandlers, screenKey: string): (() => void) => {
    if (!MenuElementsEmitter) return () => {};
    const token = Symbol(screenKey);
    const entries = handlerRegistry.get(screenKey) ?? new Map<symbol, MenuActionHandlers>();
    entries.set(token, handlers);
    handlerRegistry.set(screenKey, entries);
    syncMenu();
    return () => {
      entries.delete(token);
      if (entries.size === 0) handlerRegistry.delete(screenKey);
      syncMenu();
    };
  }, []);

  const registerHeaderMenu = useCallback((actions: HeaderMenuEntry[] | HeaderMenuEntry[][], screenKey: string): (() => void) => {
    if (!MenuElementsEmitter) return () => {};
    const token = Symbol(screenKey);
    const entries = headerRegistry.get(screenKey) ?? new Map();
    entries.set(token, buildHeaderMenu(actions, screenKey));
    headerRegistry.set(screenKey, entries);
    syncMenu();
    return () => {
      entries.delete(token);
      if (!entries.size) headerRegistry.delete(screenKey);
      syncMenu();
    };
  }, []);

  return {
    registerHeaderMenu,
    registerMenuActions,
    isMenuElementsSupported: !!MenuElementsEmitter,
  };
};

export default useMenuElements;
