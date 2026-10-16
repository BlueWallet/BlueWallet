import assert from 'assert';
import { catalystSuite } from './suite';
import { createWallet, deleteWallet, openWallet, receive, receiveRequest, scanText, walletDetails } from './flows';
import {
  activate,
  readSeed,
  expectText,
  getText,
  prompt,
  relaunch,
  replaceId,
  replaceAmount,
  scrollDownToId,
  selectMenuItem,
  tapId,
  waitForId,
  waitForIdGone,
} from './driver';

catalystSuite('Wallet lifecycle', test => {
  test('creates a wallet and reloads its seed and balance from disk', async driver => {
    const seed = await createWallet(driver);
    assert.strictEqual(seed.trim().split(/\s+/).length, 12);
    await relaunch(driver);
    await openWallet(driver);
    await expectText(driver, 'WalletBalance', '0');
    await walletDetails(driver);
    await scrollDownToId(driver, 'WalletDetailsScroll', 'WalletExport');
    await tapId(driver, 'WalletExport');
    assert.strictEqual(await readSeed(driver), seed);
  });
  test('renames a wallet and persists the new name', async driver => {
    await createWallet(driver);
    await walletDetails(driver);
    await tapId(driver, 'WalletNameEditButton');
    await prompt(driver, 'Renamed Catalyst wallet');
    await expectText(driver, 'WalletNameDisplay', 'Renamed Catalyst wallet');
    await relaunch(driver);
    await walletDetails(driver, 'Renamed Catalyst wallet');
    await waitForIdGone(driver, 'Catalyst test wallet');
  });
  test('exports an extended public key', async driver => {
    await createWallet(driver);
    await walletDetails(driver);
    await scrollDownToId(driver, 'WalletDetailsScroll', 'XpubButton');
    await tapId(driver, 'XpubButton');
    const key = await (await waitForId(driver, 'CopyTextToClipboard')).getAttribute('label');
    assert.match(key ?? '', /zpub[1-9A-HJ-NP-Za-km-z]+/);
  });
  test('deletes a wallet and it stays deleted after restart', async driver => {
    await createWallet(driver, 'Delete me');
    await deleteWallet(driver, 'Delete me');
    await relaunch(driver);
    await waitForIdGone(driver, 'Delete me');
    await waitForId(driver, 'CreateAWallet');
  });
  test('receive request sets amount and description and preserves the address label', async driver => {
    await createWallet(driver);
    await openWallet(driver);
    await receive(driver, true);
    const address = await receiveRequest(driver);
    await tapId(driver, 'ReceiveMoreOptionsButton');
    await tapId(driver, 'ReceiveWithAmountOption');
    await replaceAmount(driver, '1');
    await replaceId(driver, 'CustomAmountDescription', 'Catalyst request');
    await tapId(driver, 'CustomAmountSaveButton');
    const request = new URL(await receiveRequest(driver));
    assert.strictEqual(request.protocol, 'bitcoin:');
    assert.strictEqual(request.pathname.toLowerCase(), address.toLowerCase());
    assert.strictEqual(request.searchParams.get('amount'), '1');
    assert.strictEqual(request.searchParams.get('label'), 'Catalyst request');
    await tapId(driver, 'ReceiveMoreOptionsButton');
    await tapId(driver, 'AddressLabelOption');
    await replaceId(driver, 'AddressLabelInput', 'Persistent address label');
    await tapId(driver, 'AddressLabelSaveButton');
    assert.ok((await getText(driver, 'ReceiveAddressLabel')).includes('Persistent address label'));
    await relaunch(driver);
    await openWallet(driver);
    await receive(driver);
    assert.strictEqual(await receiveRequest(driver), address);
    assert.ok((await getText(driver, 'ReceiveAddressLabel')).includes('Persistent address label'));
  });
  test('home scanner routes a Bitcoin URI to the selected wallet send form', async driver => {
    await createWallet(driver);
    await openWallet(driver);
    await selectMenuItem(driver, 'View', 'Back to Wallets');
    await tapId(driver, 'HomeScreenScanButton');
    await scanText(driver, 'bitcoin:bc1qzrtn3xwlunlrm0n0uu23lr00gmdx4lnlavdy75');
    await expectText(driver, 'AddressInput', 'bc1qzrtn3xwlunlrm0n0uu23lr00gmdx4lnlavdy75');
  });
  test('long press opens Manage Wallets and closing it returns to the wallet list', async driver => {
    await createWallet(driver);
    const wallet = await waitForId(driver, 'Catalyst test wallet');
    await activate(driver);
    // Holding and releasing at the same element is a native mouse long press.
    await driver.execute('macos: clickAndDrag', {
      sourceElementId: wallet.elementId,
      destinationElementId: wallet.elementId,
      duration: 1,
    });
    await waitForId(driver, 'NavigationCloseButton');
    await waitForId(driver, 'Catalyst test wallet');
    await tapId(driver, 'NavigationCloseButton');
    await waitForIdGone(driver, 'NavigationCloseButton');
    await waitForId(driver, 'CreateAWallet');
    await openWallet(driver);
    await expectText(driver, 'WalletBalance', '0');
  });
});
