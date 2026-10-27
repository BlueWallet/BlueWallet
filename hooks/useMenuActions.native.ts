import { useEffect, useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import MenuActionsEmitter from '../blue_modules/NativeMenuActionsEmitter';
import { availableMenuActions, MenuActionHandlers, MenuActionStates, ScreenMenuAction } from '../blue_modules/menuActions';
import { navigationRef, navigateToWalletsList } from '../NavigationService';
import {
  findRecentMenuItem,
  getRecentMenuItems,
  loadRecentMenuItems,
  subscribeToRecentMenuItems,
} from '../components/Context/recentMenuItems';
import { getMenuActionTitles } from '../blue_modules/menuActionTitles';

type MenuRegistration = {
  handlers: MenuActionHandlers;
  states: MenuActionStates;
};
const handlerRegistry = new Map<string, Map<symbol, MenuRegistration>>();
let consumers = 0;
let dispose: (() => void) | undefined;
let openFileHandler: (() => void) | undefined;
let walletsInitialized = false;

export function setNativeOpenFileHandler(handler: (() => void) | undefined): void {
  openFileHandler = handler;
}

function currentContext() {
  const ready = navigationRef.isReady();
  const route = ready ? navigationRef.getCurrentRoute() : undefined;
  const root = ready ? navigationRef.getRootState() : undefined;
  const unlocked = walletsInitialized && !!root?.routeNames.includes('DrawerRoot') && root.routes[root.index]?.name !== 'UnlockWithScreen';
  const registrations = route ? [...(handlerRegistry.get(route.key)?.values() ?? [])] : [];
  const handlers: MenuActionHandlers = Object.assign({}, ...registrations.map(registration => registration.handlers));
  const states: MenuActionStates = Object.assign({}, ...registrations.map(registration => registration.states));
  return {
    handlers,
    states,
    actions: availableMenuActions(route?.name, Object.keys(handlers) as ScreenMenuAction[], unlocked),
  };
}

function syncMenu() {
  const context = currentContext();
  MenuActionsEmitter?.setAvailableActions(context.actions);
  MenuActionsEmitter?.setActionStates(JSON.stringify(context.states));
  MenuActionsEmitter?.setMenuTitles(JSON.stringify(getMenuActionTitles()));
  MenuActionsEmitter?.setRecentItems(JSON.stringify(getRecentMenuItems()));
}

function navigateToTool(screen: 'IsItMyAddress' | 'Broadcast' | 'GenerateWord') {
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'DrawerRoot',
      params: { screen: 'DetailViewStackScreensStack', params: { screen } },
      pop: true,
    }),
  );
}

export function setNativeMenuWalletsInitialized(initialized: boolean): void {
  if (walletsInitialized === initialized) return;
  walletsInitialized = initialized;
  syncMenu();
}

function subscribe() {
  if (!MenuActionsEmitter) return;
  const subscription = MenuActionsEmitter.onMenuAction(action => {
    const { actions, handlers } = currentContext();
    const isRecentAction =
      actions.includes('openFile') && action.startsWith('openRecent:') && !!findRecentMenuItem(action.slice('openRecent:'.length));
    if (!actions.some(available => available === action) && !isRecentAction) return;
    switch (action) {
      case 'openFile':
        openFileHandler?.();
        break;
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
      case 'isItMyAddress':
        navigateToTool('IsItMyAddress');
        break;
      case 'broadcastTransaction':
        navigateToTool('Broadcast');
        break;
      case 'generateWord':
        navigateToTool('GenerateWord');
        break;
      case 'keyboardShortcuts':
        navigationRef.navigate('KeyboardShortcuts');
        break;
      case 'manageWallets':
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'DrawerRoot',
            params: {
              screen: 'DetailViewStackScreensStack',
              params: { screen: 'ManageWallets' },
            },
            pop: true,
          }),
        );
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
        if (action.startsWith('openRecent:')) {
          const item = findRecentMenuItem(action.slice('openRecent:'.length));
          if (!item) return;
          navigationRef.dispatch(
            CommonActions.navigate({
              name: 'DrawerRoot',
              params: {
                screen: 'DetailViewStackScreensStack',
                params: {
                  screen: item.kind === 'wallet' ? 'WalletTransactions' : 'TransactionStatus',
                  params: item.kind === 'wallet' ? { walletID: item.walletID } : { hash: item.transactionID, walletID: item.walletID },
                },
              },
              pop: true,
            }),
          );
          break;
        }
        handlers[action as ScreenMenuAction]?.();
    }
  });
  const removeStateListener = navigationRef.addListener('state', syncMenu);
  const removeReadyListener = navigationRef.addListener('ready', syncMenu);
  const removeRecentListener = subscribeToRecentMenuItems(syncMenu);
  loadRecentMenuItems().catch(error => console.warn('Failed to load native menu history:', error));
  syncMenu();
  return () => {
    subscription.remove();
    removeStateListener();
    removeReadyListener();
    removeRecentListener();
    MenuActionsEmitter?.setAvailableActions([]);
    MenuActionsEmitter?.setActionStates('{}');
    MenuActionsEmitter?.setMenuTitles('{}');
    MenuActionsEmitter?.setRecentItems('[]');
  };
}

const useMenuActions = () => {
  useEffect(() => {
    if (consumers++ === 0) dispose = subscribe();
    return () => {
      if (--consumers === 0) {
        dispose?.();
        dispose = undefined;
      }
    };
  }, []);

  const registerMenuActions = useCallback(
    (handlers: MenuActionHandlers, screenKey: string, states: MenuActionStates = {}): (() => void) => {
      if (!MenuActionsEmitter) return () => {};
      const token = Symbol(screenKey);
      const entries = handlerRegistry.get(screenKey) ?? new Map<symbol, MenuRegistration>();
      entries.set(token, { handlers, states });
      handlerRegistry.set(screenKey, entries);
      syncMenu();
      return () => {
        entries.delete(token);
        if (entries.size === 0) handlerRegistry.delete(screenKey);
        syncMenu();
      };
    },
    [],
  );

  return { registerMenuActions, isMenuActionsSupported: !!MenuActionsEmitter };
};

export default useMenuActions;
