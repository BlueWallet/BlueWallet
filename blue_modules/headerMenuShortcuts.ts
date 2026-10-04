import loc from '../loc';

export type HeaderMenuShortcut = { input: string; modifiers: ('command' | 'shift' | 'alternate')[] };

// Avoid standard text-editing shortcuts and shortcuts that broadcast or sign funds.
export const headerMenuShortcuts: Record<string, HeaderMenuShortcut> = {
  AddRecipient: { input: 'n', modifiers: ['command', 'shift'] },
  insert_contact: { input: 'n', modifiers: ['command', 'alternate'] },
  import_transaction: { input: 'i', modifiers: ['command', 'shift'] },
  import_transaction_multisig: { input: 'i', modifiers: ['command', 'shift'] },
  import_transaction_qr: { input: 'i', modifiers: ['command', 'alternate'] },
  import_file: { input: 'i', modifiers: ['command', 'shift'] },
  choose_photo: { input: 'p', modifiers: ['command', 'shift'] },
  ExportTransaction: { input: 'e', modifiers: ['command', 'shift'] },
  TransactionDetailsButton: { input: 'd', modifiers: ['command', 'alternate'] },
  changeBalanceUnit: { input: 'u', modifiers: ['command', 'shift'] },
  coin_control: { input: 'c', modifiers: ['command', 'alternate'] },
  ModalDoneButton: { input: '\r', modifiers: ['command'] },
  NavigationCloseButton: { input: 'w', modifiers: ['command'] },
};

export const headerMenuShortcutHelp = () => [
  { title: loc.send.details_add_rec_add, key: 'Shift+N', where: loc._.menu_recipients },
  { title: loc.send.details_insert_contact, key: 'Option+N', where: loc._.menu_recipients },
  { title: loc.send.details_adv_import, key: 'Shift+I', where: loc._.menu_transaction },
  { title: loc.send.details_adv_import_qr, key: 'Option+I', where: loc._.menu_transaction },
  { title: loc.wallets.import_file, key: 'Shift+I', where: loc.send.details_scan },
  { title: loc.wallets.list_long_choose, key: 'Shift+P', where: loc.send.details_scan },
  { title: loc.multisig.share, key: 'Shift+E', where: loc._.menu_transaction },
  { title: loc.send.create_details, key: 'Option+D', where: loc._.menu_transaction },
  { title: loc.wallets.change_balance_unit, key: 'Shift+U', where: loc.transactions.list_title },
  { title: loc.cc.header, key: 'Option+C', where: loc._.menu_transaction },
  { title: loc.send.input_done, key: 'Return', where: loc.multisig.vault_advanced_customize },
  { title: loc._.close, key: 'W / Esc', where: loc._.menu_close_scope },
];
