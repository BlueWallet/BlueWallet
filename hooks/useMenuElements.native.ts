import { buildHeaderMenu, groupHeaderMenu, type HeaderMenuEntry } from '../blue_modules/headerMenuActions';
import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { isTablet, isDesktop } from '../blue_modules/environment';
import { CommonActions } from '@react-navigation/native';
import MenuElementsEmitter from '../blue_modules/NativeMenuElementsEmitter';
import { availableMenuActions, MenuActionHandlers, ScreenMenuAction } from '../blue_modules/menuActions';
import { navigationRef, navigateToWalletsList } from '../NavigationService';
import loc from '../loc';

const handlerRegistry = new Map<string, Map<symbol, MenuActionHandlers>>();
const headerRegistry = new Map<string, Map<symbol, ReturnType<typeof buildHeaderMenu>>>();
type RecentRoute = { key: string; name: string; params?: object };
type RecentScreen = { id: string; title: string; path: RecentRoute[] };
const recentScreens: RecentScreen[] = [];
const transientScreens = new Set(['UnlockWithScreen', 'ScanQRCode', 'Success', 'ClipboardDetected', 'KeyboardShortcuts']);
const navigationContainers = new Set(['Drawer', 'DrawerRoot', 'MainRoot']);
const isNavigationContainer = (name: string) => navigationContainers.has(name) || /Stack$/.test(name);
let consumers = 0;
let dispose: (() => void) | undefined;

function activeRoutePath(): RecentRoute[] {
  const path: RecentRoute[] = [];
  let state: any = navigationRef.isReady() ? navigationRef.getRootState() : undefined;
  while (state?.routes?.length) {
    const route = state.routes[state.index ?? 0];
    if (!route) break;
    path.push({ key: route.key, name: route.name, params: route.params });
    state = route.state;
  }
  const current = navigationRef.getCurrentRoute();
  if (current && path.at(-1)?.key !== current.key) {
    path.push({ key: current.key, name: current.name, params: current.params });
  }
  return path;
}

export function resetRecentScreens() {
  recentScreens.length = 0;
}

function screenTitle(name: string) {
  return name
    .replace(/Root$|Stack$/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

function recordCurrentScreen() {
  const path = activeRoutePath();
  const route = path.at(-1);
  if (!route || transientScreens.has(route.name) || isNavigationContainer(route.name)) return;
  const existing = recentScreens.findIndex(screen => screen.id === route.key);
  if (existing >= 0) recentScreens.splice(existing, 1);
  recentScreens.unshift({ id: route.key, title: screenTitle(route.name), path });
  recentScreens.splice(10);
}

function openRecentScreen(path: RecentRoute[]) {
  const leaf = path.at(-1);
  if (!leaf) return;
  let destination: { name: string; params?: object } = { name: leaf.name, params: leaf.params };
  for (let index = path.length - 2; index >= 0; index--) {
    destination = { name: path[index].name, params: { screen: destination.name, params: destination.params } };
  }
  navigationRef.dispatch(CommonActions.navigate(destination));
}

export function getHeaderMenuEntries(header: { items?: ReturnType<typeof buildHeaderMenu>['items'] } | undefined) {
  return Array.isArray(header?.items) ? header.items : [];
}

export function getHeaderMenuHandlers(header: { handlers?: Record<string, () => void> } | undefined) {
  return header?.handlers ?? {};
}

function currentContext() {
  const ready = navigationRef.isReady();
  const route = ready ? navigationRef.getCurrentRoute() : undefined;
  const root = ready ? navigationRef.getRootState() : undefined;
  // MainRoot registers DrawerRoot only after storage has been unlocked.
  const unlocked = !!root?.routeNames.includes('DrawerRoot') && root.routes[root.index]?.name !== 'UnlockWithScreen';
  const handlers: MenuActionHandlers = Object.assign({}, ...(route ? (handlerRegistry.get(route.key)?.values() ?? []) : []));
  const headers = route ? [...(headerRegistry.get(route.key)?.values() ?? [])] : [];
  const header = headers.length
    ? {
        items: [...new Map(headers.flatMap(entry => entry.items.map(item => [item.id, item] as const))).values()],
        handlers: Object.assign({}, ...headers.map(entry => entry.handlers)),
      }
    : undefined;
  const headerItems = getHeaderMenuEntries(header);
  const headerHandlers = { ...getHeaderMenuHandlers(header) };
  const actions = availableMenuActions(route?.name, Object.keys(handlers) as ScreenMenuAction[], unlocked, Platform.OS);
  const migratedCommands = {
    AddWalletButton: 'addWallet',
    ImportWallet: 'importWallet',
    SettingsButton: 'settings',
    WalletDetails: 'walletDetails',
  } as const;
  // Existing system commands already expose these actions; avoid duplicate entries.
  const items = headerItems.filter(
    item =>
      !(Platform.OS === 'android' && route?.name !== 'WalletsList' && item.id.endsWith(':SettingsButton')) &&
      !Object.entries(migratedCommands).some(
        ([id, action]) => item.id.endsWith(`:${id}`) && (Platform.OS === 'ios' || isTablet || isDesktop || actions.includes(action)),
      ),
  );
  const otherRecentScreens = recentScreens.filter(screen => screen.id !== route?.key);
  if (!transientScreens.has(route?.name ?? '') && otherRecentScreens.length > 0) {
    const recent = buildHeaderMenu(
      [
        {
          id: 'open_recent',
          text: 'Open Recent',
          subactions: [
            ...otherRecentScreens.map(screen => ({
              id: `open_recent_${screen.id}`,
              text: screen.title,
              onPress: () => openRecentScreen(screen.path),
            })),
            {
              id: 'clear_recent_section',
              text: '',
              displayInline: true,
              subactions: [
                {
                  id: 'clear_recent',
                  text: loc._.menu_clear_recent,
                  onPress: () => {
                    resetRecentScreens();
                    MenuElementsEmitter?.setHeaderMenu(JSON.stringify(currentContext().header?.items ?? []));
                  },
                },
              ],
            },
          ],
        },
      ],
      'recent',
    );
    items.push(...recent.items);
    Object.assign(headerHandlers, recent.handlers);
  }

  return {
    header: unlocked && header ? { ...header, items: groupHeaderMenu(items, route?.name ?? '') } : undefined,
    headerHandlers,
    handlers,
    actions,
  };
}

function syncMenu() {
  recordCurrentScreen();
  const { actions, header } = currentContext();
  MenuElementsEmitter?.setAvailableActions(actions);
  MenuElementsEmitter?.setHeaderMenu(JSON.stringify(header?.items ?? []));
}

function subscribe() {
  if (!MenuElementsEmitter) return;
  const subscription = MenuElementsEmitter.onMenuAction(action => {
    const { actions, handlers, headerHandlers } = currentContext();
    if (action.startsWith('header:')) {
      headerHandlers[action]?.();
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
