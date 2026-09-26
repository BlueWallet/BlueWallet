import { availableMenuActions, nativeSendDetailsAction } from '../../blue_modules/menuActions';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

it('maps Send Details tooltip identifiers to native menu actions without changing the shared identifiers', () => {
  expect(CommonToolTipActions.AddRecipient.id).toBe('AddRecipient');
  expect(CommonToolTipActions.RemoveRecipient.id).toBe('RemoveRecipient');
  expect(CommonToolTipActions.RemoveAllRecipients.id).toBe('RemoveAllRecipients');
  expect(nativeSendDetailsAction(CommonToolTipActions.AddRecipient.id)).toBe('add_recipient');
  expect(nativeSendDetailsAction(CommonToolTipActions.RemoveRecipient.id)).toBe('remove_recipient');
  expect(nativeSendDetailsAction(CommonToolTipActions.RemoveAllRecipients.id)).toBe('remove_all_recipients');
  expect(nativeSendDetailsAction(CommonToolTipActions.SendMax.id)).toBe('send_max');
  expect(nativeSendDetailsAction('unknown')).toBeUndefined();
});

describe('native menu availability', () => {
  const globalActions = ['settings', 'isItMyAddress', 'broadcastTransaction', 'generateWord', 'keyboardShortcuts', 'openFile'];
  it.each([undefined, 'UnlockWithScreen', 'WalletTransactions', 'Settings', 'SendDetails'])(
    'hides everything while locked on %s',
    screen => {
      expect(availableMenuActions(screen, ['send', 'reloadTransactions', 'copyAddress'], false)).toEqual([]);
    },
  );
  it.each(['Settings', 'SendDetails', 'ImportWallet', 'WalletExport', 'KeyboardShortcuts'])(
    'keeps Settings and shortcuts available on %s',
    screen => {
      expect(availableMenuActions(screen, [], true)).toEqual(globalActions);
    },
  );
  it('only offers actions registered by the current screen', () => {
    expect(availableMenuActions('WalletTransactions', ['receive'], true)).toEqual([
      ...globalActions,
      'addWallet',
      'importWallet',
      'backToWallets',
      'receive',
    ]);
    expect(availableMenuActions('ReceiveDetails', ['send', 'copyAddress'], true)).toEqual([
      ...globalActions,
      'backToWallets',
      'copyAddress',
    ]);
    expect(availableMenuActions('TransactionStatus', ['copyTransactionId'], true)).toContain('copyTransactionId');
    expect(availableMenuActions('WalletsList', [], true)).not.toContain('backToWallets');
  });

  it('only exposes registered Send Details header actions', () => {
    expect(availableMenuActions('SendDetails', ['add_recipient', 'coin_control', 'sign_psbt'], true)).toEqual([
      ...globalActions,
      'add_recipient',
      'sign_psbt',
      'coin_control',
    ]);
  });
});
