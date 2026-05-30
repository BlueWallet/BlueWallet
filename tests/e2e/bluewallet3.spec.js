import {
  goBack,
  hashIt,
  helperDeleteWallet,
  helperImportWallet,
  scanText,
  scrollUpOnHomeScreen,
  sleep,
  waitForId,
  waitForKeyboardToClose,
  waitForText,
} from './helperz';

// if loglevel is set to `error`, this kind of logging will still get through
console.warn = console.log = (...args) => {
  let output = '';
  args.map(arg => (output += String(arg)));

  process.stdout.write('\n\t\t' + output + '\n');
};

describe('BlueWallet UI Tests - import Watch-only wallet (zpub)', () => {
  /**
   * test plan:
   * 1. import wallet
   * 2. wallet -> send -> import transaction (scan QR)
   * 3. provide unsigned psbt from coldcard (UR)
   * 4. on psbtWithHardwareWallet, tap scanQr
   * 5. provide fully signed psbt (UR)
   * 6. verify that we can see broadcast button and camera backdorr button is NOT visible
   */
  it('can import zpub as watch-only, import psbt, and then scan signed psbt', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t31');
    if (process.env.CI) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t31'), 'as it previously passed on Travis');
    }
    await device.clearKeychain();
    await device.launchApp({ delete: true, permissions: { notifications: 'YES', camera: 'YES' } });
    await helperImportWallet(
      // MNEMONICS_KEYSTONE
      'zpub6s2EvLxwvDpaHNVP5vfordTyi8cH1fR8usmEjz7RsSQjfTTGU2qA5VEcEyYYBxpZAyBarJoTraB4VRJKVz97Au9jRNYfLAeeHC5UnRZbz8Y',
      'watchOnly',
      'Imported Watch-only',
      '0.0001',
    );
    // wait for transactions to be loaded
    try {
      await waitFor(element(by.id('NoTransactionsMessage')))
        .not.toExist()
        .withTimeout(14_000);
      await sleep(1000);
    } catch (_) {}

    await element(by.id('ReceiveButton')).tap();
    await expect(element(by.id('BitcoinAddressQRCode'))).toBeVisible();
    await expect(element(by.label('bc1qgrhr5xc5774maph97d73ydrjlqqmg2v6jjlr29'))).toBeVisible();
    await element(by.id('SetCustomAmountButton')).tap();
    await element(by.id('BitcoinAmountInput')).replaceText('1');
    await element(by.id('CustomAmountDescription')).typeText('Test');
    await element(by.id('CustomAmountDescription')).tapReturnKey();
    await waitForKeyboardToClose();
    await element(by.id('CustomAmountSaveButton')).tap();
    await expect(element(by.id('CustomAmountDescriptionText'))).toHaveText('Test');
    await expect(element(by.id('BitcoinAmountText'))).toHaveText('1 BTC');

    await expect(element(by.id('BitcoinAddressQRCode'))).toBeVisible();

    await expect(element(by.label('bitcoin:BC1QGRHR5XC5774MAPH97D73YDRJLQQMG2V6JJLR29?amount=1&label=Test'))).toBeVisible();
    await goBack();
    await element(by.id('SendButton')).tap();
    await element(by.text('OK')).tap();

    await element(by.id('HeaderMenuButton')).tap();
    await element(by.text('Import Transaction (QR)')).tap(); // opens camera

    // produced by real Keystone device using MNEMONICS_KEYSTONE
    const unsignedPsbt =
      'UR:CRYPTO-PSBT/HDRNJOJKIDJYZMADAEGOAOAEAEAEADLFIAYKFPTOTIHSMNDLJTLFTYPAHTFHZESOAODIBNADFDCPFZZEKSSTTOJYKPRLJOAEAEAEAEAEZMZMZMZMADNBDSAEAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSAEAEAEAEAEADADCTBEDIAEAEAEAEAEAECMAEBBFTZSECYTJZTEKGOEKECAVOGHMTVWGYIAMHCSKOSWCPAMAXENRDWMCPOTZMHKGMFPNTHLMNDMCETOHLOXTANDAMEOTSURLFHHPLTSDPCSJTWSGACSRPLEYNVEGHAEAELAAEAEAELAAEAEAELAAEAEAEAEAEAEAEAEAEAEGETNJYFN';
    const signedPsbt =
      'UR:CRYPTO-PSBT/HDWTJOJKIDJYZMADAEGOAOAEAEAEADLFIAYKFPTOTIHSMNDLJTLFTYPAHTFHZESOAODIBNADFDCPFZZEKSSTTOJYKPRLJOAEAEAEAEAEZMZMZMZMADNBDSAEAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSAEAEAEAEAEADADCTBEDIAEAEAEAEAEAECMAEBBFTZSECYTJZTEKGOEKECAVOGHMTVWGYIAMHCSKOSWADAYJEAOFLDYFYAOCXGEUTDNBDTNMKTOQDLASKMTTSCLCSHPOLGDBEHDBBZMNERLRFSFIDLTMHTLMTLYWKAOCXFRBWHGOSGYRLYKTSSSSSIEWDZOVOSTFNISKTBYCLLRLRHSHFCMSGTTVDRHURNSOLADCLAXENRDWMCPOTZMHKGMFPNTHLMNDMCETOHLOXTANDAMEOTSURLFHHPLTSDPCSJTWSGAAEAEDLFPLTSW';

    await scanText(unsignedPsbt);

    // now lets test scanning back QR with UR PSBT. this should lead straight to broadcast dialog

    await waitFor(element(by.id('PsbtTxScanButton')))
      .toBeVisible()
      .whileElement(by.id('PsbtWithHardwareScrollView'))
      .scroll(500, 'down');
    await element(by.id('PsbtTxScanButton')).tap(); // opening camera

    await scanText(signedPsbt);
    await expect(element(by.id('ScanQrBackdoorButton'))).toBeNotVisible();
    await waitForId('PsbtWithHardwareWalletBroadcastTransactionButton');

    await goBack();
    await goBack();
    await goBack();
    await scrollUpOnHomeScreen(); // on the ios we need to scroll up to the wallet list

    await helperDeleteWallet('Imported Watch-only', '10000');

    process.env.CI && require('fs').writeFileSync(lockFile, '1');
  });

  it('can edit masterfingerprint of wath-only wallet', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t32');
    if (process.env.CI) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t32'), 'as it previously passed on Travis');
    }
    await device.clearKeychain();
    await device.launchApp({ delete: true, permissions: { notifications: 'YES', camera: 'YES' } });
    await helperImportWallet(
      // MNEMONICS_KEYSTONE
      'zpub6rgBMYrMz4hnVGjBRvd15kQuSbcKhB8rYG1oj7JU5mqTz5yXpErVzgp5kNfkLgu7c6YuBmD4HBYVnycfbwxqn21VUvELgHHUuWErMMJhs3P',
      'watchOnly',
      'Imported Watch-only',
      '0',
    );

    await waitForText('Imported Watch-only');
    await element(by.text('Imported Watch-only')).tap();

    await element(by.id('WalletDetails')).tap();

    await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 0.5);
    await sleep(500);

    await element(by.id('advanced-details')).tap();

    await element(by.id('viewMasterfingerprint')).tap();

    // should be 00000000 by default
    await expect(element(by.id('masterfingerPrintInput'))).toHaveText('00000000');

    await element(by.id('masterfingerPrintInput')).clearText();
    await element(by.id('masterfingerPrintInput')).typeText('ff8ade64');
    await element(by.id('masterfingerPrintInput')).tapReturnKey();

    // masterfingerprint should have been edited to ff8ade64
    await expect(element(by.id('masterfingerPrintInput'))).toHaveText('ff8ade64');

    await element(by.id('masterfingerPrintInput')).clearText();

    // invalid masterfingerprint structure should cause alert to be displayed
    await element(by.id('masterfingerPrintInput')).typeText('ff8ad');
    await element(by.id('masterfingerPrintInput')).tapReturnKey();

    await waitForText('Invalid Format');
    await element(by.text('OK')).tap();

    // binary format
    await element(by.id('masterfingerPrintInput')).clearText();
    await element(by.id('masterfingerPrintInput')).typeText('0d4287290980');
    await element(by.id('masterfingerPrintInput')).tapReturnKey();
    await expect(element(by.id('masterfingerPrintInput'))).toHaveText('ff8ade64');

    // decimal format
    await element(by.id('masterfingerPrintInput')).clearText();
    await element(by.id('masterfingerPrintInput')).typeText('0b11111111100010101101111001100100');
    await element(by.id('masterfingerPrintInput')).tapReturnKey();
    await expect(element(by.id('masterfingerPrintInput'))).toHaveText('ff8ade64');

    await goBack();

    await helperDeleteWallet('Imported Watch-only');
  });
});
