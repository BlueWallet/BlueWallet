/* eslint-env jest */
/* global device, by */
import { element, expect, waitFor } from 'detox';

// Run on a fresh simulator with HEADER_MENU_DEVICE=tablet or phone:
// HEADER_MENU_DEVICE=tablet npx detox test -c ios.debug -n 'iPad Pro 11-inch (M5)' tests/e2e/header-menu.spec.js
const deviceKind = process.env.HEADER_MENU_DEVICE;
const headerSuite = deviceKind === 'tablet' || deviceKind === 'phone' ? describe : describe.skip;

headerSuite('device-specific right headers', () => {
  it('preserves phone controls and removes tablet controls on the wallet overview', async () => {
    await device.launchApp({ newInstance: true, launchArgs: { detoxEnableSynchronization: 0 } });
    await device.disableSynchronization();
    await waitFor(element(by.id('Wallets')))
      .toBeVisible()
      .withTimeout(120_000);
    if (deviceKind === 'tablet') {
      await expect(element(by.id('AddWalletButton'))).not.toExist();
      await expect(element(by.id('SettingsButton'))).not.toExist();
      await expect(element(by.id('HeaderMenuButton'))).not.toExist();
    } else {
      await expect(element(by.id('AddWalletButton'))).toBeVisible();
      await expect(element(by.id('SettingsButton'))).toBeVisible();
    }
    await device.takeScreenshot(`header-menu-${deviceKind}`);
    if (deviceKind === 'tablet' && device.getPlatform() === 'android') {
      await expect(element(by.id('AndroidAppMenuButton'))).toBeVisible();
      await element(by.id('AndroidAppMenuButton')).tap();
      await waitFor(element(by.text('Wallet')))
        .toBeVisible()
        .withTimeout(10_000);
      await element(by.text('Wallet')).tap();
      await element(by.text('Add Wallet…')).tap();
      await waitFor(element(by.id('WalletNameInput')))
        .toBeVisible()
        .withTimeout(30_000);
      await device.takeScreenshot('header-menu-android-tablet-add-wallet');
      await device.pressBack();
      await waitFor(element(by.id('Wallets')))
        .toBeVisible()
        .withTimeout(30_000);
    }
  });
});
