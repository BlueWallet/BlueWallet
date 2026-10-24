import assert from 'assert';
import { catalystSuite } from './suite';
import {
  FUNDED_BALANCE,
  FUNDED_LABEL,
  createWallet,
  importFundedWallet,
  openWallet,
  receive,
  receiveRequest,
  walletDetails,
} from './flows';
import {
  COMMAND,
  SHIFT,
  assertMenuItemAbsent,
  back,
  clickContextMenuItem,
  clipboard,
  expectText,
  openContextMenu,
  openSettings,
  pressKey,
  relaunch,
  selectMenuItem,
  setClipboard,
  tapButtonWithLabel,
  tapId,
  tapRepeatedly,
  waitForId,
  waitForIdGone,
} from './driver';

const FUNDED_TIMEOUT = 20 * 60_000; // public Electrum servers answer slowly on hosted CI

catalystSuite('Mac Catalyst menus, sidebar and file access', test => {
  for (const shortcut of [false, true]) {
    const via = shortcut ? 'keyboard shortcut' : 'menu';
    test(`Settings opens via ${via}`, async driver => {
      if (shortcut) await pressKey(driver, ',', COMMAND);
      else await selectMenuItem(driver, 'BlueWallet', 'Settings');
      await waitForId(driver, 'SettingsRoot');
      await waitForId(driver, 'AboutButton');
    });
    test(`Add Wallet opens via ${via}`, async driver => {
      if (shortcut) await pressKey(driver, 'a', COMMAND + SHIFT);
      else await selectMenuItem(driver, 'File', 'Add Wallet');
      await waitForId(driver, 'WalletNameInput');
    });
    test(`Import Wallet opens via ${via}`, async driver => {
      if (shortcut) await pressKey(driver, 'i', COMMAND);
      else await selectMenuItem(driver, 'File', 'Import Wallet');
      await waitForId(driver, 'MnemonicInput');
    });
    test(`keyboard shortcut reference opens via ${via}`, async driver => {
      if (shortcut) await pressKey(driver, '/', COMMAND);
      else await selectMenuItem(driver, 'Help', 'Keyboard Shortcuts');
      await waitForId(driver, 'KeyboardShortcuts');
    });
  }
  test('wallet commands appear only in their relevant screen', async driver => {
    await assertMenuItemAbsent(driver, 'File', 'Send');
    await assertMenuItemAbsent(driver, 'Edit', 'Copy Address');
    await createWallet(driver);
    await openWallet(driver);
    await selectMenuItem(driver, 'File', 'Wallet Details');
    await waitForId(driver, 'WalletNameDisplay');
    await assertMenuItemAbsent(driver, 'File', 'Send');
    await selectMenuItem(driver, 'View', 'Back to Wallets');
    await waitForIdGone(driver, 'WalletDetailsScroll');
    await waitForId(driver, 'CreateAWallet');
  });
  test('Send, Receive, Wallet Details and Copy Address work via menus and shortcuts', async driver => {
    await createWallet(driver);
    for (const shortcut of [false, true]) {
      await openWallet(driver);
      if (shortcut) await pressKey(driver, 's', COMMAND + SHIFT);
      else await selectMenuItem(driver, 'File', 'Send');
      await waitForId(driver, 'AddressInput');
      await relaunch(driver);
      await openWallet(driver);
      if (shortcut) await pressKey(driver, 'r', COMMAND + SHIFT);
      else await selectMenuItem(driver, 'File', 'Receive');
      // The backup reminder is confirmed once per wallet.
      if (!shortcut) await tapButtonWithLabel(driver, 'Yes, I have.');
      await waitForId(driver, 'ReceiveCard');
      const address = (await receiveRequest(driver)).replace(/\s/g, '');
      assert.ok(address.length > 20);
      await setClipboard(driver, 'not the address');
      if (shortcut) await pressKey(driver, 'c', COMMAND + SHIFT);
      else await selectMenuItem(driver, 'Edit', 'Copy Address');
      await driver.waitUntil(async () => (await clipboard(driver)).toLowerCase() === address.toLowerCase());
      await assertMenuItemAbsent(driver, 'Edit', 'Copy Transaction ID');
      await pressKey(driver, 'w', COMMAND + SHIFT);
      await waitForIdGone(driver, 'ReceiveDetailsScrollView');
      await openWallet(driver);
      if (shortcut) await pressKey(driver, 'd', COMMAND);
      else await selectMenuItem(driver, 'File', 'Wallet Details');
      await waitForId(driver, 'WalletNameDisplay');
      await relaunch(driver);
    }
  });
  test(
    'Copy Transaction ID and Reload Transactions work via menu and shortcut',
    async driver => {
      const txid = '8b0ab2c7196312e021e0d3dc73f801693826428782970763df6134457bd2ec20';
      await importFundedWallet(driver);
      const row = driver.$(
        '-ios predicate string:elementType == 9 AND label BEGINSWITH "Incoming Transaction," AND label CONTAINS "0.00069909"',
      );
      await row.waitForExist({ timeout: 30_000 });
      await row.click();
      await assertMenuItemAbsent(driver, 'Edit', 'Copy Address');
      for (const shortcut of [false, true]) {
        // CopyTextToClipboard ignores repeated actions while its "Copied!"
        // feedback is visible. Exercise each command after that state resets.
        await expectText(driver, 'TransactionIdDisplayText', `${txid.slice(0, 10)}...${txid.slice(-10)}`);
        await setClipboard(driver, 'empty');
        if (shortcut) await pressKey(driver, 'c', COMMAND + SHIFT);
        else await selectMenuItem(driver, 'Edit', 'Copy Transaction ID');
        await driver.waitUntil(async () => (await clipboard(driver)) === txid, {
          timeout: 5_000,
          timeoutMsg: 'Copy Transaction ID did not put the full transaction ID on the clipboard',
        });
      }
      await back(driver);
      for (const shortcut of [false, true]) {
        await walletDetails(driver, FUNDED_LABEL);
        await tapRepeatedly(driver, 'PurgeBackdoorButton', 11);
        await tapButtonWithLabel(driver, 'OK');
        await back(driver);
        await expectText(driver, 'WalletBalance', '0');
        if (shortcut) await pressKey(driver, 'r', COMMAND);
        else await selectMenuItem(driver, 'View', 'Reload Transactions');
        await expectText(driver, 'WalletBalance', FUNDED_BALANCE, 120_000);
      }
    },
    FUNDED_TIMEOUT,
  );

  // The permanent sidebar: "Wallets" header with an Add Wallet button, the WalletsList of
  // cards (testID = wallet label) and the CreateAWallet panel.
  test('sidebar lists wallets, offers Add and Import Wallet, and stays visible across screens', async driver => {
    await createWallet(driver, 'Sidebar A');
    await createWallet(driver, 'Sidebar B');
    // Catalyst exposes the WalletsList container as a leaf beside its cards, not as their ancestor.
    await waitForId(driver, 'WalletsList');
    await waitForId(driver, 'Sidebar A');
    await waitForId(driver, 'Sidebar B');
    await openWallet(driver, 'Sidebar A');
    await expectText(driver, 'WalletLabel', 'Sidebar A');
    await tapId(driver, 'Sidebar B');
    await expectText(driver, 'WalletLabel', 'Sidebar B');
    await waitForId(driver, 'CreateAWallet');
    await relaunch(driver);
    await waitForId(driver, 'Sidebar A');
    await waitForId(driver, 'Sidebar B');

    await tapButtonWithLabel(driver, 'Add Wallet');
    await waitForId(driver, 'WalletNameInput');
    await relaunch(driver);
    // The button's long-press tooltip on iOS is a UIContextMenuInteraction, which Catalyst
    // opens on secondary click.
    const button = driver.$('-ios class chain:**/XCUIElementTypeWindow/**/XCUIElementTypeButton[`label == "Add Wallet"`]');
    await button.waitForExist({ timeout: 30_000 });
    await openContextMenu(driver, await button.getElement());
    await clickContextMenuItem(driver, 'Import wallet');
    await waitForId(driver, 'MnemonicInput');
    await relaunch(driver);

    await openWallet(driver, 'Sidebar A');
    await receive(driver, true);
    await waitForId(driver, 'WalletsList');
    await pressKey(driver, 'w', COMMAND + SHIFT);
    await waitForIdGone(driver, 'WalletDetails');
    await waitForId(driver, 'CreateAWallet');
    await walletDetails(driver, 'Sidebar A');
    await waitForId(driver, 'WalletsList');
    await openSettings(driver);
    await waitForId(driver, 'WalletsList');
  });
});
