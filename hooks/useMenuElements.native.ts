import { useEffect, useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import MenuElementsEmitter from '../blue_modules/NativeMenuElementsEmitter';
import { availableMenuActions, MenuActionHandlers, ScreenMenuAction } from '../blue_modules/menuActions';
import { navigationRef, navigateToWalletsList } from '../NavigationService';
import loc from '../loc';

const handlerRegistry = new Map<string, Map<symbol, MenuActionHandlers>>();
let consumers = 0;
let dispose: (() => void) | undefined;

function currentContext() {
  const ready = navigationRef.isReady();
  const route = ready ? navigationRef.getCurrentRoute() : undefined;
  const root = ready ? navigationRef.getRootState() : undefined;
  // MainRoot registers DrawerRoot only after storage has been unlocked.
  const unlocked = !!root?.routeNames.includes('DrawerRoot') && root.routes[root.index]?.name !== 'UnlockWithScreen';
  const handlers: MenuActionHandlers = Object.assign({}, ...(route ? (handlerRegistry.get(route.key)?.values() ?? []) : []));
  return { handlers, actions: availableMenuActions(route?.name, Object.keys(handlers) as ScreenMenuAction[], unlocked) };
}

function syncMenu() {
  const { actions } = currentContext();
  const localizedTitles: Array<{ action: string; title: string }> = [];
  if (actions.includes('manageWallets')) {
    localizedTitles.push({ action: 'manageWallets', title: `${loc.wallets.manage_title}…` });
  }
  if (actions.includes('manageWalletSelectionMode')) {
    localizedTitles.push(
      { action: 'manageWalletMenu', title: loc.wallets.wallet_menu_title },
      { action: 'manageWalletSelectionMode', title: loc.wallets.wallet_selection_mode },
    );
  }
  const titleMetadata = localizedTitles.map(({ action, title }) => `__menu_title__${JSON.stringify({ action, title })}`);
  MenuElementsEmitter?.setAvailableActions([...actions, ...titleMetadata]);
}

function subscribe() {
  if (!MenuElementsEmitter) return;
  const subscription = MenuElementsEmitter.onMenuAction(action => {
    const { actions, handlers } = currentContext();
    if (!actions.some(available => available === action)) return;
    switch (action) {
      case 'settings':
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'DrawerRoot',
            params: { screen: 'DetailViewStackScreensStack', params: { screen: 'Settings' } },
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
      case 'manageWallets':
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'DrawerRoot',
            params: { screen: 'DetailViewStackScreensStack', params: { screen: 'ManageWallets' } },
            pop: true,
          }),
        );
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

  return { registerMenuActions, isMenuElementsSupported: !!MenuElementsEmitter };
};

export default useMenuElements;
