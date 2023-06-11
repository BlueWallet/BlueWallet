import {
  helperDeleteWallet,
  sleep,
  hashIt,
  sup,
  yo,
  extractTextFromElementById,
  expectToBeVisible,
  helperCreateWallet,
  helperSwitchAdvancedMode,
} from './helperz';
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');

/**
 * this testsuite is for test cases that require no wallets to be present
 */

beforeAll(async () => {
  // reinstalling the app just for any case to clean up app's storage
  await device.launchApp({ delete: true });
}, 300_000);

describe('BlueWallet UI Tests - no wallets', () => {
  it('selftest passes', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t1');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t1'), 'as it previously passed on Travis');
    }
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(300 * 1000);

    // go to settings, press SelfTest and wait for OK
    await element(by.id('SettingsButton')).tap();
    await element(by.id('AboutButton')).tap();
    await element(by.id('AboutScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await element(by.id('RunSelfTestButton')).tap();
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
    await device.launchApp({ newInstance: true });
    await yo('WalletsList');

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

    // enable AdvancedMode
    await element(by.id('AdvancedMode')).tap();
    await device.pressBack();
    // disable it:
    await element(by.id('GeneralSettings')).tap();
    await element(by.id('AdvancedMode')).tap();
    await device.pressBack();
    //
    // currency
    // change currency to ARS ($) and switch it back to USD ($)
    await element(by.id('Currency')).tap();
    await element(by.text('ARS ($)')).tap();
    await expect(element(by.text('Price is obtained from Yadio'))).toBeVisible();
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
    await element(by.id('HostInput')).replaceText('electrum.blockstream.info\n');
    await element(by.id('PortInput')).replaceText('50001\n');
    await element(by.id('Save')).tap();
    await sup('OK');
    await element(by.text('OK')).tap();
    await element(by.id('ResetToDefault')).tap();
    await sup('OK');
    await element(by.text('OK')).tap();
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
    await sup('OK');
    await expect(element(by.text('Invalid LNDHub URI'))).toBeVisible();
    await element(by.text('OK')).tap();
    await element(by.id('URIInput')).replaceText('https://lndhub.herokuapp.com\n');
    await element(by.id('Save')).tap();
    await sup('OK');
    await expect(element(by.text('Your changes have been saved successfully.'))).toBeVisible();
    await element(by.text('OK')).tap();
    await element(by.id('URIInput')).replaceText('\n');
    await element(by.id('Save')).tap();
    await sup('OK');
    await expect(element(by.text('Your changes have been saved successfully.'))).toBeVisible();
    await element(by.text('OK')).tap();
    await device.pressBack();
    */

    // notifications
    // turn on notifications if available
    // console.warn('yo');
    // await sleep(300000);
    if (await expectToBeVisible('NotificationSettings')) {
      await element(by.id('NotificationSettings')).tap();
      await element(by.id('NotificationsSwitch')).tap();
      await sup('OK');
      await element(by.text('OK')).tap();
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
    await sup('OK');
    // await expect(element(by.text('the transaction was rejected by network rules....'))).toBeVisible();
    await element(by.text('OK')).tap();
    await device.pressBack();

    // IsItMyAddress
    await element(by.id('IsItMyAddress')).tap();
    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('CheckAddress')).tap();
    await expect(element(by.id('Result'))).toHaveText('None of the available wallets own the provided address.');
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
    await device.launchApp({ newInstance: true });
    await yo('WalletsList');

    await helperCreateWallet();

    await device.launchApp({ newInstance: true });
    await yo('WalletsList');
    await expect(element(by.id('cr34t3d'))).toBeVisible();
    await element(by.id('cr34t3d')).tap();
    await element(by.id('ReceiveButton')).tap();
    await element(by.text('Yes, I have')).tap();
    try {
      // in case emulator has no google services and doesnt support pushes
      // we just dont show this popup
      await element(by.text(`No, and don’t ask me again`)).tap();
    } catch (_) {}
    await yo('BitcoinAddressQRCodeContainer');
    await yo('BlueCopyTextToClipboard');
    await element(by.id('SetCustomAmountButton')).tap();
    await element(by.id('BitcoinAmountInput')).replaceText('1');
    await element(by.id('CustomAmountDescription')).typeText('test');
    await element(by.id('CustomAmountSaveButton')).tap();
    await sup('1 BTC');
    await sup('test');
    await yo('BitcoinAddressQRCodeContainer');
    await yo('BlueCopyTextToClipboard');
    await device.pressBack();
    await device.pressBack();
    await helperDeleteWallet('cr34t3d');
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can encrypt storage, with plausible deniabilityl decrypt fake storage', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t4');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t4'), 'as it previously passed on Travis');
    }
    await device.launchApp({ newInstance: true });
    await yo('WalletsList');

    // lets create a wallet
    await helperCreateWallet();

    // go to settings
    await expect(element(by.id('SettingsButton'))).toBeVisible();
    await element(by.id('SettingsButton')).tap();
    await expect(element(by.id('SecurityButton'))).toBeVisible();

    // go to Security page where we will enable encryption
    await element(by.id('SecurityButton')).tap();
    // await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible(); // @see https://github.com/react-native-elements/react-native-elements/issues/2519
    await expect(element(by.id('PlausibleDeniabilityButton'))).toBeNotVisible();

    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // first, trying to mistype second password:
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol. lets tap it
    await element(by.type('android.widget.EditText')).typeText('08902');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('666');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Passwords do not match.'))).toBeVisible();
    await element(by.text('OK')).tap();

    // now, lets put correct passwords and encrypt the storage
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);

    // trying to decrypt with incorrect password
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it.'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('wrong');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Incorrect password. Please try again.'))).toBeVisible();

    // correct password
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // now lets enable plausible deniability feature

    // go to settings -> security screen -> plausible deniability screen
    await element(by.id('SettingsButton')).tap();
    await expect(element(by.id('SecurityButton'))).toBeVisible();
    await element(by.id('SecurityButton')).tap();
    // await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible(); // @see https://github.com/react-native-elements/react-native-elements/issues/2519
    await expect(element(by.id('PlausibleDeniabilityButton'))).toBeVisible();
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    await expect(element(by.text('Password for the fake storage should not match the password for your main storage.'))).toBeVisible();

    // trying MAIN password: should fail, obviously
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Password is currently in use. Please try a different password.'))).toBeVisible();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.text('OK')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    // trying new password, but will mistype
    await element(by.id('CreateFakeStorageButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Re-type password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorageWithTypo'); // retyping with typo
    await element(by.text('OK')).tap();
    await expect(element(by.text('Passwords do not match. Please try again.'))).toBeVisible();
    await element(by.text('OK')).tap();

    // trying new password
    await element(by.id('CreateFakeStorageButton')).tap();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Re-type password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage'); // retyping
    await element(by.text('OK')).tap();

    await expect(element(by.text('Success'))).toBeVisible();
    await element(by.text('OK')).tap();

    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch the app, unlock with fake password, expect to see fake wallet

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it.'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet IN MAIN STORAGE should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await sleep(3000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it.'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet in FAKE storage should be visible
    await expect(element(by.id('fake_wallet'))).toBeVisible();

    // now derypting it, to cleanup
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();

    // correct password
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();

    await helperDeleteWallet('fake_wallet');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can encrypt storage, and decrypt storage works', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t5');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t5'), 'as it previously passed on Travis');
    }
    await device.launchApp({ newInstance: true });
    await yo('WalletsList');
    await helperCreateWallet();
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();
    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // lets put correct passwords and encrypt the storage
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Re-type password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('fake'); // retyping
    await element(by.text('OK')).tap();
    await expect(element(by.text('Success'))).toBeVisible();
    await element(by.text('OK')).tap();

    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it.'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet IN MAIN STORAGE should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // now go to settings, and decrypt
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();

    // putting FAKE storage password. should not succeed
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Incorrect password. Please try again.'))).toBeVisible();
    await element(by.text('OK')).tap();

    // correct password
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await yo('cr34t3d'); // success
    await helperDeleteWallet('cr34t3d');
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can import multisig setup from UR, and create tx, and sign on hw devices', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t6');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t6'), 'as it previously passed on Travis');
    }
    await device.launchApp({ newInstance: true });
    await yo('WalletsList');
    await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
    // going to Import Wallet screen and importing mnemonic
    await element(by.id('CreateAWallet')).tap();
    await element(by.id('ImportWallet')).tap();
    await element(by.id('ScanImport')).tap();

    const urs = [
      'UR:BYTES/1OF2/J8RX04F2WJ9SSY577U30R55ELM4LUCJCXJVJTD60SYV9A286Q0AQH7QXL6/TYQMJGEQGFK82E2HV9KXCET5YPXH2MR5D9EKJEEQWDJHGATSYPNXJMR9PG3JQARGD9EJQENFD3JJQCM0DE6XZ6TWWVSX7MNV0YS8QATZD35KXGRTV4UHXGRPDEJZQ6TNYPEKZEN9YP6X7Z3RYPJXJUM5WF5KYAT5V5SXZMT0DENJQCM0WD5KWMN9WFES5GC2FESK6EF6YPXH2MR5D9EKJEEQ2ESH2MR5PFGX7MRFVDUN5GPJYPHKVGPJPFZX2UNFWESHG6T0DCAZQMF0XSUZWTESYUHNQFE0XGNS53N0WFKKZAP6YPGRY46NFQ9Q53PNXAZ5Z3PC8QAZQKNSW43RWDRFDFCXV6Z92F9YU6NGGD94S5NNWP2XGNZ22C6K2M69D4F4YKNYFPC5GANS',
      'UR:BYTES/2OF2/J8RX04F2WJ9SSY577U30R55ELM4LUCJCXJVJTD60SYV9A286Q0AQH7QXL6/8944VARY2EZHJ62CDVMHQKRC2F3XVKN629M8X3ZXWPNYGJZ9FPT8G4NS0Q6YG73EG3R42468DCE9S6E40FRN2AF5X4G4GNTNT9FNYAN2DA5YU5G2PGCNVWZYGSMRQVE6YPD8QATZXU6K6S298PZK57TC2DAX772SD4RKUEP4G5MY672YXAQ5C36WDEJ8YA2HWC6NY7RS0F5K6KJ3FD6KKAMKG4N9S4ZGW9K5SWRWVF3XXDNRVDGR2APJV9XNXMTHWVEHQJ6E2DHYKUZTF4XHJARYVF8Y2KJX24UYK7N6W3V5VNFC2PHQ5ZSJDYL5T',
    ];

    await waitFor(element(by.id('UrProgressBar'))).toBeNotVisible();

    for (const ur of urs) {
      // tapping 5 times invisible button is a backdoor:
      for (let c = 0; c <= 5; c++) {
        await element(by.id('ScanQrBackdoorButton')).tap();
      }
      await element(by.id('scanQrBackdoorInput')).replaceText(ur);
      await element(by.id('scanQrBackdoorOkButton')).tap();
      await waitFor(element(by.id('UrProgressBar'))).toBeVisible();
    }

    if (process.env.TRAVIS) await sleep(60000);
    await sup('OK', 3 * 61000); // waiting for wallet import
    await element(by.text('OK')).tap();
    // ok, wallet imported

    // lets go inside wallet
    const expectedWalletLabel = 'Multisig Vault';
    await element(by.text(expectedWalletLabel)).tap();

    // sending...

    await element(by.id('SendButton')).tap();

    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput')).typeText('0.0005\n');

    // setting fee rate:
    const feeRate = 3;
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText(feeRate + '');
    await element(by.text('OK')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    await waitFor(element(by.id('ItemUnsigned'))).toBeVisible();
    await waitFor(element(by.id('ItemSigned'))).toBeNotVisible(); // not a single green checkmark

    await element(by.id('ProvideSignature')).tap();
    await element(by.id('CosignedScanOrImportFile')).tap();

    const ursSignedByPassport = [
      'UR:CRYPTO-PSBT/22-4/LPCMAACFAXPLCYZTVYVOPKHDWPHKAXPYJOIHIDHNJSATRTSWEYGUHDURWYDECAGLAAHTTBHTFZFPWDRTLROXLUEHCXAHJTIHTEHDHKTEVTOTIOWFSKGEOSCFFLDRGLFTCYKELSRDNSHYGLLEVYIDGYZOEEDAAOENHGASFDHFVWNSATVYCFETATZSFROXFPMHGUJNWDSPNYMHHGPAIMGYURAYCXLEZEZSCLKBJZLFSRAOOYMSYNCEHDOSPYGTTDSODRSKLALBCAVYBNOLOEGSOYVOVLMWFDPFHGBAVDAEAEAEADADWMDTGDPTADAEADADSTENFYASFDTBCLDINBAOHFHYTPPKWYMSSNDKHKKNUOIELPDRKTOYHPCFCSWNFXPKFZNEPKVOIOCNAOAXMNPSKPLTGYFLRHLOHGUYKISWBWVEGUGMLAAYDLLDLSAAVDTDSADLIDFXYLKKFYURMTOXLKMDRSTYTERSJNHSBDPSGOGWJKJESTWLZCTKGE',
      'UR:CRYPTO-PSBT/52-4/LPCSEEAACFAXPLCYZTVYVOPKHDWPPECPWPHNLBGMLDGOMWJYMDASCFYTOEGRTDGMZOCXFGFEGOSPBDSBISPKCNNYNBIORDRLRTRTHGAAHLGDFWJTVWCEYKGLVEIODSYKKNMSBGNYSAZEZEADGHSAAEAEAECPAMAXCSPLEHGDWFSAGETNWLPRECKOSKDWURMKMYSOASBEBDBNLBFMESCHZEVSJTJKDNADCEENTDROWFVYWEPDRNMDSNYKPMRYZMRLMNRYPAAYBKTDCLGDJKIYBNTYFXECMKWFLSWFWPCPGYBKEHSETTOECANTRHKGFGCLSROLMYLKNSOLHGGDHPOXWPMWCKLYETCLMWAMIDISHKKPJTWDHFPTECMOBALNDABSPTAXAEAELAAEADAEAELSAOGDPTAEAHFLGMCLAXDWPLAHBSMTLSHFPKRLMTIYLRYATNLGPLWFLYHFTOTLRDWZHKBWLAHNFNCPWTIMRFLUVYHLBWKBCXGYNLFYDPOL',
      'UR:CRYPTO-PSBT/76-4/LPCSGSAACFAXPLCYZTVYVOPKHDWPBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAAGMPLAEAECPAOAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKCECMLGTBAXDYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAECPAOAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAEADADFLGMCLAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCLAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKGMPLAEAEAEWLCMNTPF',
      'UR:CRYPTO-PSBT/416-4/LPCFADNBAACFAXPLCYZTVYVOPKHDWPONBWDWPACLGTAEIDWLWZBAZODNCSMSEHZELBIYDLMWCSHDIADKNYWNZSSGPKVEFLMKLRKNCELEDAMYEMBYKIJKFNDEDMIAHPLBRDPMLTROWMFNWSLTROCMIOYKWPFZDSLGLGDKWSOYPFAHMODAMYENSAIOSEGAZEEHTSLBKGOEDMWZUTRFNYJEKIPEEMIYJSOTUEZERORFPSGRPABSSKLOGOONAECAGRSFBDLRWFEMLNSALRCWZOWNLPHNPTNSLPJTKBMTEYNSISTAFTEHSEGDOTENSNMHKNFGCLFXOXMYPLCELTKOMTNEGRTOJYGURHKGPMTAFHHKWPKIOTJPGWVSKNSKSSFTOYPTKKSGSRFGIORHMDDAFHNYKTHPCPOTKEGELANNLEWEGMJEKPIYGYSFECJNCWFNRYVLTBTBWPHTKBISTLRLDEMWADCWMNKTTARKDRJSZCJPLRCNFSHGNEGAMTYLVLGOWS',
    ];

    for (const ur of ursSignedByPassport) {
      // tapping 5 times invisible button is a backdoor:
      for (let c = 0; c <= 5; c++) {
        await element(by.id('ScanQrBackdoorButton')).tap();
      }
      await element(by.id('scanQrBackdoorInput')).replaceText(ur);
      await element(by.id('scanQrBackdoorOkButton')).tap();
      await waitFor(element(by.id('UrProgressBar'))).toBeVisible();
    }

    await waitFor(element(by.id('ItemSigned'))).toBeVisible(); // one green checkmark visible

    await element(by.id('ProvideSignature')).tap();
    await element(by.id('CosignedScanOrImportFile')).tap();

    const urSignedByPassportAndKeystone = [
      'UR:CRYPTO-PSBT/105-2/LPCSINAOCFAXOLCYSBLUFDHSHKADTEHKAXOTJOJKIDJYZMADAEKIAOAEAEAEADSGMHIEQDIAFLKPVABAJEHLLNVLRKKPCPDAHYNSOTTSOYBTIMMUCYAASSMDAMDAMKAEAEAEAEAEZMZMZMZMAOGDSRAEAEAEAEAEAECMAEBBKBOTLPWFGMRNINIMPFYNWLGEBAVTVLSWTYPAGEGUWFVLAEAEAEAEAEAECPAECXHEJTWTTTWEPDFMMDSNYKDPRYZMRLBARSPAAYLETDCLGDJKIHBNTYFXCHNNWTRHFEAEAEAEAEAEADAEWDAOAEAEAEAEADADSTENIYASISYLVDVLGWCXRPBWVYVSDALOTLCESKTTFEJTWDTBPTECMOMNLNDABSDTADAEAEAEAEADAEAELAAOGDPTADAEAEAEAEAECPAECXCLSWSSWSCPVTGTESFWSBCTCSETNSPYNLBKJLZTUEMWSOMSNNTYGSLSFPNEPKVOIOONMOAOAEAEAEAEAECMAEBBMNAMRTRKDYGUHDURWSVOLGDRRLESMEDLOLGWLYNTAOFLDYFYAOCXDYYTJOMYYAUELEDYKIYLADUROYFNURDRGLFTCYKEKEFEIAOYGSTNCPIDGYZOEEDAAOCXHGCAENYKHNJLGOHEJOGMRLBNTDWYGWJOPFPYFMKKTISROXGMIMGYURAYCXLEUOZSADCLAOJPBGWSASPTIATTPMLECMPRIHSTMDJYLOYKTKRTHHTLSTFZKPOYWKBKROASBGBAVDAEAEAEAEADADDNGDPTADAEAEAEAEAECPAECXCLSWSSWSCPVTGTESFWSBCTCSETNSPYNLBKJLZTUEMWSOMSNNTYGSLSFPNEPKVOIOCPAOAXFTRPWPCPGYBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAAFLDYFYAOCXISRERKHDRDGAPMATEHJLFL',
      'UR:CRYPTO-PSBT/158-2/LPCSNNAOCFAXOLCYSBLUFDHSHKADTEZECFFTHDETNBADMOCLINLNOSOXZEYKGDPYTPKTRETNURTIZOPDAOCXIAAOWETTJKMDUOSBONAASWNLMERLZSGLCYCTGAKBDAFHGHWKMTRSNLAAYKFWWPRSADADAHFLGMCLAXBAPLDADMGDFLRHLOHGUYHESWEOSKMDMTJLDRTKSSRDFGDWSNTNCHZEVSJTJKDNCNCLAXFTRPWPCPGYBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAAGMPLCPAMAXBAPLDADMGDFLRHLOHGUYHESWEOSKMDMTJLDRTKSSRDFGDWSNTNCHZEVSJTJKDNCNCECMLGTBAXDYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAXAEAEAECPAMAXFTRPWPCPGYBKEHRTTTFDCTNTRHKGFGCXSAHSRHWDMDTONBRLROWMSFCPBTHNTIAACETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAXAEAEAEAEAEADADFLGMCLAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCLAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKGMPLCPAOAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAECPAOAXFXPSGMTABNWEIAJTHSCLAOSERKVLJKADWEBKTBBTRKJPTPYKMKLTMSRYRKDYPLLKCECMLGTBAXDYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAEAENNHKLKUO',
    ];

    for (const ur of urSignedByPassportAndKeystone) {
      // tapping 5 times invisible button is a backdoor:
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
    await yo('TransactionValue');
    await expect(element(by.id('TransactionValue'))).toHaveText('0.0005');
    await element(by.id('TransactionDetailsButton')).tap();

    const txhex = await extractTextFromElementById('TxhexInput');

    const transaction = bitcoin.Transaction.fromHex(txhex);
    assert.ok(transaction.ins.length === 1);
    assert.strictEqual(transaction.outs.length, 2);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl'); // to address
    assert.strictEqual(transaction.outs[0].value, 50000);

    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    await helperDeleteWallet(expectedWalletLabel, '108880');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can discover wallet account and import it', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t6');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t6'), 'as it previously passed on Travis');
    }
    await device.launchApp({ newInstance: true });
    await yo('WalletsList');

    // enable AdvancedMode to see derivation path in wallet details
    await helperSwitchAdvancedMode();

    await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
    // going to Import Wallet screen and importing mnemonic
    await element(by.id('CreateAWallet')).tap();
    await element(by.id('ImportWallet')).tap();
    await element(by.id('MnemonicInput')).replaceText(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    await element(by.id('AskPassphrase')).tap();
    await element(by.id('SearchAccounts')).tap();
    await element(by.id('DoImport')).tap();
    await sleep(1000);

    // cancel import and start over
    await element(by.text('Cancel')).tap();
    await element(by.id('DoImport')).tap();
    await sleep(1000);
    await element(by.text('OK')).tap();
    await waitFor(element(by.id('Loading'))) // wait for discovery to be completed
      .not.toExist()
      .withTimeout(300 * 1000);

    await expect(element(by.text("m/44'/0'/1'"))).toBeVisible();
    await expect(element(by.text("m/49'/0'/0'"))).toBeVisible();
    await expect(element(by.text("m/84'/0'/0'"))).toBeVisible();

    // open custom derivation path screen and import the wallet
    await element(by.id('CustomDerivationPathButton')).tap();
    await element(by.id('DerivationPathInput')).replaceText("m/44'/0'/1'");
    await waitFor(element(by.text('found'))) // wait for discovery to be completed
      .toExist()
      .withTimeout(300 * 1000);
    await element(by.text('found')).tap();
    await element(by.id('ImportButton')).tap();
    await element(by.text('OK')).tap();

    // go to wallet and check derivation path
    await element(by.id('Imported HD Legacy (BIP44 P2PKH)')).tap();
    await element(by.id('WalletDetails')).tap();
    await expect(element(by.id('DerivationPath'))).toHaveText("m/44'/0'/1'");

    await device.pressBack();
    await device.pressBack();
    await helperDeleteWallet('Imported HD Legacy (BIP44 P2PKH)');
    await helperSwitchAdvancedMode();

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });
});
