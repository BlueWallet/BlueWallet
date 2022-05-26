import { helperDeleteWallet, sleep, hashIt, sup, helperImportWallet, yo } from './helperz';

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
    await helperImportWallet(
      'zpub6rDWXE4wbwefeCrHWehXJheXnti5F9PbpamDUeB5eFbqaY89x3jq86JADBuXpnJnSvRVwqkaTnyMaZERUg4BpxD9V4tSZfKeYh1ozPdL1xK',
      'watchOnly',
      'Imported Watch-only',
      '0 BTC', // it used to be 0.00030666 till someone stole it from git history kek
    );

    await element(by.id('ReceiveButton')).tap();
    try {
      // in case emulator has no google services and doesnt support pushes
      // we just dont show this popup
      await element(by.text(`No, and don’t ask me again`)).tap();
    } catch (_) {}
    await expect(element(by.id('BitcoinAddressQRCodeContainer'))).toBeVisible();
    await expect(element(by.text('bc1qtc9zquvq7lgq87kzsgltvv4etwm9uxphfkvkay'))).toBeVisible();
    await element(by.id('SetCustomAmountButton')).tap();
    await element(by.id('BitcoinAmountInput')).replaceText('1');
    await element(by.id('CustomAmountDescription')).typeText('Test');
    await element(by.id('CustomAmountSaveButton')).tap();
    await sup('1 BTC');
    await sup('Test');
    await expect(element(by.id('BitcoinAddressQRCodeContainer'))).toBeVisible();

    await expect(element(by.text('bitcoin:bc1qtc9zquvq7lgq87kzsgltvv4etwm9uxphfkvkay?amount=1&label=Test'))).toBeVisible();
    await device.pressBack();

    await element(by.id('SendButton')).tap();
    await element(by.text('OK')).tap();

    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('ImportQrTransactionButton')).tap(); // opens camera

    const unsignedPsbt =
      'ur:bytes/tzahqumzwnlszqzjqgqqqqqp6uu247pvcz6zld9p77ghlnl753q8fgygggzv9ugjxsmggyy5gqcqqqqqqqq0llllluqepssqqqqqqqqqzcqpfkxmzh6ud2yrvcl37uyy9yswr2z4mx276qqqqqqqqqgpragvxqqqqqqqqqqkqq2tgxjzwa0000egemyzygsv92j2zdwvg5ejypszwe3qctjvrwul6t2ts7yhk8e5takxwzey2z70kdnykwd43jsptrzps95d6cp4gqqqsqqqqqyqqqqqpqqqqqqqqpqqqqqqqqq0vr0lj';
    const signedPsbt =
      'ur:bytes/tyqjuurnvf607qgq2gpqqqqqq8tn32hc9nqtgta558mezl70l6jyqa9q3ppqfsh3zg6rdpqsj3qrqqqqqqqqpllllllsryxzqqqqqqqqqqtqq9xcmv2lt34gsdnr78msss5jpcdg2hvetmgqqqqqqqqpqy04pscqqqqqqqqqzcqpfdq6gfm4aaal9r8vsg3zps42fgf4e3znxgszqfmxyrpwfsdmnlfdfwrcj7clx30kcecty3gte7ekvjeekkx2q9vvgjpsg5pzzqxjc9xv3rlhu2n6u87pm94agwcmvcywwsx9k0jpvwyng8crytgrkcpzqae6amp5xy03x2lsklv5zgnmeht0grzns27tmsjtsg2j0ne2969kqyqsxpqpqqqqqgsxqfmxyrpwfsdmnlfdfwrcj7clx30kcecty3gte7ekvjeekkx2q9vvgxqk3htqx4qqqzqqqqqqsqqqqqyqqqqqqqqyqqqqqqqqear8ke';

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
    await helperDeleteWallet('Imported Watch-only');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });
});
