import {
  goBack,
  hashIt,
  helperDeleteWallet,
  helperImportWallet,
  safelyEnableSynchronization,
  scanText,
  scrollUpOnHomeScreen,
  sleep,
  waitForId,
  waitForKeyboardToClose,
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

    try {
      // in case notification popup appeared early and is blocking taps
      await element(by.text(`No, and do not ask me again.`)).tap();
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
    await safelyEnableSynchronization();

    // now lets test scanning back QR with UR PSBT. this should lead straight to broadcast dialog

    // Same race as the t1 AboutScrollView fix in bluewallet.spec.js: the
    // PSBT-with-hardware screen has not always mounted by the time
    // whileElement(...).scroll() runs.
    await waitFor(element(by.id('PsbtWithHardwareScrollView')))
      .toBeVisible()
      .withTimeout(15_000);
    await waitFor(element(by.id('PsbtTxScanButton')))
      .toBeVisible()
      .whileElement(by.id('PsbtWithHardwareScrollView'))
      .scroll(500, 'down');
    await element(by.id('PsbtTxScanButton')).tap(); // opening camera

    await scanText(signedPsbt);
    await safelyEnableSynchronization();
    await expect(element(by.id('ScanQrBackdoorButton'))).toBeNotVisible();
    await waitForId('PsbtWithHardwareWalletBroadcastTransactionButton');

    await goBack();
    await goBack();
    await goBack();
    await scrollUpOnHomeScreen(); // on the ios we need to scroll up to the wallet list

    await helperDeleteWallet('Imported Watch-only', '10000');

    process.env.CI && require('fs').writeFileSync(lockFile, '1');
  }, 480_000);
});
