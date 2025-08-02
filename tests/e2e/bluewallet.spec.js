import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import {
  scanText,
  expectToBeVisible,
  extractTextFromElementById,
  hashIt,
  helperCreateWallet,
  helperDeleteWallet,
  sleep,
  waitForText,
  tapAndTapAgainIfElementIsNotVisible,
  tapIfPresent,
  tapIfTextPresent,
  waitForId,
} from './helperz';
import { element } from 'detox';

// if loglevel is set to `error`, this kind of logging will still get through
console.warn = console.log = (...args) => {
  let output = '';
  args.map(arg => (output += String(arg)));

  process.stdout.write('\n\t\t' + output + '\n');
};

/**
 * this testsuite is for test cases that require no wallets to be present
 */
describe('BlueWallet UI Tests - no wallets', () => {
  it('selftest passes', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t1');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t1'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(300 * 1000);

    // go to settings, press SelfTest and wait for OK
    await element(by.id('SettingsButton')).tap();
    await element(by.id('AboutButton')).tap();
    await element(by.id('AboutScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await tapAndTapAgainIfElementIsNotVisible('RunSelfTestButton', 'SelfTestLoading');
    await waitFor(element(by.id('SelfTestOk')))
      .toBeVisible()
      .withTimeout(300 * 1000);
    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('all settings screens work', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t2');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t2'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');

    // go to settings, press SelfTest and wait for OK
    await element(by.id('SettingsButton')).tap();

    // general
    await element(by.id('GeneralSettings')).tap();

    // privacy
    // trigger switches
    await element(by.id('SettingsPrivacy')).tap();
    await element(by.id('ClipboardSwitch')).tap();
    await element(by.id('ClipboardSwitch')).tap();
    await element(by.id('QuickActionsSwitch')).tap();
    await element(by.id('QuickActionsSwitch')).tap();
    await device.pressBack();
    await device.pressBack();

    //
    // currency
    // change currency to ARS ($) and switch it back to USD ($)
    await element(by.id('Currency')).tap();
    await element(by.text('ARS ($)')).tap();
    await expect(element(by.text('Rate is obtained from Yadio'))).toBeVisible();
    await element(by.text('USD ($)')).tap();
    await device.pressBack();

    // language
    // change language to Chinese (ZH), test it and switch back to English
    await element(by.id('Language')).tap();
    await element(by.text('Chinese (ZH)')).tap();
    await device.pressBack();
    await expect(element(by.text('语言'))).toBeVisible();
    await element(by.id('Language')).tap();
    await element(by.text('English')).tap();
    await device.pressBack();

    // security
    await element(by.id('SecurityButton')).tap();
    await device.pressBack();

    // network
    await element(by.id('NetworkSettings')).tap();

    // network -> electrum server
    // change electrum server to electrum.blockstream.info and revert it back
    await element(by.id('ElectrumSettings')).tap();
    await element(by.id('ElectrumSettingsScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await element(by.id('HostInput')).replaceText('electrum.blockstream.info\n');
    await element(by.id('PortInput')).replaceText('50001\n');
    await element(by.id('ElectrumSettingsScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await element(by.id('Save')).tap();
    await waitForText('OK');
    await element(by.text('OK')).tap();
    await element(by.id('HeaderMenuButton')).tap();
    await element(by.text('Reset to default')).tap();
    await element(by.text('RESET TO DEFAULT')).tap();
    await waitForText('OK');
    await element(by.text('OK')).tap();
    await element(by.id('ElectrumSettingsScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await expect(element(by.id('HostInput'))).toHaveText('');
    await expect(element(by.id('PortInput'))).toHaveText('');
    await expect(element(by.id('SSLPortInput'))).toHaveToggleValue(false);
    await device.pressBack();

    // network -> lightning
    // change URI and revert it back
    /* muted since https://lndhub.herokuapp.com is down
    await element(by.id('LightningSettings')).tap();
    await element(by.id('URIInput')).replaceText('invalid\n');
    await element(by.id('Save')).tap();
    await waitForText('OK');
    await expect(element(by.text('Invalid LNDHub URI'))).toBeVisible();
    await element(by.text('OK')).tap();
    await element(by.id('URIInput')).replaceText('https://lndhub.herokuapp.com\n');
    await element(by.id('Save')).tap();
    await waitForText('OK');
    await expect(element(by.text('Your changes have been saved successfully.'))).toBeVisible();
    await element(by.text('OK')).tap();
    await element(by.id('URIInput')).replaceText('\n');
    await element(by.id('Save')).tap();
    await waitForText('OK');
    await expect(element(by.text('Your changes have been saved successfully.'))).toBeVisible();
    await element(by.text('OK')).tap();
    await device.pressBack();
    */

    // notifications
    // turn on notifications if available
    // console.warn('waitForId');
    // await sleep(300000);
    if (await expectToBeVisible('NotificationSettings')) {
      await element(by.id('NotificationSettings')).tap();
      await element(by.id('NotificationsSwitch')).tap();
      await sleep(3_000);
      await element(by.id('NotificationsSwitch')).tap();
      await device.pressBack();
      await device.pressBack();
    } else {
      await device.pressBack();
    }

    // tools
    await element(by.id('Tools')).tap();

    // tools -> broadcast
    // try to broadcast wrong tx
    await element(by.id('Broadcast')).tap();
    await element(by.id('TxHex')).replaceText('invalid\n');
    await element(by.id('BroadcastButton')).tap();
    await waitForText('OK');
    // await expect(element(by.text('the transaction was rejected by network rules....'))).toBeVisible();
    await element(by.text('OK')).tap();
    await device.pressBack();

    // IsItMyAddress
    await element(by.id('IsItMyAddress')).tap();
    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('CheckAddress')).tap();
    await expect(element(by.text('None of the available wallets own the provided address.'))).toBeVisible();
    await element(by.text('OK')).tap();
    await device.pressBack();
    await device.pressBack();

    // about
    await element(by.id('AboutButton')).tap();
    await device.pressBack();
    await device.pressBack();
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can create wallet, reload app and it persists. then go to receive screen, set custom amount and label. Dismiss modal and go to WalletsList.', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t3');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t3'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');

    await helperCreateWallet();

    await device.launchApp({ newInstance: true });
    await waitForId('WalletsList');
    await expect(element(by.id('cr34t3d'))).toBeVisible();
    await tapAndTapAgainIfElementIsNotVisible('cr34t3d', 'ReceiveButton');
    await element(by.id('ReceiveButton')).tap();
    await element(by.text('Yes, I have.')).tap();
    try {
      // in case emulator has no google services and doesnt support pushes
      // we just dont show this popup
      await element(by.text(`No, and do not ask me again.`)).tap();
      await element(by.text(`No, and do not ask me again.`)).tap(); // sometimes the first click doesnt work (detox issue, not app's)
    } catch (_) {}
    await waitForId('BitcoinAddressQRCodeContainer');
    await waitForId('CopyTextToClipboard');
    await element(by.id('SetCustomAmountButton')).tap();
    await element(by.id('BitcoinAmountInput')).replaceText('1');
    await element(by.id('CustomAmountDescription')).replaceText('test');
    await element(by.id('CustomAmountDescription')).tapReturnKey();
    await tapAndTapAgainIfElementIsNotVisible('CustomAmountSaveButton', 'CustomAmountDescriptionText');
    await expect(element(by.id('CustomAmountDescriptionText'))).toHaveText('test');
    await expect(element(by.id('BitcoinAmountText'))).toHaveText('1 BTC');

    await waitForId('BitcoinAddressQRCodeContainer');
    await waitForId('CopyTextToClipboard');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can encrypt storage, with plausible deniabilityl decrypt fake storage', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t4');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t4'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');

    // lets create a wallet
    await helperCreateWallet();

    // go to settings
    await expect(element(by.id('SettingsButton'))).toBeVisible();
    await element(by.id('SettingsButton')).tap();
    await expect(element(by.id('SecurityButton'))).toBeVisible();

    // go to Security page where we will enable encryption
    await element(by.id('SecurityButton')).tap();
    // await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible(); // @see https://github.com/@rneui/themed/@rneui/themed/issues/2519
    await expect(element(by.id('PlausibleDeniabilityButton'))).toBeNotVisible();

    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // first, trying to mistype second password:
    await element(by.id('EncyptedAndPasswordProtectedSwitch')).tap();
    await element(by.id('IUnderstandButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    await element(by.id('PasswordInput')).replaceText('08902');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).replaceText('666');
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    // now, lets put correct passwords and encrypt the storage
    await element(by.id('PasswordInput')).clearText();
    await element(by.id('PasswordInput')).replaceText('qqq');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).clearText();
    await element(by.id('ConfirmPasswordInput')).replaceText('qqq');
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // might not always work the first time
    await sleep(3000); // propagate

    // relaunch app
    await device.launchApp({ newInstance: true });

    // trying to decrypt with incorrect password
    await waitForText('Your storage is encrypted. Password is required to decrypt it.');
    await element(by.type('android.widget.EditText')).typeText('wrong');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Incorrect password. Please try again.'))).toBeVisible();

    // correct password
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await waitForId('WalletsList');

    // previously created wallet should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // now lets enable plausible deniability feature

    // go to settings -> security screen -> plausible deniability screen
    await element(by.id('SettingsButton')).tap();
    await expect(element(by.id('SecurityButton'))).toBeVisible();
    await element(by.id('SecurityButton')).tap();
    // await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible(); // @see https://github.com/@rneui/themed/@rneui/themed/issues/2519
    await expect(element(by.id('PlausibleDeniabilityButton'))).toBeVisible();
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    // trying MAIN password: should fail, obviously
    await element(by.id('PasswordInput')).replaceText('qqq');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).replaceText('qqq');
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // first time might not always work
    await sleep(3000); // propagate
    await expect(element(by.text('Password is currently in use. Please try a different password.'))).toBeVisible();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.text('OK')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    // trying new password, but will mistype
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.id('PasswordInput')).clearText();
    await element(by.id('PasswordInput')).replaceText('passwordForFakeStorage');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).clearText();
    await element(by.id('ConfirmPasswordInput')).replaceText('passwordForFakeStorageWithTypo'); // retyping with typo
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    // trying new password
    await element(by.id('PasswordInput')).clearText();
    await element(by.id('PasswordInput')).replaceText('passwordForFakeStorage');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).clearText();
    await element(by.id('ConfirmPasswordInput')).replaceText('passwordForFakeStorage'); // retyping
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // first time might not always work
    await sleep(3_000); // propagate

    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch the app, unlock with fake password, expect to see fake wallet

    // relaunch app
    await device.launchApp({ newInstance: true });
    //
    await waitForText('Your storage is encrypted. Password is required to decrypt it.');
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await waitForId('WalletsList');

    // previously created wallet IN MAIN STORAGE should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // relaunch app
    await device.launchApp({ newInstance: true });
    //
    await waitForText('Your storage is encrypted. Password is required to decrypt it.');
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await waitForId('WalletsList');

    // previously created wallet in FAKE storage should be visible
    await expect(element(by.id('fake_wallet'))).toBeVisible();

    // now derypting it, to cleanup
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();

    // correct password
    await element(by.id('EncyptedAndPasswordProtectedSwitch')).tap();
    await element(by.text('OK')).tap();
    await element(by.id('PasswordInput')).replaceText('passwordForFakeStorage');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // in case it didnt work first time
    await sleep(3000); // propagate
    await expect(element(by.text('fake_wallet'))).toBeVisible();

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can encrypt storage, and decrypt storage works', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t5');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t5'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');
    await helperCreateWallet();
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();
    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // lets put correct passwords and encrypt the storage
    await element(by.id('EncyptedAndPasswordProtectedSwitch')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.id('IUnderstandButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.id('PasswordInput')).replaceText('pass');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).replaceText('pass');
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // might not always work first time
    await sleep(3000); // propagate
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.id('PasswordInput')).replaceText('fake');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('ConfirmPasswordInput')).replaceText('fake'); // retyping
    await element(by.id('ConfirmPasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // might not always work first time
    await sleep(3000); // propagate
    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch app
    await device.launchApp({ newInstance: true });
    //
    await waitForText('Your storage is encrypted. Password is required to decrypt it.');
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await waitForId('WalletsList');

    // previously created wallet IN MAIN STORAGE should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // now go to settings, and decrypt
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();

    // putting FAKE storage password. should not succeed
    await element(by.id('EncyptedAndPasswordProtectedSwitch')).tap();
    await element(by.text('OK')).tap();
    await element(by.id('PasswordInput')).replaceText('fake');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // might not always work first time
    await sleep(3000); // propagate
    // correct password
    await element(by.id('PasswordInput')).clearText();
    await element(by.id('PasswordInput')).replaceText('pass');
    await element(by.id('PasswordInput')).tapReturnKey();
    await element(by.id('OKButton')).tap();
    await tapIfPresent('OKButton'); // might not always work first time
    await sleep(3000); // propagate

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitForId('cr34t3d'); // success

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can import 2of2 multisig using individual cosigners (1 signer, 1 xpub)', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('can import 2of2 multisig using individual cosigners (1 signer, 1 xpub)');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');
    await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
    await sleep(200); // Wait until bounce animation finishes.
    // going to Import Wallet screen and importing Vault
    await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ActivateVaultButton');
    await element(by.id('ActivateVaultButton')).tap();
    await element(by.id('Create')).tap();
    // vault settings:
    await element(by.id('VaultAdvancedCustomize')).tap();
    await element(by.id('DecreaseN')).tap();
    await element(by.id('ModalDoneButton')).tap();

    //

    await element(by.id('LetsStart')).tap();

    // key1 - seed:

    await element(by.id('VaultCosignerImport1')).tap();
    await element(by.id('ScanOrOpenFile')).tap();

    await sleep(5000); // wait for camera screen to initialize
    await waitForId('ScanQrBackdoorButton');
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
    }
    await element(by.id('scanQrBackdoorInput')).replaceText(
      'pipe goose bottom run seed curious thought kangaroo example family coral success',
    );
    await element(by.id('scanQrBackdoorOkButton')).tap();
    await element(by.id('DoImportKeyButton')).tap(); // when seed - need to extra tap the button

    // key2 - xpub:

    await element(by.id('VaultCosignerImport2')).tap();
    await element(by.id('ScanOrOpenFile')).tap();

    await sleep(5000); // wait for camera screen to initialize
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
    }
    await element(by.id('scanQrBackdoorInput')).replaceText(
      'ur:crypto-account/oeadcypdlouebgaolytaadmetaaddloxaxhdclaxfdyksnwkuypkfevlfzfroyiyecoeosbakbpdcldawzhtcarkwsndcphphsbsdsayaahdcxfgjyckryosmwtdptlbflonbkimlsmovolslbytonayisprvoieftgeflzcrtvesbamtaaddyotadlocsdyykaeykaeykaoykaocypdlouebgaxaaaycyttatrnolimvetsst',
    );
    await element(by.id('scanQrBackdoorOkButton')).tap();
    // when xpub - it automatically closes the modal, so no need to tap the button

    await element(by.id('CreateButton')).tap();
    await waitForText('OK');
    await tapIfTextPresent('OK');
    await waitForId('Multisig Vault');
    await element(by.id('Multisig Vault')).tap(); // go inside the wallet
    await waitForId('ReceiveButton');
    await element(by.id('ReceiveButton')).tap();
    try {
      // in case emulator has no google services and doesnt support pushes
      // we just dont show this popup
      await element(by.text(`No, and do not ask me again.`)).tap();
      await element(by.text(`No, and do not ask me again.`)).tap(); // sometimes the first click doesnt work (detox issue, not app's)
    } catch (_) {}

    await waitForText('bc1qmf06nt4jhvzz4387ak8fecs42k6jqygr2unumetfc7xkdup7ah9s8phlup');

    await device.pressBack();

    await element(by.id('WalletDetails')).tap();
    await waitForText('2 / 2 (native segwit)');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can import multisig setup from UR, and create tx, and sign on hw devices', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t6');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t6'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');
    await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
    await sleep(200); // Wait until bounce animation finishes.
    // going to Import Wallet screen and importing mnemonic
    await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ImportWallet');
    await element(by.id('ImportWallet')).tap();
    await element(by.id('ScanImport')).tap();

    const urs = [
      'UR:BYTES/1OF2/J8RX04F2WJ9SSY577U30R55ELM4LUCJCXJVJTD60SYV9A286Q0AQH7QXL6/TYQMJGEQGFK82E2HV9KXCET5YPXH2MR5D9EKJEEQWDJHGATSYPNXJMR9PG3JQARGD9EJQENFD3JJQCM0DE6XZ6TWWVSX7MNV0YS8QATZD35KXGRTV4UHXGRPDEJZQ6TNYPEKZEN9YP6X7Z3RYPJXJUM5WF5KYAT5V5SXZMT0DENJQCM0WD5KWMN9WFES5GC2FESK6EF6YPXH2MR5D9EKJEEQ2ESH2MR5PFGX7MRFVDUN5GPJYPHKVGPJPFZX2UNFWESHG6T0DCAZQMF0XSUZWTESYUHNQFE0XGNS53N0WFKKZAP6YPGRY46NFQ9Q53PNXAZ5Z3PC8QAZQKNSW43RWDRFDFCXV6Z92F9YU6NGGD94S5NNWP2XGNZ22C6K2M69D4F4YKNYFPC5GANS',
      'UR:BYTES/2OF2/J8RX04F2WJ9SSY577U30R55ELM4LUCJCXJVJTD60SYV9A286Q0AQH7QXL6/8944VARY2EZHJ62CDVMHQKRC2F3XVKN629M8X3ZXWPNYGJZ9FPT8G4NS0Q6YG73EG3R42468DCE9S6E40FRN2AF5X4G4GNTNT9FNYAN2DA5YU5G2PGCNVWZYGSMRQVE6YPD8QATZXU6K6S298PZK57TC2DAX772SD4RKUEP4G5MY672YXAQ5C36WDEJ8YA2HWC6NY7RS0F5K6KJ3FD6KKAMKG4N9S4ZGW9K5SWRWVF3XXDNRVDGR2APJV9XNXMTHWVEHQJ6E2DHYKUZTF4XHJARYVF8Y2KJX24UYK7N6W3V5VNFC2PHQ5ZSJDYL5T',
    ];

    await waitFor(element(by.id('UrProgressBar'))).toBeNotVisible();

    for (const ur of urs) {
      // tapping 5 times invisible button is a backdoor:
      await sleep(5000); // wait for camera screen to initialize
      for (let c = 0; c <= 5; c++) {
        await element(by.id('ScanQrBackdoorButton')).tap();
      }
      await element(by.id('scanQrBackdoorInput')).replaceText(ur);
      await element(by.id('scanQrBackdoorOkButton')).tap();
      await waitFor(element(by.id('UrProgressBar'))).toBeVisible();
    }

    if (process.env.TRAVIS) await sleep(60000);
    await waitForText('OK', 3 * 61000); // waiting for wallet import
    await element(by.text('OK')).tap();
    // ok, wallet imported

    // lets go inside wallet
    const expectedWalletLabel = 'Multisig Vault';
    await element(by.text(expectedWalletLabel)).tap();

    // sending...

    await waitForId('SendButton');
    await element(by.id('SendButton')).tap();

    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput')).typeText('0.0005\n');
    await element(by.id('BitcoinAmountInput')).tapReturnKey();

    // setting fee rate:
    const feeRate = 3;
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustomContainerButton')).tap();
    await element(by.id('feeCustom')).typeText(feeRate.toString());
    await element(by.id('feeCustom')).tapReturnKey();
    await sleep(1_000); // propagate

    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    await waitFor(element(by.id('ItemUnsigned'))).toBeVisible();
    await waitFor(element(by.id('ItemSigned'))).toBeNotVisible(); // not a single green checkmark

    await element(by.id('ProvideSignature')).tap();
    await element(by.id('PsbtMultisigQRCodeScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await tapAndTapAgainIfElementIsNotVisible('CosignedScanOrImportFile', 'ScanQrBackdoorButton');

    const ursSignedByPassport = [
      'UR:CRYPTO-PSBT/22-4/LPCMAACFAXPLCYZTVYVOPKHDWPHKAXPYJOIHIDHNJSATRTSWEYGUHDURWYDECAGLAAHTTBHTFZFPWDRTLROXLUEHCXAHJTIHTEHDHKTEVTOTIOWFSKGEOSCFFLDRGLFTCYKELSRDNSHYGLLEVYIDGYZOEEDAAOENHGASFDHFVWNSATVYCFETATZSFROXFPMHGUJNWDSPNYMHHGPAIMGYURAYCXLEZEZSCLKBJZLFSRAOOYMSYNCEHDOSPYGTTDSODRSKLALBCAVYBNOLOEGSOYVOVLMWFDPFHGBAVDAEAEAEADADWMDTGDPTADAEADADSTENFYASFDTBCLDINBAOHFHYTPPKWYMSSNDKHKKNUOIELPDRKTOYHPCFCSWNFXPKFZNEPKVOIOCNAOAXMNPSKPLTGYFLRHLOHGUYKISWBWVEGUGMLAAYDLLDLSAAVDTDSADLIDFXYLKKFYURMTOXLKMDRSTYTERSJNHSBDPSGOGWJKJESTWLZCTKGE',
      'UR:CRYPTO-PSBT/52-4/LPCSEEAACFAXPLCYZTVYVOPKHDWPPECPWPHNLBGMLDGOMWJYMDASCFYTOEGRTDGMZOCXFGFEGOSPBDSBISPKCNNYNBIORDRLRTRTHGAAHLGDFWJTVWCEYKGLVEIODSYKKNMSBGNYSAZEZEADGHSAAEAEAECPAMAXCSPLEHGDWFSAGETNWLPRECKOSKDWURMKMYSOASBEBDBNLBFMESCHZEVSJTJKDNADCEENTDROWFVYWEPDRNMDSNYKPMRYZMRLMNRYPAAYBKTDCLGDJKIYBNTYFXECMKWFLSWFWPCPGYBKEHSETTOECANTRHKGFGCLSROLMYLKNSOLHGGDHPOXWPMWCKLYETCLMWAMIDISHKKPJTWDHFPTECMOBALNDABSPTAXAEAELAAEADAEAELSAOGDPTAEAHFLGMCLAXDWPLAHBSMTLSHFPKRLMTIYLRYATNLGPLWFLYHFTOTLRDWZHKBWLAHNFNCPWTIMRFLUVYHLBWKBCXGYNLFYDPOL',
      'UR:CRYPTO-PSBT/76-4/LPCSGSAACFAXPLCYZTVYVOPKHDWPBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAAGMPLAEAECPAOAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKCECMLGTBAXDYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAECPAOAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAEADADFLGMCLAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCLAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKGMPLAEAEAEWLCMNTPF',
      'UR:CRYPTO-PSBT/416-4/LPCFADNBAACFAXPLCYZTVYVOPKHDWPONBWDWPACLGTAEIDWLWZBAZODNCSMSEHZELBIYDLMWCSHDIADKNYWNZSSGPKVEFLMKLRKNCELEDAMYEMBYKIJKFNDEDMIAHPLBRDPMLTROWMFNWSLTROCMIOYKWPFZDSLGLGDKWSOYPFAHMODAMYENSAIOSEGAZEEHTSLBKGOEDMWZUTRFNYJEKIPEEMIYJSOTUEZERORFPSGRPABSSKLOGOONAECAGRSFBDLRWFEMLNSALRCWZOWNLPHNPTNSLPJTKBMTEYNSISTAFTEHSEGDOTENSNMHKNFGCLFXOXMYPLCELTKOMTNEGRTOJYGURHKGPMTAFHHKWPKIOTJPGWVSKNSKSSFTOYPTKKSGSRFGIORHMDDAFHNYKTHPCPOTKEGELANNLEWEGMJEKPIYGYSFECJNCWFNRYVLTBTBWPHTKBISTLRLDEMWADCWMNKTTARKDRJSZCJPLRCNFSHGNEGAMTYLVLGOWS',
    ];

    for (const ur of ursSignedByPassport) {
      // tapping 5 times invisible button is a backdoor:
      await sleep(5000); // wait for camera screen to initialize
      for (let c = 0; c <= 5; c++) {
        await element(by.id('ScanQrBackdoorButton')).tap();
      }
      await element(by.id('scanQrBackdoorInput')).replaceText(ur);
      await element(by.id('scanQrBackdoorOkButton')).tap();
      await waitFor(element(by.id('UrProgressBar'))).toBeVisible();
    }

    await waitFor(element(by.id('ItemSigned'))).toBeVisible(); // one green checkmark visible

    await element(by.id('ProvideSignature')).tap();
    await element(by.id('PsbtMultisigQRCodeScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await tapAndTapAgainIfElementIsNotVisible('CosignedScanOrImportFile', 'ScanQrBackdoorButton');

    const urSignedByPassportAndKeystone = [
      'UR:CRYPTO-PSBT/105-2/LPCSINAOCFAXOLCYSBLUFDHSHKADTEHKAXOTJOJKIDJYZMADAEKIAOAEAEAEADSGMHIEQDIAFLKPVABAJEHLLNVLRKKPCPDAHYNSOTTSOYBTIMMUCYAASSMDAMDAMKAEAEAEAEAEZMZMZMZMAOGDSRAEAEAEAEAEAECMAEBBKBOTLPWFGMRNINIMPFYNWLGEBAVTVLSWTYPAGEGUWFVLAEAEAEAEAEAECPAECXHEJTWTTTWEPDFMMDSNYKDPRYZMRLBARSPAAYLETDCLGDJKIHBNTYFXCHNNWTRHFEAEAEAEAEAEADAEWDAOAEAEAEAEADADSTENIYASISYLVDVLGWCXRPBWVYVSDALOTLCESKTTFEJTWDTBPTECMOMNLNDABSDTADAEAEAEAEADAEAELAAOGDPTADAEAEAEAEAECPAECXCLSWSSWSCPVTGTESFWSBCTCSETNSPYNLBKJLZTUEMWSOMSNNTYGSLSFPNEPKVOIOONMOAOAEAEAEAEAECMAEBBMNAMRTRKDYGUHDURWSVOLGDRRLESMEDLOLGWLYNTAOFLDYFYAOCXDYYTJOMYYAUELEDYKIYLADUROYFNURDRGLFTCYKEKEFEIAOYGSTNCPIDGYZOEEDAAOCXHGCAENYKHNJLGOHEJOGMRLBNTDWYGWJOPFPYFMKKTISROXGMIMGYURAYCXLEUOZSADCLAOJPBGWSASPTIATTPMLECMPRIHSTMDJYLOYKTKRTHHTLSTFZKPOYWKBKROASBGBAVDAEAEAEAEADADDNGDPTADAEAEAEAEAECPAECXCLSWSSWSCPVTGTESFWSBCTCSETNSPYNLBKJLZTUEMWSOMSNNTYGSLSFPNEPKVOIOCPAOAXFTRPWPCPGYBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAAFLDYFYAOCXISRERKHDRDGAPMATEHJLFL',
      'UR:CRYPTO-PSBT/158-2/LPCSNNAOCFAXOLCYSBLUFDHSHKADTEZECFFTHDETNBADMOCLINLNOSOXZEYKGDPYTPKTRETNURTIZOPDAOCXIAAOWETTJKMDUOSBONAASWNLMERLZSGLCYCTGAKBDAFHGHWKMTRSNLAAYKFWWPRSADADAHFLGMCLAXBAPLDADMGDFLRHLOHGUYHESWEOSKMDMTJLDRTKSSRDFGDWSNTNCHZEVSJTJKDNCNCLAXFTRPWPCPGYBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAAGMPLCPAMAXBAPLDADMGDFLRHLOHGUYHESWEOSKMDMTJLDRTKSSRDFGDWSNTNCHZEVSJTJKDNCNCECMLGTBAXDYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAXAEAEAECPAMAXFTRPWPCPGYBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAACETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAXAEAEAEAEAEADADFLGMCLAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCLAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKGMPLCPAOAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAECPAOAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKCECMLGTBAXDYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAEAENNHKLKUO',
    ];

    for (const ur of urSignedByPassportAndKeystone) {
      // tapping 5 times invisible button is a backdoor:
      await sleep(5000); // wait for camera screen to initialize
      for (let c = 0; c <= 5; c++) {
        await element(by.id('ScanQrBackdoorButton')).tap();
      }
      await element(by.id('scanQrBackdoorInput')).replaceText(ur);
      await element(by.id('scanQrBackdoorOkButton')).tap();
      await waitFor(element(by.id('UrProgressBar'))).toBeVisible();
    }

    await waitFor(element(by.id('ExportSignedPsbt'))).toBeVisible();

    await element(by.id('PsbtMultisigConfirmButton')).tap();

    // created. verifying:
    await waitForId('TransactionValue');
    await expect(element(by.id('TransactionValue'))).toHaveText('0.0005');
    await element(by.id('TransactionDetailsButton')).tap();

    const txhex = await extractTextFromElementById('TxhexInput');

    const transaction = bitcoin.Transaction.fromHex(txhex);
    assert.ok(transaction.ins.length === 1);
    assert.strictEqual(transaction.outs.length, 2);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl'); // to address
    assert.strictEqual(transaction.outs[0].value, 50000n);

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can discover wallet account and import it', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t7');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t6'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');

    await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
    await sleep(500); // Wait until bounce animation finishes.
    // going to Import Wallet screen and importing mnemonic
    await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ScrollView');
    await element(by.id('ScrollView')).swipe('up', 'fast', 0.9); // in case emu screen is small and it doesnt fit
    await element(by.id('ImportWallet')).tap();
    await element(by.id('MnemonicInput')).replaceText(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    await element(by.id('HeaderMenuButton')).tap();
    await element(by.text('Passphrase')).tap();
    await element(by.id('HeaderMenuButton')).tap();
    await element(by.text('Search accounts')).tap();
    await element(by.id('DoImport')).tap();
    await sleep(1000);

    // cancel import and start over
    await element(by.text('Cancel')).tap();
    await element(by.id('DoImport')).tap();
    await sleep(1000);
    await element(by.text('OK')).tap();

    // wait for discovery to be completed
    await waitFor(element(by.text("m/84'/0'/0'")))
      .toBeVisible()
      .withTimeout(300 * 1000);
    await expect(element(by.text("m/44'/0'/1'"))).toBeVisible();
    await expect(element(by.text("m/49'/0'/0'"))).toBeVisible();
    await expect(element(by.id('Loading'))).not.toBeVisible();

    // open custom derivation path screen and import the wallet
    await element(by.id('CustomDerivationPathButton')).tap();
    await element(by.id('DerivationPathInput')).replaceText("m/44'/0'/1'");
    await waitFor(element(by.text('Found'))) // wait for discovery to be completed
      .toExist()
      .withTimeout(300 * 1000);
    await element(by.text('Found')).tap();
    await element(by.id('ImportButton')).tap();
    await element(by.text('OK')).tap();

    // go to wallet and check derivation path
    await element(by.id('Imported HD Legacy (BIP44 P2PKH)')).tap();
    await element(by.id('WalletDetails')).tap();
    await expect(element(by.id('DerivationPath'))).toHaveText("m/44'/0'/1'");

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can create wallet, and use main screen SCAN button to scan address', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t8');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t8'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');

    await helperCreateWallet();
    await tapAndTapAgainIfElementIsNotVisible('HomeScreenScanButton', 'ScanQrBackdoorButton');
    await scanText('bitcoin:bc1qzrtn3xwlunlrm0n0uu23lr00gmdx4lnlavdy75');
    await expect(element(by.id('AddressInput'))).toHaveText('bc1qzrtn3xwlunlrm0n0uu23lr00gmdx4lnlavdy75');

    // now, gona import second wallet (ln) and test bip21 with both onchain and offchain present

    await device.pressBack();
    await waitForId('WalletsList');
    await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
    // going to Import Wallet screen and importing mnemonic
    await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ImportWallet');
    await element(by.id('ImportWallet')).tap();
    await element(by.id('ScanImport')).tap();
    await scanText('lndhub://a3b4c9109408a043d1ea:ec5a888596b2c45729d1@https://kek.lol');
    await waitForText('OK', 30_000); // waiting for wallet import
    await element(by.text('OK')).tap();

    // imported

    await tapAndTapAgainIfElementIsNotVisible('HomeScreenScanButton', 'ScanQrBackdoorButton');
    await scanText(
      'lightning:lnbc1p090vrqpp5yxpd5wjtln4r874a9grkpr772cs0uyn7ayva3ypleyut7z0a4rgsdpu235hqurfdcsx7an9wf6x7undv4h8ggpgw35hqurfdchx6eff9p6nzvfc8q5scqzpgxqyz5vqcy30v2txquuh06h6946pal4dlm4hyujqv8ec3cunetf46gfydpxswedv4sr2rlg8dwpcg3fq9gah3j42373w366e6yau37t30amp5zqqftd004',
    );
    await expect(element(by.id('AddressInput'))).toHaveText(
      'lnbc1p090vrqpp5yxpd5wjtln4r874a9grkpr772cs0uyn7ayva3ypleyut7z0a4rgsdpu235hqurfdcsx7an9wf6x7undv4h8ggpgw35hqurfdchx6eff9p6nzvfc8q5scqzpgxqyz5vqcy30v2txquuh06h6946pal4dlm4hyujqv8ec3cunetf46gfydpxswedv4sr2rlg8dwpcg3fq9gah3j42373w366e6yau37t30amp5zqqftd004',
    );

    // ok, time to test wallets selector
    await device.pressBack();
    await waitForId('WalletsList');
    await tapAndTapAgainIfElementIsNotVisible('HomeScreenScanButton', 'ScanQrBackdoorButton');
    await scanText(
      'bitcoin:1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
    );

    await waitForId('SelectWalletsList');
    await element(by.text('Imported Lightning')).tap();
    await expect(element(by.id('AddressInput'))).toHaveText(
      'lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
    ); // send screen, and ln invoice is prefilled!

    // now again, but chosing onchain

    await device.pressBack();
    await waitForId('WalletsList');
    await tapAndTapAgainIfElementIsNotVisible('HomeScreenScanButton', 'ScanQrBackdoorButton');
    await scanText(
      'bitcoin:1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
    );

    await waitForId('SelectWalletsList');
    await element(by.text('cr34t3d')).tap();
    await expect(element(by.id('AddressInput'))).toHaveText('1DamianM2k8WfNEeJmyqSe2YW1upB7UATx'); // send screen, and ONCHAIN invoice is prefilled!
    await expect(element(by.id('BitcoinAmountInput'))).toHaveText('0.000001');

    // let's test Azteco voucher scanning now, while we have a wallet
    await device.pressBack();
    await waitForId('WalletsList');
    await tapAndTapAgainIfElementIsNotVisible('HomeScreenScanButton', 'ScanQrBackdoorButton');
    await scanText('https://azte.co/redeem?code=1111222233334444');
    await waitForId('AztecoCode');
    await expect(element(by.id('AztecoCode'))).toBeVisible();

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can create wallet and delete wallet', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t9');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t8'), 'as it previously passed on Travis');
    }
    await device.launchApp({ delete: true }); // reinstalling the app just for any case to clean up app's storage
    await waitForId('WalletsList');
    await helperCreateWallet();
    // nop
    await helperDeleteWallet('cr34t3d');
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });
});
