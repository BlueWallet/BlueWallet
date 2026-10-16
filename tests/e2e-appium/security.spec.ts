import { catalystSuite, step } from './suite';
import { createWallet } from './flows';
import {
  assertMenuItemAbsent,
  openSettings,
  pressKey,
  relaunch,
  replaceId,
  tapButtonWithLabel,
  tapId,
  waitForId,
  waitForIdGone,
} from './driver';

const password = 'catalyst-test-password';
catalystSuite('Storage encryption', test => {
  test(
    'rejects mismatched passwords, locks on restart, rejects wrong password, and decrypts',
    async driver => {
      await step('Create wallet for password lifecycle', () => createWallet(driver));
      await openSettings(driver);
      await tapId(driver, 'SecurityButton');
      await tapId(driver, 'EncyptedAndPasswordProtectedSwitch');
      await tapId(driver, 'IUnderstandButton');
      await replaceId(driver, 'PasswordInput', password);
      await replaceId(driver, 'ConfirmPasswordInput', 'different');
      await tapId(driver, 'OKButton');
      await waitForId(driver, 'ConfirmPasswordInput');
      await replaceId(driver, 'ConfirmPasswordInput', password);
      await tapId(driver, 'OKButton');
      await waitForIdGone(driver, 'ConfirmPasswordInput');
      await step('Verify encrypted storage is ready', () => waitForId(driver, 'PlausibleDeniabilityButton'));
      await relaunch(driver, { locked: true });
      await assertMenuItemAbsent(driver, 'File', 'Add Wallet');
      await assertMenuItemAbsent(driver, 'BlueWallet', 'Settings');
      await replaceId(driver, 'PasswordInput', 'wrong');
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      const passwordInput = await waitForId(driver, 'PasswordInput');
      // The rejection animation clears the field; merely finding it can race the
      // asynchronous decrypt and overwrite the next password while it is shaking.
      await step('Wait for wrong-password rejection', () =>
        driver.waitUntil(async () => !(await passwordInput.getAttribute('value')), { timeout: 30_000 }),
      );
      await waitForIdGone(driver, 'Catalyst test wallet');
      await replaceId(driver, 'PasswordInput', password);
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      await step('Verify real wallet is accessible', () => waitForId(driver, 'Catalyst test wallet'));
      await openSettings(driver);
      await tapId(driver, 'SecurityButton');
      await tapId(driver, 'EncyptedAndPasswordProtectedSwitch');
      await tapButtonWithLabel(driver, 'OK');
      await replaceId(driver, 'PasswordInput', password);
      await tapId(driver, 'OKButton');
      await waitForIdGone(driver, 'PasswordInput');
      await relaunch(driver);
      await step('Verify real wallet is accessible', () => waitForId(driver, 'Catalyst test wallet'));
    },
    20 * 60_000,
  ); // Intel run 38806630548 exhausted 600s while commands still progressed.
  test(
    'plausible deniability opens an independent wallet store',
    async driver => {
      await step('Create real wallet for decoy isolation', () => createWallet(driver, 'Real wallet'));
      await openSettings(driver);
      await tapId(driver, 'SecurityButton');
      await tapId(driver, 'EncyptedAndPasswordProtectedSwitch');
      await tapId(driver, 'IUnderstandButton');
      await replaceId(driver, 'PasswordInput', password);
      await replaceId(driver, 'ConfirmPasswordInput', password);
      await tapId(driver, 'OKButton');
      await tapId(driver, 'PlausibleDeniabilityButton');
      await tapId(driver, 'CreateFakeStorageButton');
      await replaceId(driver, 'PasswordInput', 'fake-password');
      await replaceId(driver, 'ConfirmPasswordInput', 'fake-password');
      await tapId(driver, 'OKButton');
      await waitForId(driver, 'CreateAWallet');
      await waitForIdGone(driver, 'Real wallet');
      await step('Create independent decoy wallet', () => createWallet(driver, 'Decoy wallet'));
      await relaunch(driver, { locked: true });
      await replaceId(driver, 'PasswordInput', password);
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      await step('Verify real password opens real storage', () => waitForId(driver, 'Real wallet'));
      await waitForIdGone(driver, 'Decoy wallet');
      await relaunch(driver, { locked: true });
      await replaceId(driver, 'PasswordInput', 'fake-password');
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      await step('Verify decoy password opens decoy storage', () => waitForId(driver, 'Decoy wallet'));
      await waitForIdGone(driver, 'Real wallet');
    },
    20 * 60_000,
  ); // Intel run 38806630548 exhausted 600s while commands still progressed.
});
