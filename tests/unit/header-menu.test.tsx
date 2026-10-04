import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { attachHeaderMenuHandlers, buildHeaderMenu, groupHeaderMenu } from '../../blue_modules/headerMenuActions';

function loadMenu(isTablet: boolean, isDesktop: boolean) {
  jest.resetModules();
  jest.doMock('../../blue_modules/environment', () => ({
    isTablet,
    isDesktop,
    isIOS26OrHigher: true,
  }));
  return require('../../components/HeaderMenu') as typeof import('../../components/HeaderMenu');
}

it('preserves phone options, including native header items', () => {
  const { getHeaderMenuOptions } = loadMenu(false, false);
  const phoneOptions: NativeStackNavigationOptions = {
    headerRight: () => null,
    unstable_headerRightItems: () => [],
  };
  expect(getHeaderMenuOptions(phoneOptions, [])).toBe(phoneOptions);
});

it.each([
  [true, false],
  [false, true],
])('keeps native right header APIs on tablets while Mac remains menu-only (%s, %s)', (tablet, desktop) => {
  const { getHeaderMenuOptions } = loadMenu(tablet, desktop);
  const onPress = jest.fn();
  const actions = [{ id: 'details', text: 'Details', onPress }];
  const options = getHeaderMenuOptions({ headerRight: () => null, unstable_headerRightItems: () => [] }, actions);

  if (tablet) {
    expect(options.headerRight).toBeDefined();
    expect(options.unstable_headerRightItems).toBeDefined();
  } else {
    expect(options.headerRight).toBeUndefined();
    expect(options.unstable_headerRightItems).toBeUndefined();
  }
  expect(options.headerMenuActions).toEqual(actions);
});

it.each([
  [true, false],
  [false, true],
])('keeps modal Close in the header (%s, %s)', (tablet, desktop) => {
  loadMenu(tablet, desktop);
  const { default: navigationStyle } = require('../../components/navigationStyle') as typeof import('../../components/navigationStyle');
  const onCloseButtonPressed = jest.fn();
  const navigation = { getState: () => ({ index: 0 }), goBack: jest.fn() };
  const route = { params: { presentation: 'modal' } };
  const options = navigationStyle({ onCloseButtonPressed })({
    colors: {},
    barStyle: 'dark-content',
  } as any)({ navigation, route });
  expect(options.headerRight).toBeInstanceOf(Function);
  const close = options.unstable_headerRightItems!({} as any)[0] as any;
  expect(close.identifier).toBe('NavigationCloseButton');
  close.onPress();
  expect(onCloseButtonPressed).toHaveBeenCalledWith({ navigation, route });
  expect(options.headerMenuActions).toBeUndefined();
  expect(options.headerMenuCloseAction!.id).toBe('NavigationCloseButton');
  options.headerMenuCloseAction!.onPress!();
  expect(onCloseButtonPressed).toHaveBeenCalledTimes(2);
});

