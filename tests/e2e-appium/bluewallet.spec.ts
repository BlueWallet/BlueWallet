import assert from 'assert';
import { Transaction, address as bitcoinAddress } from 'bitcoinjs-lib';
import { catalystSuite, step } from './suite';
import { secret } from './config';
import {
  backToWallets,
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
  activate,
  back,
  getText,
  openSettings,
  pressKey,
  readSeed,
  relaunch,
  replaceAmount,
  replaceId,
  scrollDownToId,
  scrollDownToText,
  selectMenuItem,
  tapAndWaitForId,
  tapButtonWithLabel,
  tapHeaderMenuItem,
  tapId,
  tapOptionalConfirmation,
  tapText,
  waitForId,
  waitForIdGone,
  waitForText,
} from './driver';
import type { Driver } from './driver';
import multisigFixture from './fixtures/multisig.json';

const ABANDON = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ZOO = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
const recipient = 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl';

// Mac Catalyst merges a wallet-details row into one accessible button whose label starts with the title.
const row = (driver: Driver, title: string) =>
  driver.$(`-ios predicate string:elementType == 9 AND label BEGINSWITH ${JSON.stringify(`${title},`)}`);
const openAdvanced = async (driver: Driver) => {
  await scrollDownToText(driver, 'WalletDetailsScroll', 'Advanced,', 'prefix');
  await activate(driver);
  await row(driver, 'Advanced').click();
};
const expectVaultType = async (driver: Driver, label: string, type: string) => {
  await walletDetails(driver, label);
  await openAdvanced(driver);
  await scrollDownToText(driver, 'WalletDetailsScroll', type);
};
const longPress = async (driver: Driver, id: string) => {
  const element = await waitForId(driver, id);
  await activate(driver);
  // Holding and releasing at the same element is a native mouse long press.
  await driver.execute('macos: clickAndDrag', { sourceElementId: element.elementId, destinationElementId: element.elementId, duration: 1 });
};
// The sidebar shows the same wallet cards, so scope a pick to the selector list.
const pickWallet = async (driver: Driver, label: string) => {
  const list = await waitForId(driver, 'SelectWalletsList');
  const card = list.$(`~${label}`);
  await card.waitForExist({ timeout: 30_000 });
  await activate(driver);
  await card.click();
};
const createVault = async (driver: Driver, options: { m?: 'decrease'; wrapped?: boolean } = {}) => {
  await selectMenuItem(driver, 'File', 'Add Wallet');
  await tapId(driver, 'ActivateVaultButton');
  await tapId(driver, 'Create');
  if (options.m || options.wrapped) {
    await tapId(driver, 'VaultAdvancedCustomize');
    if (options.m) await tapId(driver, 'DecreaseN');
    if (options.wrapped) await tapText(driver, 'Best compatibility (p2sh-p2wsh)');
    await tapId(driver, 'ModalDoneButton');
  }
  await tapId(driver, 'LetsStart');
};
const importCosigner = async (driver: Driver, index: number, payload: string) => {
  await step(`Open cosigner ${index} import sheet`, () => tapId(driver, `VaultCosignerImport${index}`));
  await step(`Open cosigner ${index} scanner`, () => tapText(driver, 'Scan'));
  await step(`Submit cosigner ${index} scanner payload`, () => scanText(driver, payload));
};
const finishVault = async (driver: Driver) => {
  await tapId(driver, 'CreateButton');
  await tapOptionalConfirmation(driver, 'OK', 'Multisig Vault');
  await waitForId(driver, 'Multisig Vault');
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
      for (const id of ['ClipboardSwitch', 'QuickActionsSwitch']) {
        const previous = await getText(driver, id);
        await tapId(driver, id);
        await driver.waitUntil(async () => (await getText(driver, id)) !== previous, { timeout: 10_000 });
        await tapId(driver, id);
        await driver.waitUntil(async () => (await getText(driver, id)) === previous, { timeout: 10_000 });
      }
      await back(driver);

      // currency: ARS (Yadio) and back to USD
      await tapId(driver, 'Currency');
      const currency = (code: string) =>
        driver.$(`-ios predicate string:elementType == 9 AND label BEGINSWITH ${JSON.stringify(`${code},`)}`);
      await currency('ARS ($)').waitForExist({ timeout: 30_000 });
      await activate(driver);
      await currency('ARS ($)').click();
      await waitForText(driver, 'Rate is obtained from Yadio');
      await currency('USD ($)').waitForExist({ timeout: 30_000 });
      await activate(driver);
      await currency('USD ($)').click();
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
    20 * 60_000,
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
    20 * 60_000,
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
    20 * 60_000,
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
    20 * 60_000,
  );

  test('can import 2of2 multisig using individual cosigners (1 signer, 1 xpub)', async driver => {
    await createVault(driver, { m: 'decrease' });
    await importCosigner(driver, 1, 'pipe goose bottom run seed curious thought kangaroo example family coral success');
    await importCosigner(
      driver,
      2,
      'ur:crypto-account/oeadcypdlouebgaolytaadmetaaddloxaxhdclaxfdyksnwkuypkfevlfzfroyiyecoeosbakbpdcldawzhtcarkwsndcphphsbsdsayaahdcxfgjyckryosmwtdptlbflonbkimlsmovolslbytonayisprvoieftgeflzcrtvesbamtaaddyotadlocsdyykaeykaeykaoykaocypdlouebgaxaaaycyttatrnolimvetsst',
    );
    await finishVault(driver);
    await openWallet(driver, 'Multisig Vault');
    await receive(driver);
    assert.strictEqual((await receiveRequest(driver)).toLowerCase(), 'bc1qmf06nt4jhvzz4387ak8fecs42k6jqygr2unumetfc7xkdup7ah9s8phlup');
    await backToWallets(driver);
    await expectVaultType(driver, 'Multisig Vault', '2 / 2 (native segwit)');
  });

  test(
    'can import multisig setup from UR, and create tx, and sign on hw devices',
    async driver => {
      await selectMenuItem(driver, 'File', 'Import Wallet');
      await tapId(driver, 'ScanImport');
      await step('Scan multipart setup', () => scanUrParts(driver, multisigFixture.setup));
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

      for (const parts of [multisigFixture.partial, multisigFixture.signed]) {
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
    },
    35 * 60_000,
  );

  test(
    'multisig can co-sign transaction',
    async driver => {
      const cobo = secret('MNEMONICS_COBO');
      // 2-of-2 PSBT for the funded test wallet, signed only by the Keystone cosigner.
      // Pays 1000 sats to 13HaCAB4jf7FYSZexJxoczyDDnutzZigjS. The other cosigner is xpub-only.
      const keystoneSignedPsbt =
        'cHNidP8BAIACAAAAAbbYz7T9Xe3XyMi3MVEljaEK/iHauQFtUO02J8Z1Bl2yAAAAAAAAAACAAugDAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKzXIAAAAAAAACIAIJNt+VL0ds3NBYrGEnjJkBwVFp31Hm1tVRvwTPmgVfoZAAAAAAABAP1dAQIAAAAAAQFxE0VTxd+BzmiqP9/1oqFLUSPxAeHapSqOCILu2lxJrwAAAAAA/////wEdJgAAAAAAACIAIDQ5h7oZ+gQbCoCb0RCkE+EOgvW/ZMZmQ0Z4eWP+e5snBABIMEUCIQDTuWOybjCA63alhMi+9xxuZt2jIb3iT36DwGUwGFvBMwIgYHsF5Wj0e4sCJed3lVlcekupmRZjdVZYbYKAUWJU1j8BRzBEAiA5DiYPhZ/zS5jkRAATckF7vasRX2DkUXwPTP+KQv//qQIgTrm7LVCCEgOB/OAJ81F4g6a1zuTYLh2uWKayNpelpMUBaVIhArF4TVQUDQ8+gt+VQ3SH4F8Y7ZCVfvb40UTKXX2wwIufIQLRyEyysO4jvpj14n2G24qq5CAoZejx0UxR4zfba4AunCEDraywXmVJuJSKOU0fsZN6GMSWE9GkXNeOAG6g/Zgo3gxTrgAAAAABASsdJgAAAAAAACIAIDQ5h7oZ+gQbCoCb0RCkE+EOgvW/ZMZmQ0Z4eWP+e5snIgIDX5ZhfdePUV33GH4OmP5280DHYpoqKSv2ZdXR5iTmJ4dHMEQCIA1BQ6iOpikblzn+6Fpp9H+JpByZuypbK9r5fsamcxkMAiBc+M1UbTtfbdUdWj8yj0HJhP+Q2iVmesOF4D/K6Ly4hwEBBUdSIQNflmF9149RXfcYfg6Y/nbzQMdimiopK/Zl1dHmJOYnhyEDmxWJrUMuM6msEm0JxkdLLfKMNCY0mSnNqnE3QLGxc1tSriIGA1+WYX3Xj1Fd9xh+Dpj+dvNAx2KaKikr9mXV0eYk5ieHHLaK9uQwAACAAAAAgAAAAIACAACAAAAAAAIAAAAiBgObFYmtQy4zqawSbQnGR0st8ow0JjSZKc2qcTdAsbFzWxzTfq2IMAAAgAAAAIAAAACAAgAAgAAAAAACAAAAAAABAUdSIQIeMx1HXKOUWDWh5d4F8cLzBpIiTgvGsFGdxx0kdVXgSyEDGI9PFspCDWSfo7lYOuCB2c3b8gY9mfr3VyQsCH5E/DVSriICAh4zHUdco5RYNaHl3gXxwvMGkiJOC8awUZ3HHSR1VeBLHLaK9uQwAACAAAAAgAAAAIACAACAAQAAAAAAAAAiAgMYj08WykINZJ+juVg64IHZzdvyBj2Z+vdXJCwIfkT8NRzTfq2IMAAAgAAAAIAAAACAAgAAgAEAAAAAAAAAAA==';
      const keystoneCosigner = JSON.stringify({
        xfp: 'B68AF6E4',
        xpub: 'Zpub74w9dfoeurKrKXE3SPRpFquLPTkiCuSwGuhDzBgbE42w5ShB2FxMjmJyjZpSJ6WhLt8y1PeFHQELGgq2GmktviFDH8yFWYRWg4xQiw3v335',
        path: "m/48'/0'/0'/2'",
      });

      await createVault(driver, { m: 'decrease' });
      // Key 1: Cobo seed, so this device can co-sign. Key 2: Keystone xpub only.
      await importCosigner(driver, 1, cobo);
      await importCosigner(driver, 2, keystoneCosigner);
      await finishVault(driver);

      await openWallet(driver, 'Multisig Vault');
      await send(driver);
      await tapHeaderMenuItem(driver, 'Sign a transaction');
      await scanText(driver, keystoneSignedPsbt);
      await driver.waitUntil(async () => (await driver.$$('~ItemSigned').length) === 2, {
        timeout: 30_000,
        timeoutMsg: 'Both cosigner signatures must show',
      });
      await waitForIdGone(driver, 'ItemUnsigned');
      await tapId(driver, 'PsbtMultisigConfirmButton');

      await waitForId(driver, 'TransactionValue');
      await waitForText(driver, 'Send now');
      await tapId(driver, 'TransactionDetailsButton');
      const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      const paid = tx.outs.find(output => {
        try {
          return bitcoinAddress.fromOutputScript(output.script) === '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS';
        } catch {
          return false;
        }
      });
      assert.ok(paid, 'broadcast-ready transaction is missing the destination output');
      assert.strictEqual(Number(paid.value), 1000);
      assert.ok(
        tx.ins.every(input => input.witness.length >= 4),
        'transaction is not fully signed',
      );

      // Leave the Send now button alone.
      await back(driver);
      await waitForText(driver, 'Send now');
    },
    20 * 60_000,
  );

  test(
    'can discover wallet account and import it',
    async driver => {
      await selectMenuItem(driver, 'File', 'Import Wallet');
      await replaceId(driver, 'MnemonicInput', ZOO);
      // TODO(Catalyst alerts): Detox toggles Passphrase, cancels the prompt and imports again with an empty
      // passphrase. The prompt presented over the import sheet reacts to neither clicks (XCTest: not hittable,
      // coordinate clicks ignored) nor Escape on Catalyst, so the import runs without the passphrase toggle.
      await tapId(driver, 'DoImport');

      for (const path of ["m/84'/0'/0'", "m/44'/0'/0'"]) {
        await driver
          .$(`-ios predicate string:elementType == 9 AND label CONTAINS ${JSON.stringify(path)}`)
          .waitForExist({ timeout: 300_000 });
      }
      await tapId(driver, 'CustomDerivationPathButton');
      await replaceId(driver, 'DerivationPathInput', "m/44'/0'/0'");
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      const legacyAccount = driver.$('-ios predicate string:elementType == 9 AND label BEGINSWITH "HD Legacy" AND label ENDSWITH "Found"');
      await legacyAccount.waitForExist({ timeout: 300_000 });
      await activate(driver);
      await legacyAccount.click();
      await step('Import selected custom derivation account and await confirmation', async () => {
        const button = await waitForId(driver, 'ImportButton');
        await button.waitForEnabled({ timeout: 30_000 });
        await driver.waitUntil(async () => String(await button.getAttribute('hittable')) === 'true', {
          timeout: 30_000,
          timeoutMsg: 'Selected derivation account Import button is not hittable',
        });
        await activate(driver);
        await button.click();
        await tapOptionalConfirmation(driver, 'OK', 'Imported HD Legacy (BIP44 P2PKH)', 90_000);
      });
      await relaunch(driver);
      await walletDetails(driver, 'Imported HD Legacy (BIP44 P2PKH)');
      await openAdvanced(driver);
      // For a signing wallet this is a non-interactive row: the right-hand text
      // remains its own accessibility element instead of a combined button label.
      await scrollDownToText(driver, 'WalletDetailsScroll', "m/44'/0'/0'");
    },
    20 * 60_000,
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
      await selectMenuItem(driver, 'File', 'Import Wallet');
      await tapId(driver, 'ScanImport');
      await scanText(driver, 'lndhub://a3b4c9109408a043d1ea:ec5a888596b2c45729d1@https://kek.lol');
      await tapOptionalConfirmation(driver, 'OK', 'Imported Lightning', 90_000);
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
    20 * 60_000,
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
    20 * 60_000,
  );

  test(
    'can create 2of3 multisig vault with generated keys, manage cosigners and export coordination setup; forgetting seed/restoring seed does not change receive address',
    async driver => {
      await createVault(driver);
      for (let i = 0; i < 2; i++) {
        await tapId(driver, 'VaultKeyGenerate');
        await tapId(driver, 'VaultKeyDone');
        await waitForIdGone(driver, 'VaultKeyDone');
      }
      await importCosigner(driver, 3, ABANDON);
      await finishVault(driver);

      await expectVaultType(driver, 'Multisig Vault', '2 / 3 (native segwit)');
      await scrollDownToId(driver, 'WalletDetailsScroll', 'MultisigCoordinationSetup');
      await tapId(driver, 'MultisigCoordinationSetup');
      await waitForId(driver, 'ExportMultisigCoordinationSetupView');

      await relaunch(driver);
      await openWallet(driver, 'Multisig Vault');
      await receive(driver);
      const vaultReceiveAddress = await receiveRequest(driver);
      assert.ok(vaultReceiveAddress.length > 20);

      for (const restore of [false, true]) {
        await relaunch(driver);
        await walletDetails(driver, 'Multisig Vault');
        await scrollDownToId(driver, 'WalletDetailsScroll', 'ViewEditCosigners');
        await tapId(driver, 'ViewEditCosigners');
        // Importing the three keys can leave this sheet on its loading spinner
        // longer than a normal element wait on Intel CI (38806630548).
        await step(`Load cosigner list before ${restore ? 'restoring' : 'forgetting'} a seed`, () =>
          waitForId(driver, 'ViewEditMultisigCosignersFlatList', 90_000),
        );
        const button = restore ? 'VaultCosignerImportMnemonics3' : 'VaultCosignerForgetSeed3';
        await scrollDownToId(driver, `//XCUIElementTypeScrollView[.//*[@identifier="${button}"]]`, button);
        await tapId(driver, button);
        if (restore) {
          await replaceId(driver, 'MnemonicInputSheet', ABANDON);
          await tapId(driver, 'DoImportKeyButton');
        } else {
          await waitForId(driver, 'VaultCosignerImportMnemonics3');
        }
        await (await waitForId(driver, 'VaultCosignersSave')).waitForEnabled();
        await tapId(driver, 'VaultCosignersSave');
        // The Save button disappears immediately when the loading view mounts.
        // The native navigation bar stays until save/navigation actually finish.
        await waitForIdGone(driver, 'View/Edit Co-signers', 90_000);
        await relaunch(driver);
        await openWallet(driver, 'Multisig Vault');
        // Replacing the cosigner configuration resets its backup acknowledgement.
        await receive(driver, true);
        assert.strictEqual(await receiveRequest(driver), vaultReceiveAddress);
      }
    },
    20 * 60_000,
  );

  test('can create wrapped segwit 2of2 vault via advanced settings', async driver => {
    await createVault(driver, { m: 'decrease', wrapped: true });
    await importCosigner(driver, 1, ABANDON);
    await importCosigner(driver, 2, ZOO);
    await finishVault(driver);
    await openWallet(driver, 'Multisig Vault');
    await receive(driver);
    assert.match(await receiveRequest(driver), /^3[1-9A-HJ-NP-Za-km-z]+$/);
    await backToWallets(driver);
    await expectVaultType(driver, 'Multisig Vault', '2 / 2 (wrapped segwit)');
  });
});
