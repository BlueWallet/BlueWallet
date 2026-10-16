import assert from 'assert';
import { catalystSuite, step } from './suite';
import { createWallet, importWallet, openWallet, receive, receiveRequest, scanText, walletDetails } from './flows';
import {
  back,
  getText,
  readSeed,
  relaunch,
  replaceId,
  scrollDownToId,
  selectMenuItem,
  tapButtonWithLabel,
  tapOptionalConfirmation,
  tapHeaderMenuItem,
  tapId,
  tapText,
  waitForId,
  waitForIdGone,
  waitForText,
} from './driver';

catalystSuite('Wallet creation and import', test => {
  test('imports an exported BIP84 seed with the same first receive address', async driver => {
    const seed = await createWallet(driver);
    await openWallet(driver);
    await receive(driver, true);
    const address = await receiveRequest(driver);
    await relaunch(driver, { reset: true });
    await importWallet(driver, seed, 'HDsegwitBech32', 'Imported HD SegWit (BIP84 Bech32 Native)');
    await receive(driver);
    assert.strictEqual(await receiveRequest(driver), address);
    await relaunch(driver);
    await waitForId(driver, 'Imported HD SegWit (BIP84 Bech32 Native)');
  });
  test('imports a BIP39 passphrase as a distinct wallet', async driver => {
    const seed = await createWallet(driver);
    await openWallet(driver);
    await receive(driver, true);
    const address = await receiveRequest(driver);
    await relaunch(driver, { reset: true });
    await importWallet(driver, seed, 'HDsegwitBech32', 'Imported HD SegWit (BIP84 Bech32 Native)', 'Catalyst passphrase');
    await receive(driver);
    assert.notStrictEqual(await receiveRequest(driver), address);
  });
  // TODO(Catalyst alerts): entropy Save requires the native OK callback to
  // continue. Restore this case once that alert works with the original modal UI.
  test.skip('dice and coin entropy support undo, trimming, and wallet generation', async driver => {
    await selectMenuItem(driver, 'File', 'Add Wallet');
    await replaceId(driver, 'WalletNameInput', 'Entropy wallet');
    await tapId(driver, 'ActivateBitcoinButton');
    await tapHeaderMenuItem(driver, 'Provide entropy via dice rolls');
    await tapText(driver, '12 words');
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
    for (let i = 0; i < 3; i++) await tapId(driver, 'Dice20Roll1');
    assert.match(await getText(driver, 'EntropyCounter'), /28 of 128 bits/);
    await tapId(driver, 'SaveEntropy');
    await tapButtonWithLabel(driver, 'OK');
    await waitForId(driver, 'EntropyMixedIndicator');
    await waitForText(driver, '3 bytes of provided entropy will be mixed into your new wallet.');
    await tapId(driver, 'Create');
    assert.match(await readSeed(driver), /^abandon abandon /);
    await scrollDownToId(driver, 'PleaseBackupScrollView', 'PleasebackupOk');
    await tapId(driver, 'PleasebackupOk');
    await waitForId(driver, 'Entropy wallet');
  });
  test(
    'creates a 2-of-3 vault, exports setup and preserves its address after forgetting and restoring a seed',
    async driver => {
      await selectMenuItem(driver, 'File', 'Add Wallet');
      await tapId(driver, 'ActivateVaultButton');
      await tapId(driver, 'Create');
      await tapId(driver, 'LetsStart');
      let thirdSeed = '';
      for (let i = 0; i < 3; i++) {
        await tapId(driver, 'VaultKeyGenerate');
        if (i === 2) thirdSeed = await readSeed(driver);
        await tapId(driver, 'VaultKeyDone');
        await waitForIdGone(driver, 'VaultKeyDone');
      }
      await tapId(driver, 'CreateButton');
      await tapOptionalConfirmation(driver, 'OK', 'Multisig Vault');
      await relaunch(driver);
      await walletDetails(driver, 'Multisig Vault');
      await scrollDownToId(driver, 'WalletDetailsScroll', 'MultisigCoordinationSetup');
      await tapId(driver, 'MultisigCoordinationSetup');
      await waitForId(driver, 'ExportMultisigCoordinationSetupView');
      await relaunch(driver);
      await openWallet(driver, 'Multisig Vault');
      await receive(driver);
      const address = await receiveRequest(driver);
      assert.match(address.toLowerCase(), /^bc1q/);
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
          await replaceId(driver, 'MnemonicInputSheet', thirdSeed);
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
        assert.strictEqual(await receiveRequest(driver), address);
      }
    },
    20 * 60_000,
  ); // Intel CI needed 9.5 minutes through forgetting; restoring and verifying still follow.
  for (const wrapped of [false, true]) {
    // TODO(Catalyst scanner input): both variants use the blocked shared input;
    // see CI 38647288308 (typing) and 38635192455 (contextual Paste crash).
    test.skip(`imports individual cosigners into a 2-of-2 ${wrapped ? 'wrapped' : 'native'} SegWit vault`, async driver => {
      await selectMenuItem(driver, 'File', 'Add Wallet');
      await tapId(driver, 'ActivateVaultButton');
      await tapId(driver, 'Create');
      await tapId(driver, 'VaultAdvancedCustomize');
      await tapId(driver, 'DecreaseN');
      if (wrapped) await tapText(driver, 'Best compatibility (p2sh-p2wsh)');
      await tapId(driver, 'ModalDoneButton');
      await tapId(driver, 'LetsStart');
      const cosigners = wrapped
        ? [
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
            'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
          ]
        : [
            'pipe goose bottom run seed curious thought kangaroo example family coral success',
            'ur:crypto-account/oeadcypdlouebgaolytaadmetaaddloxaxhdclaxfdyksnwkuypkfevlfzfroyiyecoeosbakbpdcldawzhtcarkwsndcphphsbsdsayaahdcxfgjyckryosmwtdptlbflonbkimlsmovolslbytonayisprvoieftgeflzcrtvesbamtaaddyotadlocsdyykaeykaeykaoykaocypdlouebgaxaaaycyttatrnolimvetsst',
          ];
      for (const [index, cosigner] of cosigners.entries()) {
        await step(`Open cosigner ${index + 1} import sheet`, () => tapId(driver, `VaultCosignerImport${index + 1}`));
        await step(`Open cosigner ${index + 1} scanner`, () => tapText(driver, 'Scan'));
        await step(`Submit cosigner ${index + 1} scanner payload`, () => scanText(driver, cosigner));
      }
      await step('Create vault from imported cosigners and await confirmation', async () => {
        await tapId(driver, 'CreateButton');
        await tapOptionalConfirmation(driver, 'OK', 'Multisig Vault');
      });
      await openWallet(driver, 'Multisig Vault');
      await receive(driver);
      const address = await receiveRequest(driver);
      if (wrapped) assert.match(address, /^3[1-9A-HJ-NP-Za-km-z]+$/);
      else assert.strictEqual(address.toLowerCase(), 'bc1qmf06nt4jhvzz4387ak8fecs42k6jqygr2unumetfc7xkdup7ah9s8phlup');
      await back(driver);
      await relaunch(driver);
      await openWallet(driver, 'Multisig Vault');
      await receive(driver);
      assert.strictEqual(await receiveRequest(driver), address);
    });
  }
});
