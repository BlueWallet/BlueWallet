import { buildHeaderMenu, groupHeaderMenu } from '../../blue_modules/headerMenuActions';

it('groups screen commands by intent and exposes readable shortcut discovery titles', () => {
  const menu = buildHeaderMenu(
    [
      { id: 'file_save', text: 'Save', onPress: jest.fn() },
      { id: 'edit_wallet_name', text: 'Rename Wallet', onPress: jest.fn() },
      { id: 'view_addresses', text: 'Addresses', onPress: jest.fn() },
      { id: 'settings_explorer', text: 'Block Explorer', onPress: jest.fn() },
      { id: 'help_license', text: 'License', onPress: jest.fn() },
    ],
    'details',
  );
  expect(groupHeaderMenu(menu.items, 'WalletDetails').map(item => item.id)).toEqual([
    'category:file',
    'category:edit',
    'category:view',
    'category:settings',
    'category:help',
  ]);
  expect(menu.items[1]).toMatchObject({ discoverabilityTitle: 'Rename Wallet', shortcut: { input: 'r' } });
});

it('propagates disabled state and omits hidden commands and their handlers', () => {
  const menu = buildHeaderMenu(
    [
      { id: 'settings', text: 'Settings', disabled: true, subactions: [{ id: 'file_save', text: 'Save', onPress: jest.fn() }] },
      { id: 'share', text: 'Share', hidden: true, onPress: jest.fn() },
    ],
    'settings',
  );
  expect(menu.items).toHaveLength(1);
  expect(menu.items[0].children![0].disabled).toBe(true);
  expect(menu.handlers).toEqual({});
});

it('groups recipient paging commands with native shortcuts and boundary disabled states', () => {
  const menu = buildHeaderMenu(
    [
      { id: 'PreviousRecipient', text: 'Previous Recipient', disabled: true, onPress: jest.fn() },
      { id: 'NextRecipient', text: 'Next Recipient', onPress: jest.fn() },
    ],
    'send',
  );
  const group = groupHeaderMenu(menu.items, 'SendDetails')[0];
  expect(group.id).toBe('category:recipients');
  expect(group.children).toMatchObject([
    { disabled: true, shortcut: { input: '[', modifiers: ['command', 'alternate'] } },
    { disabled: false, shortcut: { input: ']', modifiers: ['command', 'alternate'] } },
  ]);
  expect(menu.handlers['header:send:PreviousRecipient']).toBeUndefined();
  expect(menu.handlers['header:send:NextRecipient']).toBeDefined();
});