it('carries Help into the system menu on Mac Catalyst', () => {
  loadMenu(false, true);
  const { getMultisigStep2Options } =
    require('../../navigation/helpers/getMultisigStep2Options') as typeof import('../../navigation/helpers/getMultisigStep2Options');
  const onPress = jest.fn();
  const options = getMultisigStep2Options({
    onPress,
    theme: { colors: {} } as any,
  });
  expect(options.headerRight).toBeUndefined();
  expect(options.unstable_headerRightItems).toBeUndefined();
  const { handlers } = buildHeaderMenu((options as any).headerMenuActions, 'help');
  handlers['header:help:MultisigHelp']();
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('preserves groups, nested actions and checked states, and excludes hidden or disabled handlers', () => {
  const onPress = jest.fn();
  const actions = attachHeaderMenuHandlers(
    [
      [
        { id: 'hidden', text: 'Hidden', hidden: true },
        { id: 'done', text: 'Done', disabled: true },
      ],
      [
        {
          id: 'sort',
          text: 'Sort',
          subactions: [
            { id: 'height', text: 'Height', menuState: true },
            { id: 'value', text: 'Value' },
          ],
        },
      ],
    ],
    onPress,
  );
  const { items, handlers } = buildHeaderMenu(actions, 'coin');
  expect(items[0].inline).toBe(true);
  expect(items[0].children).toHaveLength(1);
  expect(items[0].children![0]).toMatchObject({
    title: 'Done',
    disabled: true,
  });
  expect(items[1].children![0].children![0]).toMatchObject({
    title: 'Height',
    state: true,
  });
  expect(handlers['header:coin:done']).toBeUndefined();
  expect(handlers['header:coin:hidden']).toBeUndefined();
  handlers['header:coin:height']();
  expect(onPress).toHaveBeenCalledWith('height');
});

it('hides the Close header button when a screen hides its right actions while saving', () => {
  loadMenu(true, false);
  const {
    default: navigationStyle,
    CloseButtonPosition,
    withRouteParamHeaderOptions,
  } = require('../../components/navigationStyle') as typeof import('../../components/navigationStyle');
  const options = navigationStyle(
    { closeButtonPosition: CloseButtonPosition.Right },
    withRouteParamHeaderOptions({ headerRight: true }),
  )({ colors: {}, barStyle: 'dark-content' } as any)({
    navigation: { getState: () => ({ index: 0 }), goBack: jest.fn() },
    route: { params: { headerRight: null } },
  });
  expect(options.headerRight).toBeUndefined();
  expect(options.unstable_headerRightItems).toBeUndefined();
  expect(options.headerMenuActions).toEqual([]);
});

it('groups recipient, transaction, editing and sorting commands under meaningful parents', () => {
  const { items } = buildHeaderMenu(
    [
      [
        { id: 'AddRecipient', text: 'Add Recipient' },
        { id: 'RemoveRecipient', text: 'Remove Recipient', destructive: true },
      ],
      [
        { id: 'allow_rbf', text: 'Allow Fee Bump', menuState: true },
        { id: 'copyToClipboard', text: 'Copy' },
      ],
      [{ id: 'sortHeight', text: 'Height' }],
    ],
    'send',
  );
  const groups = groupHeaderMenu(items, 'SendDetails');
  expect(groups.map(group => group.title)).toEqual(['Edit', 'Transaction', 'Recipients', 'Sort']);
  const recipients = groups[2].children!;
  expect(recipients.map(section => section.children![0].title)).toEqual(['Add Recipient', 'Remove Recipient']);
  expect(recipients[1].children![0].destructive).toBe(true);
  expect(groups[1].children![0].state).toBe(true);
});

it('keeps Add Wallet named parents visible instead of flattening Wallet Type choices', () => {
  const { items } = buildHeaderMenu(
    [
      {
        id: 'wallets',
        text: 'Wallet Type',
        displayInline: true,
        subactions: [
          { id: 'bitcoin', text: 'Bitcoin', menuState: true },
          { id: 'lightning', text: 'Lightning' },
        ],
      },
      { id: 'entropy', text: 'Provide Entropy', subactions: [{ id: '12_words', text: '12 words' }] },
    ],
    'add',
  );
  const groups = groupHeaderMenu(items, 'AddWallet');
  expect(groups[0].title).toBe('File');
  expect(groups[0].children![0]).toMatchObject({ title: 'Wallet Type', inline: false });
  expect(groups[0].children![0].children![0].state).toBe(true);
  expect(items[0].inline).toBe(true); // The phone action metadata remains unchanged.
  expect(groups[0].children![1].title).toBe('Provide Entropy');
});

it.each([
  [true, false],
  [false, true],
])('migrates Wallet Transactions details with its loading state (%s, %s)', (tablet, desktop) => {
  loadMenu(tablet, desktop);
  const { default: getWalletTransactionsOptions } =
    require('../../navigation/helpers/getWalletTransactionsOptions') as typeof import('../../navigation/helpers/getWalletTransactionsOptions');
  const options = getWalletTransactionsOptions({
    route: { params: { walletID: 'wallet', isLoading: true } } as any,
    screenWidth: 1024,
    headerTintColor: '#000',
    dark: false,
  }) as NativeStackNavigationOptions & import('../../blue_modules/headerMenuActions').HeaderMenuOptions;
  expect(options.headerRight).toBeUndefined();
  expect(options.unstable_headerRightItems).toBeUndefined();
  const { items, handlers } = buildHeaderMenu(options.headerMenuActions!, 'wallet');
  expect(groupHeaderMenu(items, 'WalletTransactions')[0]).toMatchObject({
    title: 'File',
    children: [{ id: 'header:wallet:WalletDetails', disabled: true }],
  });
  expect(handlers['header:wallet:WalletDetails']).toBeUndefined();
});

it('keeps category placement independent of screen action order', () => {
  const actions = [
    { id: 'AddRecipient', text: 'Add Recipient' },
    { id: 'ExportTransaction', text: 'Export Transaction...' },
    { id: 'coin_control', text: 'Coin Control' },
    { id: 'clearClipboard', text: 'Clear Clipboard' },
  ];
  const forward = groupHeaderMenu(buildHeaderMenu(actions, 'send').items, 'SendDetails');
  const reverse = groupHeaderMenu(buildHeaderMenu([...actions].reverse(), 'send').items, 'SendDetails');
  expect(forward.map(group => group.id)).toEqual(reverse.map(group => group.id));
  expect(forward.map(group => group.title)).toEqual(['File', 'Edit', 'Transaction', 'Recipients']);
});

it('uses native shortcut metadata and correct ellipses without changing phone action labels', () => {
  const onPress = jest.fn();
  const actions = [
    { id: 'AddRecipient', text: 'Add Recipient', onPress },
    { id: 'ExportTransaction', text: 'Export...', disabled: true, onPress },
    { id: 'import_transaction_qr', text: 'Import QR', hidden: true, onPress },
    { id: 'ModalDoneButton', text: 'Done...', onPress },
    { id: 'NavigationCloseButton', text: 'Close', onPress },
    { id: 'TransactionDetailsButton', text: 'Details...', onPress },
  ];
  const { items, handlers } = buildHeaderMenu(actions, 'screen');
  expect(items[0].shortcut).toEqual({ input: 'n', modifiers: ['command', 'shift'] });
  expect(items[1]).toMatchObject({ title: 'Export…', disabled: true, shortcut: { input: 'e', modifiers: ['command', 'shift'] } });
  expect(items[2]).toMatchObject({ title: 'Done', shortcut: { input: '\r', modifiers: ['command'] } });
  expect(items[3].shortcut).toEqual({ input: 'w', modifiers: ['command'] });
  expect(items[4].title).toBe('Details');
  expect(handlers['header:screen:ExportTransaction']).toBeUndefined();
  expect(handlers['header:screen:import_transaction_qr']).toBeUndefined();
  expect(actions[1].text).toBe('Export...');
  const keys = items.map(item => JSON.stringify(item.shortcut));
  expect(new Set(keys).size).toBe(keys.length);
});

it('uses size-class-aware palette layouts for native Apple menus', () => {
  const { Dimensions } = require('react-native');
  const dimensionsSpy = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1024, height: 768, scale: 2, fontScale: 1 });

  try {
    const { getAppleNativeMenuLayout, mapActionsToNativeHeaderMenuItems } =
      require('../../components/nativeHeaderMenuItems') as typeof import('../../components/nativeHeaderMenuItems');

    expect(getAppleNativeMenuLayout()).toBe('palette');
    expect(
      mapActionsToNativeHeaderMenuItems(
        [{ id: 'sort', text: 'Sort', subactions: [{ id: 'height', text: 'Height' }] }],
        jest.fn(),
      )[0].layout,
    ).toBe('palette');
  } finally {
    dimensionsSpy.mockRestore();
  }
});

