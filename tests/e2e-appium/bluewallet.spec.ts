import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Psbt, Transaction, address as bitcoinAddress } from 'bitcoinjs-lib';
import { catalystSuite, step } from './suite';
import {
  createWallet,
  deleteWallet,
  openWallet,
  receive,
  receiveRequest,
  scanText,
  scanUrParts,
  send,
  setCustomFeeRate,
  walletDetails,
} from './flows';
import {
  COMMAND,
  SHIFT,
  back,
  getText,
  openSettings,
  pressKey,
  readSeed,
  relaunch,
  replaceAmount,
  replaceId,
  scrollDownToId,
  rowPredicate,
  scrollDownToText,
  selectMenuItem,
  tapAndWaitForId,
  tapButtonWithLabel,
  tapHeaderMenuItem,
  tapId,
  tapText,
  waitForId,
  waitForIdGone,
  waitForText,
} from './driver';
import type { Driver } from './driver';

const multisigSetupUr = [
  'UR:BYTES/1-3/LPADAXCFADRFCYFTCKECHSHDMWHKADRHCNCXFWJZKPIHHGHSJZJZIHJYCXGTKPJZJYINJKINIOCXJKIHJYKPJOCXIYINJZIHBKCNCXJYISINJKCXIYINJZIHCXIAJLJTJYHSINJTJKCXJLJTJZKKCXJOKPIDJZINIACXJEIHKKJKCXHSJTIECXINJKCXJKHSIYIHCXJYJLBKCNCXIEINJKJYJPINIDKPJYIHCXHSJNJLJTIOCXIAJLJKINIOJTIHJPJKBKCNBKGLHSJNIHFTCXGTKPJZJYINJKINIOCXHFHSKPJZJYBKGDJLJZINIAKKFTCLFMLUMD',
  'UR:BYTES/2-3/LPAOAXCFADRFCYFTCKECHSHDMWCXEYCXJLIYCXEYBKFYIHJPINKOHSJYINJLJTFTCXJNDLEEETDIDLDYDIDLDYDIDLEYDIBKFGJLJPJNHSJYFTCXGDEYHGGUFDBKBKFYEOEMFEFPFYETETFTCXHTJOKPIDEMEEINIMJOIYISFEGMGEGLIMISFXGRHDGMJKJOGHIEGSGEHFECIHJLFEJNGUGMHTIEFDJSFYKOJOESJEHFJYIEHFFEKKINHDJEEMJOHDKSGMIDIYHTKNGYKOJKFYFGJOIYFYFDFEFDHFJYHFJOKSEEFYKNESFYFLGOHGFLJTFWTDCLAY',
  'UR:BYTES/3-3/LPAXAXCFADRFCYFTCKECHSHDMWEYHDJEECKNFLECKPEEECGYGHGTJKHKGUEYKOIMJLISGLGYBKBKFWENETFPFGENFEEEFTCXHTJOKPIDEMEEKTESIEIYJLIHKPJPGRJPGRHDFEEOGUGDGMJOFGJSKPGSGDGHJEINFXKPGUKTFLKPISFYKNFWIOIDFEEEEYKTECGUISFWEYFGKSGTIMJNGEKKIMHTJOGUGEENHGISGSJYETKKEHGDIHFGFDGYFEGSFLIOJSEYFLJNJEJYKOINFGFYFDETKKFGHGHKGMHGIOEEKSGYINKTEOKOEOEOECBKBKVAZEGAZT',
];
const multisigPartiallySignedUr = [
  'UR:CRYPTO-PSBT/1-7/LPADATCFAACWCYTKONBWRDHDMSHKAACSJOJKIDJYZMADAEKIAOAEAEAEADRPTPTKQZZCHLWETSSPSPRLEHGYDALGOYBKZECLTNRHADJNGDWEENDISWKPAMHLPRAEAEAEAEAEZMZMZMZMAOLOBWAEAEAEAEAEAECMAEBBKBOTLPWFGMRNINIMPFYNWLGEBAVTVLSWTYPAGEGUJNBEAEAEAEAEAEAECPAECXMUJNYTGMWKKOSNSNAHLESWBGKSSOMHCEBZCMNTYKCKJNJNGOCWWTGSYTNBGOZSCFAEAEAEAEAEADAEZCHLADAOAEAEAEAEADADJSBWWKCLJKKN',
  'UR:CRYPTO-PSBT/2-7/LPAOATCFAACWCYTKONBWRDHDMSFEGUSKURLYTOISPKFHURYKOEOYGRGYCNWNADVYTNONDRMNAYLFWYTNHHGAPEAEAEAEAEAEZMZMZMZMADCADSAEAEAEAEAEAECPAECXEEESLTRDCFZSAACWBKLANDTTBEOXBWVYBALFYKRSIESWIYFXFGKSKKIAZEKGNDDIAAAEFDDYFEAOCLAETERHIAPRJTDYLAWMKOONLRSPRNYLCEJTIYUTOTCLRYVOGWKBLSRTIHDYCSHPSEEOAOCXHNKGAHVWISWKKGLUAODAVDKTMDHKHHKNGRPTNLCMIAKPHFHDJNLFCTIHDTFR',
  'UR:CRYPTO-PSBT/3-7/LPAXATCFAACWCYTKONBWRDHDMSLAGYIDGHTBFHADFLDYFYAOCXESBADSBSLPNEWFGRMKVEFYAEBWJPFPKGRYPYBYHEHNVEGYKEBSGSZMLEFWZMZMPTAOCXGLRHRKDPGDLFBGAXLYZTVTASWFGYKSLSOLRETOVETPDMCAPLHDOLPRENMSONOXSKADINGMCLAOPAKSGTGHBBBTBSFMLFURMDFXJYLTVTHECSWEMHMDKBYNYATTFYSGHLKIPFRTLUNECLAOTTSPGSPRPFWYCNRNMKYKVOKILNUYLEPKVECXDEIHVSWNTTGSGYVLEMUYJELADMNSCLAXSKSBIYTE',
  'UR:CRYPTO-PSBT/4-7/LPAAATCFAACWCYTKONBWRDHDMSPMPSPFHYIHGAROMWLEESGTCTPAMUKNCSSSMTBWTTOXHHTSMNAEJTNBZCMKDEUEBNGUPLAEAEAEAEADADDNCADSAEAEAEAEAEAECPAECXEEESLTRDCFZSAACWBKLANDTTBEOXBWVYBALFYKRSIESWIYFXFGKSKKIAZEKGNDDICPAOAXHEMTHSKITSMYGYHLYLCSKBBAMKZEKOWFFZSTIDNYDRDTDNYNIHTLTTVADKVADILTFLDYFYAOCXFHSKIOHPLARTBBWKTKJOJKVTTYKBLRBZDPEOYLDYMNOTJZKKKETKTPESBGASTL',
  'UR:CRYPTO-PSBT/5-7/LPAHATCFAACWCYTKONBWRDHDMSKEHLVYFYMTAOCXJLTIGLVACWIHSWCPWDDAMUJPEHVAHPCYPYLKDISAZEFNHSBWASLRJPBTETPDEMQDADADAHFLGMCLAXHEMTHSKITSMYGYHLYLCSKBBAMKZEKOWFFZSTIDNYDRDTDNYNIHTLTTVADKVADILTCLAXNDBZLDPMFXDMEOPTPSBGJNASSWFLGRDPWZLKEEDSEENLDTSNPKJSEMFZPAPAJKHPGMPLCPAMAXHEMTHSKITSMYGYHLYLCSKBBAMKZEKOWFFZSTIDNYDRDTDNYNIHTLTTVADKVADILTCERPPTMYYLWF',
  'UR:CRYPTO-PSBT/6-7/LPAMATCFAACWCYTKONBWRDHDMSLEYNVEDYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAOAEAEAECPAMAXNDBZLDPMFXDMEOPTPSBGJNASSWFLGRDPWZLKEEDSEENLDTSNPKJSEMFZPAPAJKHPCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAOAEAEAEAEAEADADFLGMCLAOCKEOCAFLHHOTMWHDECOYVWUEAHWNSAWFAMMOCPGLBDSWPFGYNTSTCADKKPGOVTGRCLAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYPLURMNPK',
  'UR:CRYPTO-PSBT/7-7/LPATATCFAACWCYTKONBWRDHDMSWZAMFSNLZSYLHGDKDWAYKBFYZTECGMPLCPAOAOCKEOCAFLHHOTMWHDECOYVWUEAHWNSAWFAMMOCPGLBDSWPFGYNTSTCADKKPGOVTGRCERPLEYNVEDYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAECPAOAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAEAEAEAEAEAEAEAEVTTNVLIN',
];
const multisigSignedUr = [
  'UR:CRYPTO-PSBT/1-7/LPADATCFAALNCYHSGHLRKNHDOLHKAALSJOJKIDJYZMADAEKIAOAEAEAEADRPTPTKQZZCHLWETSSPSPRLEHGYDALGOYBKZECLTNRHADJNGDWEENDISWKPAMHLPRAEAEAEAEAEZMZMZMZMAOLOBWAEAEAEAEAEAECMAEBBKBOTLPWFGMRNINIMPFYNWLGEBAVTVLSWTYPAGEGUJNBEAEAEAEAEAEAECPAECXMUJNYTGMWKKOSNSNAHLESWBGKSSOMHCEBZCMNTYKCKJNJNGOCWWTGSYTNBGOZSCFAEAEAEAEAEADAEZCHLADAOAEAEAEAEADADJSBWFEGUSKURLYTOISPKFHURYKOEOYGRGYIHPKIDFP',
  'UR:CRYPTO-PSBT/2-7/LPAOATCFAALNCYHSGHLRKNHDOLCNWNADVYTNONDRMNAYLFWYTNHHGAPEAEAEAEAEAEZMZMZMZMADCADSAEAEAEAEAEAECPAECXEEESLTRDCFZSAACWBKLANDTTBEOXBWVYBALFYKRSIESWIYFXFGKSKKIAZEKGNDDIAAAEFDDYFEAOCLAETERHIAPRJTDYLAWMKOONLRSPRNYLCEJTIYUTOTCLRYVOGWKBLSRTIHDYCSHPSEEOAOCXHNKGAHVWISWKKGLUAODAVDKTMDHKHHKNGRPTNLCMIAKPHFHDJNLFLAGYIDGHTBFHADFLDYFYAOCXESBADSBSLPNEWFGRMKVEFYAEBWJPFPKGRYPYZEAXEEYT',
  'UR:CRYPTO-PSBT/3-7/LPAXATCFAALNCYHSGHLRKNHDOLBYHEHNVEGYKEBSGSZMLEFWZMZMPTAOCXGLRHRKDPGDLFBGAXLYZTVTASWFGYKSLSOLRETOVETPDMCAPLHDOLPRENMSONOXSKADINGMCLAOPAKSGTGHBBBTBSFMLFURMDFXJYLTVTHECSWEMHMDKBYNYATTFYSGHLKIPFRTLUNECLAOTTSPGSPRPFWYCNRNMKYKVOKILNUYLEPKVECXDEIHVSWNTTGSGYVLEMUYJELADMNSCLAXPMPSPFHYIHGAROMWLEESGTCTPAMUKNCSSSMTBWTTOXHHTSMNAEJTNBZCMKDEUEBNGUPLAEAEAEAEADADDNCADSAEAEMWUTLGGA',
  'UR:CRYPTO-PSBT/4-7/LPAAATCFAALNCYHSGHLRKNHDOLAEAEAEAECPAECXEEESLTRDCFZSAACWBKLANDTTBEOXBWVYBALFYKRSIESWIYFXFGKSKKIAZEKGNDDICPAOAXHEMTHSKITSMYGYHLYLCSKBBAMKZEKOWFFZSTIDNYDRDTDNYNIHTLTTVADKVADILTFLDYFYAOCXFHSKIOHPLARTBBWKTKJOJKVTTYKBLRBZDPEOYLDYMNOTJZKKKETKTPKEHLVYFYMTAOCXJLTIGLVACWIHSWCPWDDAMUJPEHVAHPCYPYLKDISAZEFNHSBWASLRJPBTETPDEMQDADCPAOAXNDBZLDPMFXDMEOPTPSBGJNASSWFLGRDPWZDKJYYTJK',
  'UR:CRYPTO-PSBT/5-7/LPAHATCFAALNCYHSGHLRKNHDOLLKEEDSEENLDTSNPKJSEMFZPAPAJKHPFLDYFYAOCXFTOLMHWSCYLPSEKNWDSOIMMOVOURJEBGOYBNLKLGPEYKSEWNADOEFSMUFHPRDMZTAOCXEHEEAAHPPSCFHPPTIDZMDLVORSWEZEKTDKQDFWRKLSGMHYYLBESBBZESRNKOPDATADADAHFLGMCLAXHEMTHSKITSMYGYHLYLCSKBBAMKZEKOWFFZSTIDNYDRDTDNYNIHTLTTVADKVADILTCLAXNDBZLDPMFXDMEOPTPSBGJNASSWFLGRDPWZLKEEDSEENLDTSNPKJSEMFZPAPAJKHPGMPLCPAMAXHEMTNNNEJEGD',
  'UR:CRYPTO-PSBT/6-7/LPAMATCFAALNCYHSGHLRKNHDOLHSKITSMYGYHLYLCSKBBAMKZEKOWFFZSTIDNYDRDTDNYNIHTLTTVADKVADILTCERPLEYNVEDYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAOAEAEAECPAMAXNDBZLDPMFXDMEOPTPSBGJNASSWFLGRDPWZLKEEDSEENLDTSNPKJSEMFZPAPAJKHPCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAAEAEAEAEAOAEAEAEAEAEADADFLGMCLAOCKEOCAFLHHOTMWHDECOYVWUEAHWNSAWFAMMOCPGLBDSWPFGYNTSTCADKKPGOVTGRCLAXCSLALDVELE',
  'UR:CRYPTO-PSBT/7-7/LPATATCFAALNCYHSGHLRKNHDOLMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECGMPLCPAOAOCKEOCAFLHHOTMWHDECOYVWUEAHWNSAWFAMMOCPGLBDSWPFGYNTSTCADKKPGOVTGRCERPLEYNVEDYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAECPAOAXCSMYGWCMSGFWBTIENEOTRHHDFTVTLYTASNUYWZAMFSNLZSYLHGDKDWAYKBFYZTECCETEKBPMLODYAEAELAAEAEAELAAEAEAELAAOAEAELAADAEAEAEAEAEAEAEAEAEAEAEAEWSEOCLBB',
];
const multisigUnsignedPsbt =
  'cHNidP8BAH0CAAAAAbbYz7T9Xe3XyMi3MVEljaEK/iHauQFtUO02J8Z1Bl2yAAAAAAD/////AogTAAAAAAAAFgAUfqOF81K+aWqw9ulKDuDjxtSxSlNtEAAAAAAAACIAIJNt+VL0ds3NBYrGEnjJkBwVFp31Hm1tVRvwTPmgVfoZAAAAAAABAP1dAQIAAAAAAQFxE0VTxd+BzmiqP9/1oqFLUSPxAeHapSqOCILu2lxJrwAAAAAA/////wEdJgAAAAAAACIAIDQ5h7oZ+gQbCoCb0RCkE+EOgvW/ZMZmQ0Z4eWP+e5snBABIMEUCIQDTuWOybjCA63alhMi+9xxuZt2jIb3iT36DwGUwGFvBMwIgYHsF5Wj0e4sCJed3lVlcekupmRZjdVZYbYKAUWJU1j8BRzBEAiA5DiYPhZ/zS5jkRAATckF7vasRX2DkUXwPTP+KQv//qQIgTrm7LVCCEgOB/OAJ81F4g6a1zuTYLh2uWKayNpelpMUBaVIhArF4TVQUDQ8+gt+VQ3SH4F8Y7ZCVfvb40UTKXX2wwIufIQLRyEyysO4jvpj14n2G24qq5CAoZejx0UxR4zfba4AunCEDraywXmVJuJSKOU0fsZN6GMSWE9GkXNeOAG6g/Zgo3gxTrgAAAAABASsdJgAAAAAAACIAIDQ5h7oZ+gQbCoCb0RCkE+EOgvW/ZMZmQ0Z4eWP+e5snAQVHUiEDX5ZhfdePUV33GH4OmP5280DHYpoqKSv2ZdXR5iTmJ4chA5sVia1DLjOprBJtCcZHSy3yjDQmNJkpzapxN0CxsXNbUq4iBgNflmF9149RXfcYfg6Y/nbzQMdimiopK/Zl1dHmJOYnhxy2ivbkMAAAgAAAAIAAAACAAgAAgAAAAAACAAAAIgYDmxWJrUMuM6msEm0JxkdLLfKMNCY0mSnNqnE3QLGxc1sc036tiDAAAIAAAACAAAAAgAIAAIAAAAAAAgAAAAAAAQFHUiECHjMdR1yjlFg1oeXeBfHC8waSIk4LxrBRnccdJHVV4EshAxiPTxbKQg1kn6O5WDrggdnN2/IGPZn691ckLAh+RPw1Uq4iAgIeMx1HXKOUWDWh5d4F8cLzBpIiTgvGsFGdxx0kdVXgSxy2ivbkMAAAgAAAAIAAAACAAgAAgAEAAAAAAAAAIgIDGI9PFspCDWSfo7lYOuCB2c3b8gY9mfr3VyQsCH5E/DUc036tiDAAAIAAAACAAAAAgAIAAIABAAAAAAAAAAA=';

