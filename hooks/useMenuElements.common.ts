export enum MenuActionType {
  OPEN_SETTINGS = 'openSettings',
  ADD_WALLET = 'addWalletMenuAction',
  IMPORT_WALLET = 'importWalletMenuAction',
  RELOAD_TRANSACTIONS = 'reloadTransactionsMenuAction',
}

export type ActionHandler = () => void;
