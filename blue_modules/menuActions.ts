export type ScreenMenuAction =
  | 'reloadTransactions'
  | 'send'
  | 'receive'
  | 'walletDetails'
  | 'copyAddress'
  | 'copyTransactionId'
  | 'manageWalletSearch'
  | 'manageWalletSave'
  | 'manageWalletClose'
  | 'manageWalletOpen'
  | 'manageWalletSelectUp'
  | 'manageWalletSelectDown'
  | 'manageWalletSelectionMode'
  | 'manageWalletSelectionModeSelected'
  | 'manageWalletMoveUp'
  | 'manageWalletMoveDown';
export type MenuAction =
  | ScreenMenuAction
  | 'settings'
  | 'addWallet'
  | 'importWallet'
  | 'manageWallets'
  | 'backToWallets'
  | 'keyboardShortcuts';
export type MenuActionHandlers = Partial<Record<ScreenMenuAction, () => void>>;

const screenActions: Record<string, readonly ScreenMenuAction[]> = {
  WalletsList: ['reloadTransactions'],
  WalletTransactions: ['reloadTransactions', 'send', 'receive', 'walletDetails'],
  ReceiveDetails: ['copyAddress'],
  TransactionStatus: ['copyTransactionId'],
  ManageWallets: [
    'manageWalletSearch',
    'manageWalletSave',
    'manageWalletClose',
    'manageWalletOpen',
    'manageWalletSelectUp',
    'manageWalletSelectDown',
    'manageWalletSelectionMode',
    'manageWalletSelectionModeSelected',
    'manageWalletMoveUp',
    'manageWalletMoveDown',
  ],
};
const walletDetailScreens = new Set(['WalletTransactions', 'WalletDetails', 'TransactionStatus', 'ReceiveDetails', 'WalletAddresses']);

export function availableMenuActions(screen: string | undefined, registered: readonly ScreenMenuAction[], unlocked: boolean): MenuAction[] {
  if (!unlocked || !screen || screen === 'UnlockWithScreen') return [];
  const actions: MenuAction[] = ['settings', 'manageWallets', 'keyboardShortcuts'];
  if (screen === 'WalletsList' || screen === 'WalletTransactions') actions.push('addWallet', 'importWallet');
  if (walletDetailScreens.has(screen)) actions.push('backToWallets');
  actions.push(...(screenActions[screen] ?? []).filter(action => registered.includes(action)));
  return actions;
}

// Keep these shortcuts aligned with AppDelegate and WalletMenuAction.
type MenuShortcut = {
  action?: 'manageWallets';
  title: string;
  key: string;
  where: string;
  platform?: 'ios' | 'android';
  usesCommand?: boolean;
};

export const menuShortcuts: readonly MenuShortcut[] = [
  { title: 'Add Wallet', key: 'Shift+A', where: 'Wallet overview and transactions' },
  { title: 'Import Wallet', key: 'I', where: 'Wallet overview and transactions' },
  { title: 'Reload Transactions', key: 'R', where: 'Wallet overview and transactions' },
  { title: 'Send…', key: 'Shift+S', where: 'Transactions, when this wallet supports sending' },
  { title: 'Receive…', key: 'Shift+R', where: 'Transactions, when this wallet supports receiving' },
  { title: 'Wallet Details…', key: 'D', where: 'Transactions' },
  { title: 'Copy Address', key: 'Shift+C', where: 'Receive screen, when an address is displayed' },
  { title: 'Copy Transaction ID', key: 'Shift+C', where: 'Transaction details, when an ID is available' },
  { title: 'Back to Wallets', key: 'Shift+W', where: 'Wallet detail screens' },
  { action: 'manageWallets', title: '', key: 'Shift+M', where: '', platform: 'ios' },
  { title: 'Search Wallets', key: 'F', where: 'Manage Wallets', platform: 'ios' },
  { title: 'Save Wallet Changes', key: 'S', where: 'Manage Wallets, when changes exist', platform: 'ios' },
  { title: 'Open Selected Wallet', key: 'Return', where: 'Manage Wallets', platform: 'ios', usesCommand: false },
  { title: 'Select Previous Wallet', key: '↑', where: 'Manage Wallets', platform: 'ios', usesCommand: false },
  { title: 'Select Next Wallet', key: '↓', where: 'Manage Wallets', platform: 'ios', usesCommand: false },
  { title: 'Move Selected Wallet Up', key: '⌥↑', where: 'Manage Wallets', platform: 'ios', usesCommand: false },
  { title: 'Move Selected Wallet Down', key: '⌥↓', where: 'Manage Wallets', platform: 'ios', usesCommand: false },
  { title: 'Close or Cancel Search', key: 'Esc', where: 'Manage Wallets', platform: 'ios', usesCommand: false },
  { title: 'Settings', key: ',', where: 'Anywhere after unlocking' },
  { title: 'Keyboard Shortcuts…', key: '/', where: 'Anywhere after unlocking' },
] as const;
