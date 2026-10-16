import assert from 'assert';
import { catalystSuite } from './suite';
import { createWallet, openWallet, receive, receiveRequest } from './flows';
import {
  assertMenuItemAbsent,
  clipboard,
  COMMAND,
  pressKey,
  relaunch,
  selectMenuItem,
  setClipboard,
  SHIFT,
  tapButtonWithLabel,
  waitForId,
  waitForIdGone,
} from './driver';

catalystSuite('macOS menus and shortcuts', test => {
  for (const shortcut of [false, true]) {
    const via = shortcut ? 'keyboard shortcut' : 'menu';
    test(`Settings opens via ${via}`, async driver => {
      if (shortcut) await pressKey(driver, ',', COMMAND);
      else await selectMenuItem(driver, 'BlueWallet', 'Settings');
      await waitForId(driver, 'SettingsRoot');
      await waitForId(driver, 'AboutButton');
    });
    test(`Add Wallet opens via ${via}`, async driver => {
      if (shortcut) await pressKey(driver, 'a', COMMAND | SHIFT);
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
  for (const shortcut of [false, true]) {
    test(`Send, Receive and Wallet Details navigate via ${shortcut ? 'shortcuts' : 'menus'}`, async driver => {
      await createWallet(driver);
      await openWallet(driver);
      if (shortcut) await pressKey(driver, 's', COMMAND | SHIFT);
      else await selectMenuItem(driver, 'File', 'Send');
      await waitForId(driver, 'AddressInput');
      await relaunch(driver);
      await openWallet(driver);
      if (shortcut) await pressKey(driver, 'r', COMMAND | SHIFT);
      else await selectMenuItem(driver, 'File', 'Receive');
      await tapButtonWithLabel(driver, 'Yes, I have.');
      await waitForId(driver, 'ReceiveCard');
      await relaunch(driver);
      await openWallet(driver);
      if (shortcut) await pressKey(driver, 'd', COMMAND);
      else await selectMenuItem(driver, 'File', 'Wallet Details');
      await waitForId(driver, 'WalletNameDisplay');
    });
  }
  test('Copy Address copies the current address with menu and shortcut', async driver => {
    await createWallet(driver);
    await openWallet(driver);
    await receive(driver, true);
    const address = (await receiveRequest(driver)).replace(/\s/g, '');
    for (const shortcut of [false, true]) {
      await setClipboard(driver, 'not the address');
      if (shortcut) await pressKey(driver, 'c', COMMAND | SHIFT);
      else await selectMenuItem(driver, 'Edit', 'Copy Address');
      await driver.waitUntil(async () => (await clipboard(driver)).toLowerCase() === address.toLowerCase());
      assert.ok(address.length > 20);
    }
    await assertMenuItemAbsent(driver, 'Edit', 'Copy Transaction ID');
    await pressKey(driver, 'w', COMMAND | SHIFT);
    await waitForIdGone(driver, 'ReceiveDetailsScrollView');
  });
});
