import assert from 'assert';
import { catalystSuite } from './suite';
import { backToWallets, deleteWallet, importWallet, openWallet, receive, receiveRequest, scanText } from './flows';
import {
  back,
  replaceAmount,
  replaceId,
  scrollDownToId,
  selectMenuItem,
  tapButtonWithLabel,
  tapHeaderMenuItem,
  tapId,
  waitForId,
  waitForIdGone,
} from './driver';

// MNEMONICS_KEYSTONE
const zpub = 'zpub6s2EvLxwvDpaHNVP5vfordTyi8cH1fR8usmEjz7RsSQjfTTGU2qA5VEcEyYYBxpZAyBarJoTraB4VRJKVz97Au9jRNYfLAeeHC5UnRZbz8Y';
const address = 'bc1qgrhr5xc5774maph97d73ydrjlqqmg2v6jjlr29';
const unsignedPsbt =
  'UR:CRYPTO-PSBT/HDRNJOJKIDJYZMADAEGOAOAEAEAEADLFIAYKFPTOTIHSMNDLJTLFTYPAHTFHZESOAODIBNADFDCPFZZEKSSTTOJYKPRLJOAEAEAEAEAEZMZMZMZMADNBDSAEAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSAEAEAEAEAEADADCTBEDIAEAEAEAEAEAECMAEBBFTZSECYTJZTEKGOEKECAVOGHMTVWGYIAMHCSKOSWCPAMAXENRDWMCPOTZMHKGMFPNTHLMNDMCETOHLOXTANDAMEOTSURLFHHPLTSDPCSJTWSGACSRPLEYNVEGHAEAELAAEAEAELAAEAEAELAAEAEAEAEAEAEAEAEAEAEGETNJYFN';
const signedPsbt =
  'UR:CRYPTO-PSBT/HDWTJOJKIDJYZMADAEGOAOAEAEAEADLFIAYKFPTOTIHSMNDLJTLFTYPAHTFHZESOAODIBNADFDCPFZZEKSSTTOJYKPRLJOAEAEAEAEAEZMZMZMZMADNBDSAEAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSAEAEAEAEAEADADCTBEDIAEAEAEAEAEAECMAEBBFTZSECYTJZTEKGOEKECAVOGHMTVWGYIAMHCSKOSWADAYJEAOFLDYFYAOCXGEUTDNBDTNMKTOQDLASKMTTSCLCSHPOLGDBEHDBBZMNERLRFSFIDLTMHTLMTLYWKAOCXFRBWHGOSGYRLYKTSSSSSIEWDZOVOSTFNISKTBYCLLRLRHSHFCMSGTTVDRHURNSOLADCLAXENRDWMCPOTZMHKGMFPNTHLMNDMCETOHLOXTANDAMEOTSURLFHHPLTSDPCSJTWSGAAEAEDLFPLTSW';

/**
 * test plan:
 * 1. import wallet
 * 2. wallet -> send -> import transaction (scan QR)
 * 3. provide unsigned psbt from coldcard (UR)
 * 4. on psbtWithHardwareWallet, tap scanQr
 * 5. provide fully signed psbt (UR)
 * 6. verify that we can see broadcast button and camera backdoor button is NOT visible
 */
catalystSuite('BlueWallet UI Tests - import Watch-only wallet (zpub)', test => {
  test(
    'can import zpub as watch-only, import psbt, and then scan signed psbt',
    async driver => {
      await importWallet(driver, zpub, 'watchOnly', 'Imported Watch-only', '0.0001');

      await receive(driver);
      assert.strictEqual(await receiveRequest(driver), address);
      await tapId(driver, 'ReceiveMoreOptionsButton');
      await tapId(driver, 'ReceiveWithAmountOption');
      await replaceAmount(driver, '1');
      await replaceId(driver, 'CustomAmountDescription', 'Test');
      await tapId(driver, 'CustomAmountSaveButton');
      // BitcoinAmountText and CustomAmountDescriptionText live inside the accessible ReceiveCard,
      // which Catalyst exposes as one Copy button; the copied BIP21 request carries both values.
      assert.strictEqual((await receiveRequest(driver)).toLowerCase(), `bitcoin:${address}?amount=1&label=test`);
      await backToWallets(driver);

      await openWallet(driver, 'Imported Watch-only');
      // Watch-only wallets confirm the offline-signing notice before the Send screen opens.
      await selectMenuItem(driver, 'File', 'Send');
      await tapButtonWithLabel(driver, 'OK');
      await waitForId(driver, 'AddressInput');
      await tapHeaderMenuItem(driver, 'Import Transaction (QR)');
      await scanText(driver, unsignedPsbt);

      // scanning back the signed UR PSBT leads straight to the broadcast dialog
      await scrollDownToId(driver, 'PsbtWithHardwareScrollView', 'PsbtTxScanButton');
      await tapId(driver, 'PsbtTxScanButton');
      await scanText(driver, signedPsbt);
      await waitForIdGone(driver, 'ScanQrBackdoorButton');
      await waitForId(driver, 'PsbtWithHardwareWalletBroadcastTransactionButton');

      // Never broadcast the fixture transaction.
      await back(driver);
      await back(driver);
      await backToWallets(driver);
      await deleteWallet(driver, 'Imported Watch-only', '10000');
    },
    35 * 60_000, // over 18 minutes on a slow hosted runner (39120343394)
  );
});
