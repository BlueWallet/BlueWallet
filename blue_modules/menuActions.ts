export type ScreenMenuAction =
  | 'reloadTransactions'
  | 'send'
  | 'receive'
  | 'walletDetails'
  | 'copyAddress'
  | 'copyTransactionId'
  | 'add_recipient'
  | 'remove_recipient'
  | 'remove_all_recipients'
  | 'send_max'
  | 'allow_rbf'
  | 'import_transaction'
  | 'import_transaction_qr'
  | 'import_transaction_multisig'
  | 'co_sign_transaction'
  | 'sign_psbt'
  | 'insert_contact'
  | 'coin_control';
export type MenuAction =
  | ScreenMenuAction
  | 'settings'
  | 'isItMyAddress'
  | 'broadcastTransaction'
  | 'generateWord'
  | 'addWallet'
  | 'importWallet'
  | 'openFile'
  | 'backToWallets'
  | 'keyboardShortcuts';
export type MenuActionHandlers = Partial<Record<ScreenMenuAction, () => void>>;
export type MenuActionState = { disabled?: boolean; checked?: boolean };
export type MenuActionStates = Partial<Record<ScreenMenuAction, MenuActionState>>;

export type MenuActionTitles = Record<MenuAction | 'tools' | 'openRecent' | 'noRecent' | 'unlockRecent', string>;

const sendDetailsActionAliases: Readonly<Record<string, ScreenMenuAction>> = {
  AddRecipient: 'add_recipient',
  RemoveRecipient: 'remove_recipient',
  RemoveAllRecipients: 'remove_all_recipients',
};

const screenActions: Record<string, readonly ScreenMenuAction[]> = {
  WalletsList: ['reloadTransactions'],
  WalletTransactions: ['reloadTransactions', 'send', 'receive', 'walletDetails'],
  ReceiveDetails: ['copyAddress'],
  TransactionStatus: ['copyTransactionId'],
  SendDetails: [
    'add_recipient',
    'remove_recipient',
    'remove_all_recipients',
    'send_max',
    'allow_rbf',
    'import_transaction',
    'import_transaction_qr',
    'import_transaction_multisig',
    'co_sign_transaction',
    'sign_psbt',
    'insert_contact',
    'coin_control',
  ],
};
const walletDetailScreens = new Set(['WalletTransactions', 'WalletDetails', 'TransactionStatus', 'ReceiveDetails', 'WalletAddresses']);

export function availableMenuActions(screen: string | undefined, registered: readonly ScreenMenuAction[], unlocked: boolean): MenuAction[] {
  if (!unlocked || !screen || screen === 'UnlockWithScreen') return [];
  const actions: MenuAction[] = ['settings', 'isItMyAddress', 'broadcastTransaction', 'generateWord', 'keyboardShortcuts', 'openFile'];
  if (screen === 'WalletsList' || screen === 'WalletTransactions') actions.push('addWallet', 'importWallet');
  if (walletDetailScreens.has(screen)) actions.push('backToWallets');
  actions.push(...(screenActions[screen] ?? []).filter(action => registered.includes(action)));
  return actions;
}

export function nativeSendDetailsAction(actionId: string): ScreenMenuAction | undefined {
  const nativeAction = sendDetailsActionAliases[actionId] ?? actionId;
  return screenActions.SendDetails.includes(nativeAction as ScreenMenuAction) ? (nativeAction as ScreenMenuAction) : undefined;
}

// Keep these shortcuts aligned with AppDelegate and WalletMenuAction.
export const menuShortcuts = [
  { title: 'Open…', key: 'O', where: 'Anywhere after unlocking' },
  { title: 'Add Wallet', key: 'Shift+A', where: 'Wallet overview and transactions' },
  { title: 'Import Wallet', key: 'I', where: 'Wallet overview and transactions' },
  { title: 'Reload Transactions', key: 'R', where: 'Wallet overview and transactions' },
  { title: 'Send…', key: 'Shift+S', where: 'Transactions, when this wallet supports sending' },
  { title: 'Receive…', key: 'Shift+R', where: 'Transactions, when this wallet supports receiving' },
  { title: 'Wallet Details…', key: 'D', where: 'Transactions' },
  { title: 'Copy Address', key: 'Shift+C', where: 'Receive screen, when an address is displayed' },
  { title: 'Copy Transaction ID', key: 'Shift+C', where: 'Transaction details, when an ID is available' },
  { title: 'Back to Wallets', key: 'Shift+W', where: 'Wallet detail screens' },
  { title: 'Settings', key: ',', where: 'Anywhere after unlocking' },
  { title: 'Keyboard Shortcuts…', key: '/', where: 'Anywhere after unlocking' },
] as const;
