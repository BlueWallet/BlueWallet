import assert from 'assert';
import { catalystSuite } from './suite';
import { importWallet, receive, receiveRequest, scanText } from './flows';
import {
  back,
  expectText,
  relaunch,
  scrollDownToId,
  tapButtonWithLabel,
  tapHeaderMenuItem,
  tapId,
  waitForId,
  waitForIdGone,
} from './driver';
import fixture from './fixtures/watch-only.json';

catalystSuite('Watch-only and hardware signing', test => {
  test('imports a zpub, derives the expected address and preserves the wallet', async driver => {
    await importWallet(driver, fixture.zpub, 'watchOnly', 'Imported Watch-only');
    await receive(driver);
    assert.strictEqual(await receiveRequest(driver), fixture.address);
    await relaunch(driver);
    await waitForId(driver, 'Imported Watch-only');
    await tapId(driver, 'Imported Watch-only');
    await tapId(driver, 'WalletDetails');
    await expectText(driver, 'WalletNameDisplay', 'Imported Watch-only');
  });
  test('imports unsigned UR PSBT and accepts a hardware-signed PSBT for review', async driver => {
    await importWallet(driver, fixture.zpub, 'watchOnly', 'Imported Watch-only');
    await tapId(driver, 'SendButton');
    await tapButtonWithLabel(driver, 'OK');
    await tapHeaderMenuItem(driver, 'Import Transaction (QR)');
    await scanText(driver, fixture.unsignedPsbt);
    await scrollDownToId(driver, 'PsbtWithHardwareScrollView', 'PsbtTxScanButton');
    await tapId(driver, 'PsbtTxScanButton');
    await scanText(driver, fixture.signedPsbt);
    await waitForIdGone(driver, 'ScanQrBackdoorButton');
    await waitForId(driver, 'PsbtWithHardwareWalletBroadcastTransactionButton');
    // Never broadcast the fixture transaction.
    await back(driver);
  });
});
