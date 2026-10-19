import { availableMenuActions } from '../../blue_modules/menuActions';

describe('native menu availability', () => {
  it.each([undefined, 'UnlockWithScreen', 'WalletTransactions', 'Settings', 'SendDetails'])(
    'hides everything while locked on %s',
    screen => {
      expect(availableMenuActions(screen, ['send', 'reloadTransactions', 'copyAddress'], false)).toEqual([]);
    },
  );
  it.each(['Settings', 'SendDetails', 'WalletExport', 'KeyboardShortcuts'])('keeps Settings and shortcuts available on %s', screen => {
    expect(availableMenuActions(screen, [], true)).toEqual(['settings', 'keyboardShortcuts']);
  });
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
    expect(availableMenuActions('WalletsList', [], true)).toContain('manageWallets');
    expect(availableMenuActions('AddWallet', [], true)).toContain('manageWallets');
    expect(availableMenuActions('ImportWallet', [], true)).toContain('manageWallets');
  });

  it('offers only currently valid Manage Wallets commands', () => {
    expect(availableMenuActions('ManageWallets', ['manageWalletSearch', 'manageWalletClose', 'manageWalletSave'], true)).toEqual([
      'settings',
      'keyboardShortcuts',
      'manageWalletSearch',
      'manageWalletSave',
      'manageWalletClose',
    ]);
  });

  it('does not expose wallet interaction commands when Manage Wallets registers only search controls', () => {
    const actions = availableMenuActions('ManageWallets', ['manageWalletSearch', 'manageWalletClose'], true);
    expect(actions).not.toEqual(
      expect.arrayContaining([
        'manageWalletOpen',
        'manageWalletSelectUp',
        'manageWalletSelectDown',
        'manageWalletSelectionMode',
        'manageWalletMoveUp',
        'manageWalletMoveDown',
      ]),
    );
  });
});
