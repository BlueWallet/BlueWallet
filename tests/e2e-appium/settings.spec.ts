import { catalystSuite } from './suite';
import {
  back,
  activate,
  expectText,
  getText,
  openSettings,
  relaunch,
  replaceId,
  scrollDownToId,
  tapButtonWithLabel,
  tapId,
  tapText,
  tapAndWaitForId,
  waitForId,
  waitForText,
} from './driver';

catalystSuite('Settings', test => {
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
  for (const id of ['ClipboardSwitch', 'QuickActionsSwitch']) {
    test(`${id} changes and persists across launch`, async driver => {
      await openSettings(driver);
      await tapId(driver, 'GeneralSettings');
      const previous = await getText(driver, id);
      await tapId(driver, id);
      await driver.waitUntil(async () => (await getText(driver, id)) !== previous);
      const changed = await getText(driver, id);
      await relaunch(driver);
      await openSettings(driver);
      await tapId(driver, 'GeneralSettings');
      await expectText(driver, id, changed);
    });
  }
  test('currency changes and persists', async driver => {
    await openSettings(driver);
    await tapId(driver, 'Currency');
    const currencyLocator = '-ios predicate string:elementType == 9 AND label BEGINSWITH "ARS ($),"';
    const currency = driver.$(currencyLocator);
    await currency.waitForExist({ timeout: 30_000 });
    await activate(driver);
    await currency.click();
    await waitForText(driver, 'Rate is obtained from Yadio');
    await back(driver);
    await relaunch(driver);
    await openSettings(driver);
    await tapId(driver, 'Currency');
    await waitForText(driver, 'Rate is obtained from Yadio');
    // The settings root shows only "Currency". On this screen the selected
    // currency is disabled, while the other currencies remain selectable.
    await driver.$(currencyLocator).waitForExist({ timeout: 30_000 });
    await driver.$(currencyLocator).waitForEnabled({ reverse: true });
  });
  test('language changes and can be restored', async driver => {
    await openSettings(driver);
    await tapId(driver, 'Language');
    await tapText(driver, 'Afrikaans (AFR)');
    await back(driver);
    await driver.waitUntil(async () => (await getText(driver, 'Language')).includes('Taal'), { timeout: 30_000 });
    await tapId(driver, 'Language');
    await tapText(driver, 'English');
    await back(driver);
    await driver.waitUntil(async () => (await getText(driver, 'Language')).includes('Language'), { timeout: 30_000 });
  });
  test('network settings expose Electrum and Lightning configuration', async driver => {
    await openSettings(driver);
    await tapId(driver, 'NetworkSettings');
    await tapId(driver, 'ElectrumSettings');
    // Catalyst drops HostInput from the field's accessibility tree after loading.
    const host = driver.$('//*[@identifier="ElectrumSettingsScrollView"]//XCUIElementTypeTextField[@value="127.0.0.1"]');
    await host.waitForExist({ timeout: 30_000 });
    await waitForId(driver, 'PortInput');
    await waitForId(driver, 'SSLPortInput');
    await back(driver);
    await tapId(driver, 'LightningSettings');
    await waitForText(driver, 'Lightning Settings');
    // This screen has one URL field; its loading/editable transition can also
    // drop URIInput on Catalyst, just like the Electrum host field above.
    await driver.$('-ios predicate string:elementType == 49 AND enabled == true').waitForExist({ timeout: 30_000 });
  });
  test('broadcast tool displays a server rejection and preserves the input', async driver => {
    await openSettings(driver);
    await tapId(driver, 'Tools');
    await tapId(driver, 'Broadcast');
    await replaceId(driver, 'TxHex', 'invalid');
    await tapId(driver, 'BroadcastButton');
    await waitForText(driver, 'Broadcast is disabled in E2E');
    await tapButtonWithLabel(driver, 'OK');
    await expectText(driver, 'TxHex', 'invalid');
  });
  test('address ownership tool reports an unowned address', async driver => {
    await openSettings(driver);
    await tapId(driver, 'Tools');
    await tapId(driver, 'IsItMyAddress');
    await replaceId(driver, 'AddressInput', 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await tapId(driver, 'CheckAddress');
    await waitForText(driver, 'None of the available wallets own the provided address.');
    await tapButtonWithLabel(driver, 'OK');
  });
});