const ZOO = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
const recipient = 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl';

const row = (driver: Driver, title: string) => driver.$(`-ios predicate string:${rowPredicate(title)}`);
const openAdvanced = async (driver: Driver) => {
  await scrollDownToText(driver, 'WalletDetailsScroll', 'Advanced', 'row');
  await row(driver, 'Advanced').click();
};
const longPress = async (driver: Driver, id: string) => {
  const element = await waitForId(driver, id);
  // Holding and releasing at the same element is a native mouse long press.
  await driver.execute('macos: clickAndDrag', { sourceElementId: element.elementId, destinationElementId: element.elementId, duration: 1 });
};
// The sidebar shows the same wallet cards, so scope a pick to the selector list.
const pickWallet = async (driver: Driver, label: string) => {
  const list = await waitForId(driver, 'SelectWalletsList');
  const card = list.$(`~${label}`);
  await card.waitForExist({ timeout: 30_000 });
  await card.click();
};
const encrypt = async (driver: Driver, password: string, confirmation = password) => {
  await openSettings(driver);
  await tapId(driver, 'SecurityButton');
  await tapId(driver, 'EncyptedAndPasswordProtectedSwitch');
  await tapId(driver, 'IUnderstandButton');
  await replaceId(driver, 'PasswordInput', password);
  await replaceId(driver, 'ConfirmPasswordInput', confirmation);
  await tapId(driver, 'OKButton');
};
const createFakeStorage = async (driver: Driver, password: string, confirmation = password) => {
  await tapId(driver, 'CreateFakeStorageButton');
  await replaceId(driver, 'PasswordInput', password);
  await replaceId(driver, 'ConfirmPasswordInput', confirmation);
  await tapId(driver, 'OKButton');
};
const unlock = async (driver: Driver, password: string) => {
  await relaunch(driver, { locked: true });
  await replaceId(driver, 'PasswordInput', password);
  await pressKey(driver, 'XCUIKeyboardKeyReturn');
};
const decrypt = async (driver: Driver, password: string) => {
  await openSettings(driver);
  await tapId(driver, 'SecurityButton');
  await tapId(driver, 'EncyptedAndPasswordProtectedSwitch');
  await tapButtonWithLabel(driver, 'OK');
  await replaceId(driver, 'PasswordInput', password);
  await tapId(driver, 'OKButton');
};

