import { availableMenuActions } from '../../blue_modules/menuActions';

describe('native menu availability', () => {
  it.each([undefined, 'UnlockWithScreen', 'WalletTransactions', 'Settings', 'SendDetails'])(
    'hides everything while locked on %s',
    screen => {
      expect(availableMenuActions(screen, ['send', 'reloadTransactions', 'copyAddress'], false)).toEqual([]);
    },
  );
  it.each(['Settings', 'SendDetails', 'ImportWallet', 'WalletExport', 'KeyboardShortcuts'])(
    'keeps Settings and shortcuts available on %s',
    screen => {
      expect(availableMenuActions(screen, [], true)).toEqual(['settings', 'keyboardShortcuts']);
    },
  );
  it('only offers actions registered by the current screen', () => {
    expect(availableMenuActions('WalletTransactions', ['receive', 'searchTransactions'], true)).toEqual([
      'settings',
      'keyboardShortcuts',
      'addWallet',
      'importWallet',
      'backToWallets',
      'receive',
      'searchTransactions',
    ]);
    expect(availableMenuActions('ReceiveDetails', ['send', 'copyAddress'], true)).toEqual([
      'settings',
      'keyboardShortcuts',
      'backToWallets',
      'copyAddress',
    ]);
    expect(availableMenuActions('TransactionStatus', ['copyTransactionId'], true)).toContain('copyTransactionId');
    expect(availableMenuActions('WalletsList', [], true)).not.toContain('backToWallets');
  });
});
