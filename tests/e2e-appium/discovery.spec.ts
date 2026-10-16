import { catalystSuite, step } from './suite';
import { openWallet } from './flows';
import { DISCOVERY_MNEMONIC } from './electrum';
import {
  activate,
  pressKey,
  replaceId,
  scrollDownToText,
  selectMenuItem,
  tapOptionalConfirmation,
  relaunch,
  tapId,
  waitForId,
  waitForText,
} from './driver';

catalystSuite('Account discovery', test => {
  test('discovers accounts and imports a custom BIP44 path', async driver => {
    await selectMenuItem(driver, 'File', 'Import Wallet');
    await replaceId(driver, 'MnemonicInput', DISCOVERY_MNEMONIC);
    // TODO(Catalyst alerts): restore the passphrase prompt/cancel subflow.
    // Continue discovery without requesting that blocking native prompt.
    await tapId(driver, 'DoImport');
    for (const path of ["m/84'/0'/0'", "m/44'/0'/0'"]) {
      await driver
        .$(`-ios predicate string:elementType == 9 AND label CONTAINS ${JSON.stringify(path)}`)
        .waitForExist({ timeout: 300_000 });
    }
    await tapId(driver, 'CustomDerivationPathButton');
    await replaceId(driver, 'DerivationPathInput', "m/44'/0'/0'");
    await pressKey(driver, 'XCUIKeyboardKeyReturn');
    const legacyAccount = driver.$('-ios predicate string:elementType == 9 AND label BEGINSWITH "HD Legacy" AND label ENDSWITH "Found"');
    await legacyAccount.waitForExist({ timeout: 300_000 });
    await activate(driver);
    await legacyAccount.click();
    await step('Import selected custom derivation account and await confirmation', async () => {
      const button = await waitForId(driver, 'ImportButton');
      await button.waitForEnabled({ timeout: 30_000 });
      await driver.waitUntil(async () => String(await button.getAttribute('hittable')) === 'true', {
        timeout: 30_000,
        timeoutMsg: 'Selected derivation account Import button is not hittable',
      });
      await activate(driver);
      await button.click();
      await tapOptionalConfirmation(driver, 'OK', 'Imported HD Legacy (BIP44 P2PKH)', 90_000);
    });
    await relaunch(driver);
    await openWallet(driver, 'Imported HD Legacy (BIP44 P2PKH)');
    await tapId(driver, 'WalletDetails');
    await scrollDownToText(driver, 'WalletDetailsScroll', 'Advanced,', 'prefix');
    await activate(driver);
    await driver.$('-ios predicate string:elementType == 9 AND label BEGINSWITH "Advanced,"').click();
    // For a signing wallet this is a non-interactive row: the right-hand text
    // remains its own accessibility element instead of a combined button label.
    await scrollDownToText(driver, 'WalletDetailsScroll', "m/44'/0'/0'");
    await waitForText(driver, "m/44'/0'/0'");
  });
});