it('separates sorting criteria from direction without nesting another visible parent', () => {
  const { items } = buildHeaderMenu(
    [
      { id: 'sortHeight', text: 'Height', menuState: true },
      { id: 'sortValue', text: 'Value', menuState: false },
      { id: 'sortASC', text: 'Ascending' },
    ],
    'coin',
  );
  const sections = groupHeaderMenu(items, 'CoinControl')[0].children!;
  expect(sections).toHaveLength(2);
  expect(sections.every(section => section.inline && section.title === '')).toBe(true);
  expect(sections[0].children![0].state).toBe(true);
  expect(sections[1].children![0].title).toBe('Ascending');
});

it('retains custom left Close registration used by Import and Manage Wallets', () => {
  loadMenu(true, false);
  const { default: navigationStyle } = require('../../components/navigationStyle') as typeof import('../../components/navigationStyle');
  const onPress = jest.fn();
  const close = { id: 'NavigationCloseButton', text: 'Close', onPress };
  const headerLeft = () => null;
  const options = navigationStyle({}, current => ({ ...current, headerLeft, headerMenuCloseAction: close }))({
    colors: {},
    barStyle: 'dark-content',
  } as any)({
    navigation: { getState: () => ({ index: 0 }), goBack: jest.fn() },
    route: { params: {} },
  });
  expect(options.headerLeft).toBe(headerLeft);
  expect(options.headerMenuCloseAction).toBe(close);
  options.headerMenuCloseAction!.onPress!();
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('registers Android left Close shortcuts when the native back image supplies the control', () => {
  loadMenu(true, false);
  const { Platform } = require('react-native');
  const original = Platform.OS;
  Platform.OS = 'android';
  try {
    const { default: navigationStyle, CloseButtonPosition } =
      require('../../components/navigationStyle') as typeof import('../../components/navigationStyle');
    const goBack = jest.fn();
    const options = navigationStyle({ closeButtonPosition: CloseButtonPosition.Left })({
      colors: {},
      barStyle: 'dark-content',
      closeImage: 123,
    } as any)({
      navigation: { getState: () => ({ index: 0 }), goBack },
      route: { params: {} },
    });
    expect(options.headerBackImageSource).toBe(123);
    expect(options.headerMenuCloseAction!.id).toBe('NavigationCloseButton');
    options.headerMenuCloseAction!.onPress!();
    expect(goBack).toHaveBeenCalledTimes(1);
  } finally {
    Platform.OS = original;
  }
});

it('puts wallet screen commands in File without a Wallet menu', () => {
  const { items } = buildHeaderMenu(
    [
      { id: 'scan_qr', text: 'Scan', onPress: jest.fn() },
      { id: 'WalletDetails', text: 'Wallet Details', onPress: jest.fn() },
    ],
    'wallets',
  );
  const groups = groupHeaderMenu(items, 'WalletsList');
  expect(groups.map(group => group.id)).toEqual(['category:file']);
  expect(groups[0].children!.map(item => item.id)).toEqual(['header:wallets:scan_qr', 'header:wallets:WalletDetails']);
});

it('provides distinct ScanQRCode import and photo shortcuts and omits unavailable import', () => {
  const { items, handlers } = buildHeaderMenu(
    [
      { id: 'import_file', text: 'Import File', onPress: jest.fn() },
      { id: 'choose_photo', text: 'Choose Photo', onPress: jest.fn() },
    ],
    'scan',
  );
  expect(items[0].shortcut).toEqual({ input: 'i', modifiers: ['command', 'shift'] });
  expect(items[1].shortcut).toEqual({ input: 'p', modifiers: ['command', 'shift'] });
  expect(Object.keys(handlers)).toEqual(['header:scan:import_file', 'header:scan:choose_photo']);
  const hidden = buildHeaderMenu([{ id: 'import_file', text: 'Import File', hidden: true, onPress: jest.fn() }], 'scan');
  expect(hidden.items).toEqual([]);
  expect(hidden.handlers).toEqual({});
});
