import { availableMenuActions, menuShortcuts } from '../../blue_modules/menuActions';

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
    expect(availableMenuActions('WalletTransactions', ['receive'], true)).toEqual([
      'settings',
      'keyboardShortcuts',
      'addWallet',
      'importWallet',
      'backToWallets',
      'receive',
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

  it('keeps copy shortcuts unique to avoid menu builder conflicts', () => {
    const keys = menuShortcuts.filter(({ title }) => title === 'Copy Address' || title === 'Copy Transaction ID').map(({ key }) => key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(['Shift+C', 'Shift+T']);
  });
});
