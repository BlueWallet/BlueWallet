/* global it, describe, expect, element, by, waitFor, device */

describe('BlueWallet UI Tests', () => {
  it('can launch', async () => {
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(4000);
  });

  it('can encrypt storage', async () => {
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(4000);
    await expect(element(by.id('SettingsButton'))).toBeVisible();
    await element(by.id('SettingsButton')).tap(); // detox hanges here

    await expect(element(by.id('EncryptStorageButton'))).toBeVisible();
    // now go to Security page where we will enable encryption
    await element(by.id('EncryptStorageButton')).tap();
    await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible();

    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // first, trying to mistype second password:
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.type('android.widget.EditText')).typeText('08902\n');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('666\n');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Passwords do not match'))).toBeVisible();
    await element(by.text('OK')).tap();

    // TODO: finish writing this test
  });

  it('can create wallet, reload app and it persists', async () => {
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(4000);
    await element(by.id('CreateAWallet')).tap();
    await element(by.id('WalletNameInput')).typeText('cr34t3d\n');
    await waitFor(element(by.id('ActivateBitcoinButton')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('ActivateBitcoinButton')).tap();
    await element(by.id('ActivateBitcoinButton')).tap();
    // why tf we need 2 taps for it to work..? mystery
    await element(by.id('Create')).tap();

    await waitFor(element(by.id('PleaseBackupScrollView')))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.id('PleaseBackupScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit

    await waitFor(element(by.id('PleasebackupOk')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('PleasebackupOk')).tap();
    await expect(element(by.id('WalletsList'))).toBeVisible();
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    await device.terminateApp();
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('cr34t3d'))).toBeVisible();
  });
});
