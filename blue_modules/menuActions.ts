export type ScreenMenuAction =
  | 'reloadTransactions'
  | 'send'
  | 'receive'
  | 'walletDetails'
  | 'copyAddress'
  | 'copyTransactionId'
  | 'copyTransactionHex'
  | 'bumpFeeRbf'
  | 'bumpFeeCpfp'
  | 'accelerateTransaction'
  | 'cancelTransaction'
  | 'openTransactionInExplorer'
  | 'editTransactionNote'
  | 'toggleBlockDetails'
  | 'toggleAdvancedDetails'
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
  | 'manageWallets'
  | 'backToWallets'
  | 'keyboardShortcuts';
export type MenuActionHandlers = Partial<Record<ScreenMenuAction, () => void>>;
export type MenuActionState = { disabled?: boolean; checked?: boolean };
export type MenuActionStates = Partial<Record<ScreenMenuAction, MenuActionState>>;

export type MenuActionTitles = Record<MenuAction | 'tools' | 'transactionMenu' | 'openRecent' | 'noRecent' | 'unlockRecent', string>;

const sendDetailsActionAliases: Readonly<Record<string, ScreenMenuAction>> = {
  AddRecipient: 'add_recipient',
  RemoveRecipient: 'remove_recipient',
  RemoveAllRecipients: 'remove_all_recipients',
};

const screenActions: Record<string, readonly ScreenMenuAction[]> = {
  WalletsList: ['reloadTransactions'],
  WalletTransactions: ['reloadTransactions', 'send', 'receive', 'walletDetails'],
  ReceiveDetails: ['copyAddress'],
  TransactionStatus: [
    'copyTransactionId',
    'copyTransactionHex',
    'bumpFeeRbf',
    'bumpFeeCpfp',
    'accelerateTransaction',
    'cancelTransaction',
    'openTransactionInExplorer',
    'editTransactionNote',
    'toggleBlockDetails',
    'toggleAdvancedDetails',
  ],
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
  const actions: MenuAction[] = [
    'settings',
    'manageWallets',
    'isItMyAddress',
    'broadcastTransaction',
    'generateWord',
    'keyboardShortcuts',
    'openFile',
  ];
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
export const menuShortcuts: readonly {
  action: MenuAction;
  key: string;
  scope:
    | 'anywhere'
    | 'walletOverview'
    | 'sendCapableTransaction'
    | 'receiveCapableTransaction'
    | 'transactions'
    | 'receiveAddress'
    | 'transactionId'
    | 'transactionAdvanced'
    | 'transactionRbf'
    | 'transactionCpfp'
    | 'transactionExternalAcceleration'
    | 'transactionCancellation'
    | 'onchainTransaction'
    | 'transaction'
    | 'confirmedOnchainTransaction'
    | 'walletDetails'
    | 'sendDetails';
  platform?: 'ios' | 'android';
}[] = [
  { action: 'openFile', key: 'O', scope: 'anywhere' },
  {
    action: 'addWallet',
    key: 'Shift+A',
    scope: 'walletOverview',
  },
  {
    action: 'importWallet',
    key: 'I',
    scope: 'walletOverview',
  },
  {
    action: 'manageWallets',
    key: 'Shift+M',
    scope: 'anywhere',
    platform: 'ios',
  },
  {
    action: 'reloadTransactions',
    key: 'R',
    scope: 'walletOverview',
  },
  {
    action: 'send',
    key: 'Shift+S',
    scope: 'sendCapableTransaction',
  },
  {
    action: 'receive',
    key: 'Shift+R',
    scope: 'receiveCapableTransaction',
  },
  { action: 'walletDetails', key: 'D', scope: 'transactions' },
  {
    action: 'copyAddress',
    key: 'Shift+C',
    scope: 'receiveAddress',
  },
  {
    action: 'copyTransactionId',
    key: 'Shift+C',
    scope: 'transactionId',
  },
  {
    action: 'copyTransactionHex',
    key: 'Alt+Shift+C',
    scope: 'transactionAdvanced',
  },
  {
    action: 'bumpFeeRbf',
    key: 'Alt+U',
    scope: 'transactionRbf',
  },
  {
    action: 'bumpFeeCpfp',
    key: 'Alt+Shift+U',
    scope: 'transactionCpfp',
  },
  {
    action: 'accelerateTransaction',
    key: 'Shift+U',
    scope: 'transactionExternalAcceleration',
  },
  {
    action: 'cancelTransaction',
    key: 'Alt+K',
    scope: 'transactionCancellation',
  },
  {
    action: 'openTransactionInExplorer',
    key: 'Alt+E',
    scope: 'onchainTransaction',
  },
  { action: 'editTransactionNote', key: 'Alt+N', scope: 'transaction' },
  {
    action: 'toggleBlockDetails',
    key: 'Alt+B',
    scope: 'confirmedOnchainTransaction',
  },
  { action: 'toggleAdvancedDetails', key: 'Alt+A', scope: 'transaction' },
  { action: 'backToWallets', key: 'Shift+W', scope: 'walletDetails' },
  {
    action: 'isItMyAddress',
    key: 'Shift+I',
    scope: 'anywhere',
  },
  {
    action: 'broadcastTransaction',
    key: 'Shift+B',
    scope: 'anywhere',
  },
  {
    action: 'generateWord',
    key: 'Shift+G',
    scope: 'anywhere',
  },
  { action: 'add_recipient', key: 'Alt+A', scope: 'sendDetails' },
  { action: 'remove_recipient', key: 'Alt+R', scope: 'sendDetails' },
  { action: 'remove_all_recipients', key: 'Alt+Shift+R', scope: 'sendDetails' },
  { action: 'send_max', key: 'Alt+M', scope: 'sendDetails' },
  { action: 'allow_rbf', key: 'Alt+B', scope: 'sendDetails' },
  { action: 'import_transaction', key: 'Alt+I', scope: 'sendDetails' },
  { action: 'import_transaction_qr', key: 'Alt+Q', scope: 'sendDetails' },
  {
    action: 'import_transaction_multisig',
    key: 'Alt+Shift+I',
    scope: 'sendDetails',
  },
  { action: 'co_sign_transaction', key: 'Alt+C', scope: 'sendDetails' },
  { action: 'sign_psbt', key: 'Alt+S', scope: 'sendDetails' },
  { action: 'insert_contact', key: 'Alt+P', scope: 'sendDetails' },
  { action: 'coin_control', key: 'Alt+O', scope: 'sendDetails' },
  { action: 'settings', key: ',', scope: 'anywhere' },
  { action: 'keyboardShortcuts', key: '/', scope: 'anywhere' },
] as const;
