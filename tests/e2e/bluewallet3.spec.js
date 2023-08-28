import { helperDeleteWallet, sleep, hashIt, sup, helperImportWallet, yo } from './helperz';

beforeAll(async () => {
  // reinstalling the app just for any case to clean up app's storage
  await device.launchApp({ delete: true });
}, 300_000);

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
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t31'), 'as it previously passed on Travis');
    }
    await device.launchApp({ newInstance: true });
    await helperImportWallet(
      // MNEMONICS_KEYSTONE
      'zpub6s2EvLxwvDpaHNVP5vfordTyi8cH1fR8usmEjz7RsSQjfTTGU2qA5VEcEyYYBxpZAyBarJoTraB4VRJKVz97Au9jRNYfLAeeHC5UnRZbz8Y',
      'watchOnly',
      'Imported Watch-only',
      '0.0001 BTC',
    );
    await sleep(15000);

    await element(by.id('ReceiveButton')).tap();
    try {
      // in case emulator has no google services and doesnt support pushes
      // we just dont show this popup
      await element(by.text(`No, and don’t ask me again`)).tap();
    } catch (_) {}
    await expect(element(by.id('BitcoinAddressQRCodeContainer'))).toBeVisible();
    await expect(element(by.text('bc1qc8wun6lf9vcajpddtgdpd2pdrp0kwp29j6upgv'))).toBeVisible();
    await element(by.id('SetCustomAmountButton')).tap();
    await element(by.id('BitcoinAmountInput')).replaceText('1');
    await element(by.id('CustomAmountDescription')).typeText('Test');
    await element(by.id('CustomAmountSaveButton')).tap();
    await sup('1 BTC');
    await sup('Test');
    await expect(element(by.id('BitcoinAddressQRCodeContainer'))).toBeVisible();

    await expect(element(by.text('bitcoin:bc1qc8wun6lf9vcajpddtgdpd2pdrp0kwp29j6upgv?amount=1&label=Test'))).toBeVisible();
    await device.pressBack();

    await element(by.id('SendButton')).tap();
    await element(by.text('OK')).tap();

    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('ImportQrTransactionButton')).tap(); // opens camera

    // produced by real Keystone device using MNEMONICS_KEYSTONE
    const unsignedPsbt =
      'UR:CRYPTO-PSBT/HDRNJOJKIDJYZMADAEGOAOAEAEAEADLFIAYKFPTOTIHSMNDLJTLFTYPAHTFHZESOAODIBNADFDCPFZZEKSSTTOJYKPRLJOAEAEAEAEAEZMZMZMZMADNBDSAEAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSAEAEAEAEAEADADCTBEDIAEAEAEAEAEAECMAEBBFTZSECYTJZTEKGOEKECAVOGHMTVWGYIAMHCSKOSWCPAMAXENRDWMCPOTZMHKGMFPNTHLMNDMCETOHLOXTANDAMEOTSURLFHHPLTSDPCSJTWSGACSRPLEYNVEGHAEAELAAEAEAELAAEAEAELAAEAEAEAEAEAEAEAEAEAEGETNJYFN';
    const signedPsbt =
      'UR:CRYPTO-PSBT/HDWTJOJKIDJYZMADAEGOAOAEAEAEADLFIAYKFPTOTIHSMNDLJTLFTYPAHTFHZESOAODIBNADFDCPFZZEKSSTTOJYKPRLJOAEAEAEAEAEZMZMZMZMADNBDSAEAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSAEAEAEAEAEADADCTBEDIAEAEAEAEAEAECMAEBBFTZSECYTJZTEKGOEKECAVOGHMTVWGYIAMHCSKOSWADAYJEAOFLDYFYAOCXGEUTDNBDTNMKTOQDLASKMTTSCLCSHPOLGDBEHDBBZMNERLRFSFIDLTMHTLMTLYWKAOCXFRBWHGOSGYRLYKTSSSSSIEWDZOVOSTFNISKTBYCLLRLRHSHFCMSGTTVDRHURNSOLADCLAXENRDWMCPOTZMHKGMFPNTHLMNDMCETOHLOXTANDAMEOTSURLFHHPLTSDPCSJTWSGAAEAEDLFPLTSW';

    // tapping 5 times invisible button is a backdoor:
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
      await sleep(1000);
    }

    await element(by.id('scanQrBackdoorInput')).replaceText(unsignedPsbt);
    await element(by.id('scanQrBackdoorOkButton')).tap();

    // now lets test scanning back QR with UR PSBT. this should lead straight to broadcast dialog

    await element(by.id('PsbtWithHardwareScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await element(by.id('PsbtTxScanButton')).tap(); // opening camera

    // tapping 5 times invisible button is a backdoor:
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
      await sleep(1000);
    }

    await element(by.id('scanQrBackdoorInput')).replaceText(signedPsbt);
    await element(by.id('scanQrBackdoorOkButton')).tap();
    await expect(element(by.id('ScanQrBackdoorButton'))).toBeNotVisible();
    await yo('PsbtWithHardwareWalletBroadcastTransactionButton');

    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    await helperDeleteWallet('Imported Watch-only', '10000');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });
});
