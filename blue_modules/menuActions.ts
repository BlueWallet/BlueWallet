export type ScreenMenuAction =
  | 'reloadTransactions'
  | 'send'
  | 'receive'
  | 'walletDetails'
  | 'copyAddress'
  | 'copyTransactionId';
export type MenuAction = ScreenMenuAction | 'settings' | 'addWallet' | 'importWallet' | 'backToWallets' | 'keyboardShortcuts';
export type MenuActionHandlers = Partial<Record<ScreenMenuAction, () => void>>;

const screenActions: Record<string, readonly ScreenMenuAction[]> = {
  WalletsList: ['reloadTransactions'],
  WalletTransactions: ['reloadTransactions', 'send', 'receive', 'walletDetails'],
  ReceiveDetails: ['copyAddress'],
  TransactionStatus: ['copyTransactionId'],
};
const walletDetailScreens = new Set(['WalletTransactions', 'WalletDetails', 'TransactionStatus', 'ReceiveDetails', 'WalletAddresses']);

export function availableMenuActions(screen: string | undefined, registered: readonly ScreenMenuAction[], unlocked: boolean): MenuAction[] {
  if (!unlocked || !screen || screen === 'UnlockWithScreen') return [];
  const actions: MenuAction[] = ['settings', 'keyboardShortcuts'];
  if (screen === 'WalletsList' || screen === 'WalletTransactions') actions.push('addWallet', 'importWallet');
  if (walletDetailScreens.has(screen)) actions.push('backToWallets');
  actions.push(...(screenActions[screen] ?? []).filter(action => registered.includes(action)));
  return actions;
}

// Keep these shortcuts aligned with AppDelegate and WalletMenuAction.
export const menuShortcuts = [
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
