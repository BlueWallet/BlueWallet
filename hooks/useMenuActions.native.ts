import { useEffect, useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import MenuActionsEmitter from '../blue_modules/NativeMenuActionsEmitter';
import { availableMenuActions, MenuActionHandlers, MenuActionStates, ScreenMenuAction } from '../blue_modules/menuActions';
import type { MenuActionTitles } from '../blue_modules/menuActions';
import { navigationRef, navigateToWalletsList } from '../NavigationService';
import {
  findRecentMenuItem,
  getRecentMenuItems,
  loadRecentMenuItems,
  subscribeToRecentMenuItems,
} from '../components/Context/recentMenuItems';
import loc from '../loc';

type MenuRegistration = { handlers: MenuActionHandlers; states: MenuActionStates };
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
  return { handlers, states, actions: availableMenuActions(route?.name, Object.keys(handlers) as ScreenMenuAction[], unlocked) };
}

export function getMenuActionTitles(): MenuActionTitles {
  return {
    openFile: loc.menu.open,
    openRecent: loc.menu.open_recent,
    noRecent: loc.menu.no_recent,
    unlockRecent: loc.menu.unlock_recent,
    addWallet: loc.wallets.add_title,
    importWallet: loc.wallets.add_import_wallet,
    reloadTransactions: loc._.refresh,
    send: loc.send.header,
    receive: loc.receive.header,
    walletDetails: loc.wallets.details_title,
    copyAddress: loc.menu.copy_address,
    copyTransactionId: loc.transactions.details_copy_txid,
    backToWallets: loc.menu.back_to_wallets,
    settings: loc.settings.header,
    tools: loc.settings.tools,
    isItMyAddress: loc.is_it_my_address.title,
    broadcastTransaction: loc.settings.network_broadcast,
    generateWord: loc.autofill_word.title,
    keyboardShortcuts: loc.menu.keyboard_shortcuts,
    add_recipient: loc.send.details_add_rec_add,
    remove_recipient: loc.send.details_add_rec_rem,
    remove_all_recipients: loc.send.details_add_rec_rem_all,
    send_max: loc.send.details_adv_full,
    allow_rbf: loc.send.details_adv_fee_bump,
    import_transaction: loc.send.details_adv_import,
    import_transaction_qr: loc.send.details_adv_import_qr,
    import_transaction_multisig: loc.send.details_adv_import,
    co_sign_transaction: loc.multisig.co_sign_transaction,
    sign_psbt: loc.send.psbt_sign,
    insert_contact: loc.send.details_insert_contact,
    coin_control: loc.cc.header,
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
            params: { screen: 'DetailViewStackScreensStack', params: { screen: 'Settings' } },
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