// Public Electrum servers answer slowly on hosted CI, and a slow runner makes every XCTest
// query take seconds (39120343394).
const CASE_TIMEOUT = 35 * 60_000;

catalystSuite('BlueWallet UI Tests - no wallets', test => {
  test('selftest passes', async driver => {
    await openSettings(driver);
    await scrollDownToId(driver, 'SettingsRoot', 'AboutButton');
    await tapId(driver, 'AboutButton');
    await scrollDownToId(driver, 'AboutScrollView', 'RunSelfTestButton');
    await tapAndWaitForId(driver, 'RunSelfTestButton', 'SelfTestLoading');
    await tapId(driver, 'SelfTestLoading');
    await driver.waitUntil(async () => (await driver.$('~SelfTestOk').isExisting()) || (await driver.$('~SelfTestError').isExisting()), {
      timeout: 300_000,
      timeoutMsg: 'Self-test did not finish',
    });
    if (await driver.$('~SelfTestError').isExisting()) throw new Error(await getText(driver, 'SelfTestError'));
    await waitForId(driver, 'SelfTestOk');
  });

  test(
    'all settings screens work',
    async driver => {
      await openSettings(driver);
      await tapId(driver, 'GeneralSettings');
      await waitForId(driver, 'GeneralSettingsScreen');
      for (const id of ['ClipboardSwitch']) {
        const previous = await getText(driver, id);
        await tapId(driver, id);
        await driver.waitUntil(async () => (await getText(driver, id)) !== previous, { timeout: 10_000 });
        await tapId(driver, id);
        await driver.waitUntil(async () => (await getText(driver, id)) === previous, { timeout: 10_000 });
      }
      await back(driver);

      // currency: ARS (Yadio) and back to USD
      await tapId(driver, 'Currency');
      await row(driver, 'ARS ($)').waitForExist({ timeout: 30_000 });
      await row(driver, 'ARS ($)').click();
      await waitForText(driver, 'Rate is obtained from Yadio');
      await row(driver, 'USD ($)').waitForExist({ timeout: 30_000 });
      await row(driver, 'USD ($)').click();
      await back(driver);

      // language: Afrikaans and back to English
      await tapId(driver, 'Language');
      await tapText(driver, 'Afrikaans (AFR)');
      await back(driver);
      await driver.waitUntil(async () => (await getText(driver, 'Language')).includes('Taal'), { timeout: 30_000 });
      await tapId(driver, 'Language');
      await tapText(driver, 'English');
      await back(driver);
      await driver.waitUntil(async () => (await getText(driver, 'Language')).includes('Language'), { timeout: 30_000 });

      // security
      await tapId(driver, 'SecurityButton');
      await waitForId(driver, 'EncyptedAndPasswordProtectedSwitch');
      await back(driver);

      // network -> electrum server fields; editing the server is Android-only in Detox
      await tapId(driver, 'NetworkSettings');
      await waitForId(driver, 'ElectrumSettings');
      await tapId(driver, 'ElectrumSettings');
      await waitForId(driver, 'PortInput');
      await waitForId(driver, 'SSLPortInput');
      await back(driver);
      if (await driver.$('~NotificationSettings').isExisting()) {
        await tapId(driver, 'NotificationSettings');
        await waitForId(driver, 'NotificationsSwitch');
        await back(driver);
      }
      await back(driver);

      // tools -> broadcast an invalid transaction; the public server rejects it
      await tapId(driver, 'Tools');
      await tapId(driver, 'Broadcast');
      await replaceId(driver, 'TxHex', 'invalid');
      await tapId(driver, 'BroadcastButton');
      await tapButtonWithLabel(driver, 'OK', 60_000);
      await waitForText(driver, 'invalid');
      await back(driver);

      // tools -> is it my address
      await tapId(driver, 'IsItMyAddress');
      await replaceId(driver, 'AddressInput', recipient);
      await tapId(driver, 'CheckAddress');
      await waitForText(driver, 'None of the available wallets own the provided address.');
      await tapButtonWithLabel(driver, 'OK');
      await back(driver);
      await back(driver);

      // about
      await scrollDownToId(driver, 'SettingsRoot', 'AboutButton');
      await tapId(driver, 'AboutButton');
      await waitForId(driver, 'AboutScrollView');
    },
    CASE_TIMEOUT,
  );

  test(
    'can create wallet, reload app and it persists. then go to receive screen, set custom amount with a BIP21 label and a per-address label that persists across restarts. Dismiss modal and go to WalletsList.',
    async driver => {
      await createWallet(driver);
      await relaunch(driver);
      await openWallet(driver);
      await receive(driver, true);
      const address = await receiveRequest(driver);
      await tapId(driver, 'ReceiveMoreOptionsButton');
      await tapId(driver, 'ReceiveWithAmountOption');
      await replaceAmount(driver, '1');
      await replaceId(driver, 'CustomAmountDescription', 'test');
      await tapId(driver, 'CustomAmountSaveButton');
      // The amount and label texts sit inside the accessible ReceiveCard (one Copy button on
      // Catalyst); the copied BIP21 request below carries both values.
      const request = new URL(await receiveRequest(driver));
      assert.strictEqual(request.pathname.toLowerCase(), address.toLowerCase());
      assert.strictEqual(request.searchParams.get('amount'), '1');
      assert.strictEqual(request.searchParams.get('label'), 'test');

      // per-address label
      await tapId(driver, 'ReceiveMoreOptionsButton');
      await tapId(driver, 'AddressLabelOption');
      await replaceId(driver, 'AddressLabelInput', 'my recv label');
      await tapId(driver, 'AddressLabelSaveButton');
      assert.ok((await getText(driver, 'ReceiveAddressLabel')).includes('my recv label'));

      // Manage Wallets opens on long press; swipe-to-hide has no mouse equivalent on macOS.
      await relaunch(driver);
      await longPress(driver, 'cr34t3d');
      await waitForId(driver, 'NavigationCloseButton');
      await waitForId(driver, 'cr34t3d');
      await tapId(driver, 'NavigationCloseButton');
      await waitForIdGone(driver, 'NavigationCloseButton');

      // address label persisted
      await openWallet(driver);
      await receive(driver);
      assert.strictEqual(await receiveRequest(driver), address);
      assert.ok((await getText(driver, 'ReceiveAddressLabel')).includes('my recv label'));
    },
    CASE_TIMEOUT,
  );

  test(
    'can encrypt storage, with plausible deniabilityl decrypt fake storage',
    async driver => {
      await step('Create wallet', () => createWallet(driver));
      await openSettings(driver);
      await tapId(driver, 'SecurityButton');
      assert.ok(!(await driver.$('~PlausibleDeniabilityButton').isExisting()), 'Plausible deniability must be hidden before encryption');
      await back(driver);
      await back(driver);

      // mistyped confirmation keeps the dialog open
      await encrypt(driver, '08902', '666');
      await waitForId(driver, 'ConfirmPasswordInput');
      await replaceId(driver, 'PasswordInput', 'qqq');
      await replaceId(driver, 'ConfirmPasswordInput', 'qqq');
      await tapId(driver, 'OKButton');
      await waitForIdGone(driver, 'ConfirmPasswordInput');
      await step('Verify encrypted storage is ready', () => waitForId(driver, 'PlausibleDeniabilityButton'));

      // wrong password, then the right one
      await unlock(driver, 'wrong');
      const passwordInput = await waitForId(driver, 'PasswordInput');
      await step('Wait for wrong-password rejection', () =>
        driver.waitUntil(async () => !(await passwordInput.getAttribute('value')), { timeout: 30_000 }),
      );
      await waitForIdGone(driver, 'cr34t3d');
      await replaceId(driver, 'PasswordInput', 'qqq');
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      await waitForId(driver, 'cr34t3d');

      // plausible deniability: main password is refused, then a typo, then success
      await openSettings(driver);
      await tapId(driver, 'SecurityButton');
      await tapId(driver, 'PlausibleDeniabilityButton');
      await createFakeStorage(driver, 'qqq');
      // TODO(Catalyst alerts): "Password is currently in use" is raised from the password sheet and Catalyst
      // defers it until that sheet closes; the sheet staying open after its progress indicator is the
      // immediate rejection, the alert itself is dismissed once the sheet is gone (below).
      await driver.$('-ios class chain:**/XCUIElementTypeActivityIndicator').waitForExist({ timeout: 60_000, reverse: true });
      await waitForId(driver, 'ConfirmPasswordInput');
      await replaceId(driver, 'PasswordInput', 'passwordForFakeStorage');
      await replaceId(driver, 'ConfirmPasswordInput', 'passwordForFakeStorageWithTypo');
      await tapId(driver, 'OKButton');
      await waitForId(driver, 'ConfirmPasswordInput');
      await replaceId(driver, 'PasswordInput', 'passwordForFakeStorage');
      await replaceId(driver, 'ConfirmPasswordInput', 'passwordForFakeStorage');
      await tapId(driver, 'OKButton');
      await waitForId(driver, 'CreateAWallet');
      await waitForIdGone(driver, 'cr34t3d');
      await waitForText(driver, 'Password is currently in use. Please try a different password.');
      await tapButtonWithLabel(driver, 'OK');
      await step('Create wallet inside fake storage', () => createWallet(driver, 'fake_wallet'));

      await unlock(driver, 'qqq');
      await step('Main password opens main storage', () => waitForId(driver, 'cr34t3d'));
      await waitForIdGone(driver, 'fake_wallet');
      await unlock(driver, 'passwordForFakeStorage');
      await step('Fake password opens fake storage', () => waitForId(driver, 'fake_wallet'));
      await waitForIdGone(driver, 'cr34t3d');

      // decrypt the fake storage
      await decrypt(driver, 'passwordForFakeStorage');
      await waitForIdGone(driver, 'PasswordInput');
      await relaunch(driver);
      await waitForId(driver, 'fake_wallet');
    },
    CASE_TIMEOUT,
  );

  test(
    'can encrypt storage, and decrypt storage works',
    async driver => {
      await step('Create wallet', () => createWallet(driver));
      await encrypt(driver, 'pass');
      await waitForIdGone(driver, 'ConfirmPasswordInput');
      await tapId(driver, 'PlausibleDeniabilityButton');
      await createFakeStorage(driver, 'fake');
      await waitForId(driver, 'CreateAWallet');
      await step('Create wallet inside fake storage', () => createWallet(driver, 'fake_wallet'));

      await unlock(driver, 'pass');
      await step('Main password opens main storage', () => waitForId(driver, 'cr34t3d'));

      // fake password must not decrypt the main storage
      await decrypt(driver, 'fake');
      await tapButtonWithLabel(driver, 'OK');
      await replaceId(driver, 'PasswordInput', 'pass');
      await tapId(driver, 'OKButton');
      await waitForIdGone(driver, 'PasswordInput');
      await relaunch(driver);
      await waitForId(driver, 'cr34t3d');
    },
    CASE_TIMEOUT,
  );

  test(
    'can import multisig setup from UR, and create tx, and sign on hw devices',
    async driver => {
      await selectMenuItem(driver, 'File', 'Import wallet');
      await tapId(driver, 'ScanImport');
      await step('Scan multipart setup', () => scanUrParts(driver, multisigSetupUr));
      await tapButtonWithLabel(driver, 'OK', 180_000);
      await waitForId(driver, 'Multisig Vault', 90_000);
      await openWallet(driver, 'Multisig Vault');
      await step('Wait for the vault balance from Electrum', () =>
        driver.waitUntil(async () => (await getText(driver, 'WalletBalance')) !== '0', { timeout: 180_000 }),
      );

      await send(driver);
      await replaceId(driver, 'AddressInput', recipient);
      await replaceAmount(driver, '0.00005');
      await setCustomFeeRate(driver, 3);
      await tapId(driver, 'CreateTransactionButton');
      await waitForId(driver, 'ItemUnsigned');
      assert.ok(!(await driver.$('~ItemSigned').isExisting()), 'No signature is expected before cosigning');

      for (const parts of [multisigPartiallySignedUr, multisigSignedUr]) {
        await tapId(driver, 'ProvideSignature');
        await scrollDownToId(driver, 'PsbtMultisigQRCodeScrollView', 'CosignedScanOrImportFile');
        await tapId(driver, 'CosignedScanOrImportFile');
        await scanUrParts(driver, parts);
        await waitForId(driver, 'ItemSigned', 30_000);
      }
      await waitForId(driver, 'ExportSignedPsbt');
      await tapId(driver, 'PsbtMultisigConfirmButton');

      // created. verifying; never tap Send now
      await waitForText(driver, '0.00005');
      await tapId(driver, 'TransactionDetailsButton');
      const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      assert.strictEqual(tx.ins.length, 1);
      assert.strictEqual(tx.outs.length, 2);
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), recipient);
      assert.strictEqual(tx.outs[0].value, 5000n);

      // Catalyst only: the same unsigned PSBT also arrives as a file through the native
      // macOS open panel, which exercises sandbox access to a user-selected file.
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bluewallet-catalyst-psbt-'));
      const filename = path.join(directory, 'unsigned.psbt');
      fs.writeFileSync(filename, Psbt.fromBase64(multisigUnsignedPsbt).toBuffer());
      try {
        // Pop TransactionDetails, Confirm and the multisig PSBT screen back to Send;
        // View › Back to Wallets is only offered while a wallet screen is in front.
        for (let i = 0; i < 3; i++) await back(driver);
        await waitForId(driver, 'AddressInput');
        await tapHeaderMenuItem(driver, 'Import Transaction');
        await pressKey(driver, 'g', COMMAND + SHIFT);
        // Catalyst duplicates underlying sheet fields after the panel in its AX
        // tree. Use AppKit's path-field identifier instead of the last text field.
        const filePath = await waitForId(driver, 'PathTextField', 15_000);
        await filePath.click();
        await filePath.setValue(filename);
        assert.strictEqual(await filePath.getAttribute('value'), filename);
        await pressKey(driver, 'XCUIKeyboardKeyReturn');
        await tapButtonWithLabel(driver, 'Open');
        await waitForId(driver, 'ItemUnsigned');
        assert.ok(!(await driver.$('~ItemSigned').isExisting()), 'A PSBT imported from a file must not be signed yet');
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    },
    50 * 60_000, // importing three keys and signing took over 30 minutes on a slow hosted runner (39120343394)
  );

  test(
    'can discover wallet account and import it',
    async driver => {
      await selectMenuItem(driver, 'File', 'Import wallet');
      await replaceId(driver, 'MnemonicInput', ZOO);
      // TODO(Catalyst alerts): Detox toggles Passphrase, cancels the prompt and imports again with an empty
      // passphrase. The prompt presented over the import sheet reacts to neither clicks (XCTest: not hittable,
      // coordinate clicks ignored) nor Escape on Catalyst, so the import runs without the passphrase toggle.
      await tapId(driver, 'DoImport');

      for (const derivationPath of ["m/84'/0'/0'", "m/44'/0'/0'"]) {
        await driver
          .$(`-ios predicate string:elementType == 9 AND label CONTAINS ${JSON.stringify(derivationPath)}`)
          .waitForExist({ timeout: 300_000 });
      }
      await tapId(driver, 'CustomDerivationPathButton');
      await replaceId(driver, 'DerivationPathInput', "m/44'/0'/0'");
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      const legacyAccount = driver.$('-ios predicate string:elementType == 9 AND label BEGINSWITH "HD Legacy" AND label ENDSWITH "Found"');
      await legacyAccount.waitForExist({ timeout: 300_000 });
      await legacyAccount.click();
      await step('Import selected custom derivation account and await confirmation', async () => {
        const button = await waitForId(driver, 'ImportButton');
        await button.waitForEnabled({ timeout: 30_000 });
        await driver.waitUntil(async () => String(await button.getAttribute('hittable')) === 'true', {
          timeout: 30_000,
          timeoutMsg: 'Selected derivation account Import button is not hittable',
        });
        await button.click();
        await tapButtonWithLabel(driver, 'OK', 90_000);
      });
      await relaunch(driver);
      await walletDetails(driver, 'Imported HD Legacy (BIP44 P2PKH)');
      await openAdvanced(driver);
      // For a signing wallet this is a non-interactive row: the right-hand text
      // remains its own accessibility element instead of a combined button label.
      await scrollDownToText(driver, 'WalletDetailsScroll', "m/44'/0'/0'");
    },
    CASE_TIMEOUT,
  );

  test(
    'can create wallet, and use main screen SCAN button to scan address',
    async driver => {
      const lightningInvoice =
        'lnbc1p090vrqpp5yxpd5wjtln4r874a9grkpr772cs0uyn7ayva3ypleyut7z0a4rgsdpu235hqurfdcsx7an9wf6x7undv4h8ggpgw35hqurfdchx6eff9p6nzvfc8q5scqzpgxqyz5vqcy30v2txquuh06h6946pal4dlm4hyujqv8ec3cunetf46gfydpxswedv4sr2rlg8dwpcg3fq9gah3j42373w366e6yau37t30amp5zqqftd004';
      const unifiedInvoice =
        'lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4';
      const unified = `bitcoin:1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=${unifiedInvoice}`;
      const homeScan = async (payload: string) => {
        await waitForId(driver, 'CreateAWallet');
        await tapId(driver, 'HomeScreenScanButton');
        await scanText(driver, payload);
      };

      await createWallet(driver);
      await homeScan('bitcoin:bc1qzrtn3xwlunlrm0n0uu23lr00gmdx4lnlavdy75');
      await waitForText(driver, 'bc1qzrtn3xwlunlrm0n0uu23lr00gmdx4lnlavdy75');

      // import a Lightning wallet and test BIP21 with both on-chain and off-chain present
      await relaunch(driver);
      await selectMenuItem(driver, 'File', 'Import wallet');
      await tapId(driver, 'ScanImport');
      await scanText(driver, 'lndhub://a3b4c9109408a043d1ea:ec5a888596b2c45729d1@https://kek.lol');
      await tapButtonWithLabel(driver, 'OK', 90_000);
      await waitForId(driver, 'Imported Lightning');

      await homeScan(`lightning:${lightningInvoice}`);
      await waitForText(driver, lightningInvoice);

      // wallet selector: lightning first, then on-chain
      await relaunch(driver);
      await homeScan(unified);
      await pickWallet(driver, 'Imported Lightning');
      await waitForText(driver, unifiedInvoice);

      await relaunch(driver);
      await homeScan(unified);
      await pickWallet(driver, 'cr34t3d');
      await waitForText(driver, '1DamianM2k8WfNEeJmyqSe2YW1upB7UATx');
      await waitForText(driver, '0.000001');

      // Azteco voucher
      await relaunch(driver);
      await homeScan('https://azte.co/redeem?code=1111222233334444');
      await waitForId(driver, 'AztecoCode');
    },
    CASE_TIMEOUT,
  );

  test('can create wallet and delete wallet', async driver => {
    await createWallet(driver);
    await deleteWallet(driver, 'cr34t3d');
    await relaunch(driver);
    await waitForIdGone(driver, 'cr34t3d');
    await waitForId(driver, 'CreateAWallet');
  });

  // TODO(Catalyst alerts): the Save confirmation (Alert.alert in screen/wallets/ProvideEntropy.tsx) is
  // deferred by Catalyst until the Add Wallet sheet closes, so its OK cannot mix the entropy into the
  // wallet being created. Page source after Save shows no alert.
  test.skip(
    'can provide dice entropy, undo rolls, mix it with system RNG and see provided bytes on Add Wallet screen',
    async driver => {
      await selectMenuItem(driver, 'File', 'Add Wallet');
      await replaceId(driver, 'WalletNameInput', 'entropy1');
      await tapId(driver, 'ActivateBitcoinButton');
      await tapHeaderMenuItem(driver, 'Provide entropy via dice rolls');
      await tapText(driver, '12 words');

      // BIP39: each seed word encodes 11 bits, so two leading "abandon" words require the first 22 bits
      // of entropy to be zero. We provide 28 zero bits using the zero-value input of every tab: coin
      // heads = 1 zero bit, d6 "1" = 2 zero bits, d20 "1" = 4 zero bits. 28 is NOT a multiple of 8, so
      // convertToBuffer trims the surplus 4 bits down to 3 whole bytes.
      await tapId(driver, 'Tab0');
      for (let i = 0; i < 4; i++) await tapId(driver, 'CoinFlip0');
      assert.match(await getText(driver, 'EntropyCounter'), /4 of 128 bits/);
      await tapId(driver, 'UndoEntropy');
      assert.match(await getText(driver, 'EntropyCounter'), /3 of 128 bits/);
      await tapId(driver, 'CoinFlip0');
      await tapId(driver, 'Tab1');
      for (let i = 0; i < 6; i++) await tapId(driver, 'Dice6Roll1');
      assert.match(await getText(driver, 'EntropyCounter'), /16 of 128 bits/);
      await tapId(driver, 'Tab2');
      await tapId(driver, 'Dice20Roll1');
      await tapId(driver, 'Dice20Roll1');
      assert.match(await getText(driver, 'EntropyCounter'), /24 of 128 bits/);
      await tapId(driver, 'Dice20Roll1');
      assert.match(await getText(driver, 'EntropyCounter'), /28 of 128 bits/);

      await tapId(driver, 'SaveEntropy');
      await waitForText(
        driver,
        '24 bits or 3 bytes of generated entropy. Remaining 13 bytes will be obtained from the System random number generator.',
      );
      await tapButtonWithLabel(driver, 'OK');
      await waitForId(driver, 'EntropyMixedIndicator');
      await waitForText(driver, '3 bytes of provided entropy will be mixed into your new wallet.');

      await tapId(driver, 'Create');
      await waitForId(driver, 'PleaseBackupScrollView', 180_000);
      const words = (await readSeed(driver)).split(' ');
      assert.strictEqual(words.length, 12);
      assert.strictEqual(words[0], 'abandon');
      assert.strictEqual(words[1], 'abandon');
      await scrollDownToId(driver, 'PleaseBackupScrollView', 'PleasebackupOk');
      await tapId(driver, 'PleasebackupOk');
      await waitForId(driver, 'entropy1');
      await deleteWallet(driver, 'entropy1');
    },
    CASE_TIMEOUT,
  );
});
