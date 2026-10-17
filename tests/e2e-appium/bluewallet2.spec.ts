import assert from 'assert';
import { Transaction, address as bitcoinAddress } from 'bitcoinjs-lib';
import { catalystSuite, step } from './suite';
import { BUNDLE_ID, secret } from './config';
import {
  FUNDED_BALANCE,
  FUNDED_LABEL,
  backToWallets,
  createTransaction,
  importFundedWallet,
  openWallet,
  receive,
  scanText,
  send,
  setCustomFeeRate,
  walletDetails,
} from './flows';
import {
  activate,
  back,
  clipboard,
  expectText,
  getText,
  prompt,
  readSeed,
  relaunch,
  replaceAmount,
  replaceFocusedText,
  replaceId,
  scrollDownToId,
  scrollDownToText,
  selectMenuItem,
  tapButtonWithLabel,
  tapHeaderMenuItem,
  tapId,
  tapRepeatedly,
  tapText,
  waitForId,
  waitForIdGone,
  waitForText,
} from './driver';
import type { Driver } from './driver';

const recipient = 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl';
const recipient2 = 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7';
const recipient3 = 'bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7';
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const shortened = (value: string) => `${value.slice(0, 10)}...${value.slice(-10)}`;
// Mac Catalyst hides the amount TextInput from accessibility behind the "Enter amount"
// button, so its text is read back through the native Edit menu and the clipboard.
const amountValue = async (driver: Driver) => {
  await tapButtonWithLabel(driver, 'Enter amount');
  await selectMenuItem(driver, 'Edit', 'Select All');
  await selectMenuItem(driver, 'Edit', 'Copy');
  return clipboard(driver);
};
const clickRow = async (driver: Driver, predicate: string) => {
  const element = driver.$(`-ios predicate string:${predicate}`);
  await element.waitForExist({ timeout: 30_000 });
  await activate(driver);
  await element.click();
};
const openTransaction = (driver: Driver, amount: string) =>
  clickRow(driver, `elementType == 9 AND label BEGINSWITH "Incoming Transaction," AND label CONTAINS "${amount}"`);
const openCoin = (driver: Driver, text: string) => clickRow(driver, `label CONTAINS "${text}" OR value CONTAINS "${text}"`);
// Coin rows and transaction rows are single accessible buttons on Catalyst: their text is part of the
// row label and the row's testID is not exposed, so both are matched by label.
const waitForRowContaining = (driver: Driver, text: string) =>
  driver.$(`-ios predicate string:label CONTAINS ${JSON.stringify(text)}`).waitForExist({ timeout: 30_000 });
const transactionRows = (driver: Driver) =>
  driver.$$(
    '-ios predicate string:elementType == 9 AND (label BEGINSWITH "Incoming Transaction" OR label BEGINSWITH "Outgoing Transaction")',
  );
const addRecipient = async (driver: Driver, rowId: string, address: string, amount: string) => {
  await tapHeaderMenuItem(driver, 'Add Recipient');
  const row = await waitForId(driver, rowId);
  const field = await row.$('~AddressInput');
  await activate(driver);
  await field.click();
  await replaceFocusedText(driver, address);
  assert.strictEqual(await field.getAttribute('value'), address);
  await replaceAmount(driver, amount, rowId);
};
const purge = async (driver: Driver) => {
  await walletDetails(driver, FUNDED_LABEL);
  await tapRepeatedly(driver, 'PurgeBackdoorButton', 11);
  await tapButtonWithLabel(driver, 'OK');
  await back(driver);
  await expectText(driver, 'WalletBalance', '0');
  await waitForId(driver, 'TransactionsListEmpty');
};
const useFullBalance = async (driver: Driver) => {
  await tapHeaderMenuItem(driver, 'Use Full Balance');
  await tapButtonWithLabel(driver, 'OK');
};
const CASE_TIMEOUT = 20 * 60_000; // public Electrum servers answer slowly on Intel CI

catalystSuite('BlueWallet UI Tests - import BIP84 wallet', test => {
  test(
    'can create a transaction; can scanQR with bip21; can switch units',
    async driver => {
      await importFundedWallet(driver);
      await send(driver);
      await replaceId(driver, 'AddressInput', recipient);
      await replaceAmount(driver, '0.0001');
      const feeRate = 2;
      await setCustomFeeRate(driver, feeRate);
      await tapId(driver, 'CreateTransactionButton');

      // created. verifying:
      await expectText(driver, 'TransactionValue', '0.0001');
      const transactionFee = await getText(driver, 'TransactionFee');
      assert.ok(transactionFee.startsWith('Fee: 0.00000292 BTC'), 'Unexpected tx fee: ' + transactionFee);
      await tapId(driver, 'TransactionDetailsButton');
      let tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      assert.ok(tx.ins.length === 1 || tx.ins.length === 2); // depending on current fees gona use either 1 or 2 inputs
      assert.strictEqual(tx.outs.length, 2);
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), recipient);
      assert.strictEqual(tx.outs[0].value, 10000n);
      const totalIns = 69909; // we hardcode it since we know it in advance
      const totalOuts = tx.outs.map(output => Number(output.value)).reduce((a, b) => a + b, 0);
      assert.strictEqual(Math.round((totalIns - totalOuts) / tx.virtualSize()), feeRate);
      assert.strictEqual(Number(transactionFee.split(' ')[1]) * 100000000, totalIns - totalOuts);

      // now, testing scanQR with bip21:
      await back(driver);
      await back(driver);
      await tapId(driver, 'changeAmountUnitButton'); // switched to SATS
      await tapId(driver, 'BlueAddressInputScanQrButton');
      await scanText(driver, `bitcoin:${recipient2}?amount=0.00015&pj=https://btc.donate.kukks.org/BTC/pj`);
      await tapId(driver, 'CreateTransactionButton');
      await waitForId(driver, 'TransactionValue');
      await waitForId(driver, 'PayjoinSwitch');
      await tapId(driver, 'TransactionDetailsButton');
      tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), recipient2);
      assert.strictEqual(tx.outs[0].value, 15000n);

      // scanQR with just an address after the amount was set to 1.1 USD; denomination must not change
      await back(driver);
      await back(driver);
      await tapId(driver, 'changeAmountUnitButton'); // switched to SATS
      await tapId(driver, 'changeAmountUnitButton'); // switched to FIAT
      await replaceAmount(driver, '1.1');
      await tapId(driver, 'BlueAddressInputScanQrButton');
      await scanText(driver, recipient2);
      await tapId(driver, 'CreateTransactionButton');
      await waitForId(driver, 'TransactionValue');
      await tapId(driver, 'TransactionDetailsButton');
      tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), recipient2);
      assert.notEqual(tx.outs[0].value, 110000000n); // 1.1 USD, not 1.1 BTC
      assert.ok(Number(tx.outs[0].value) < 10000);

      // units switching, then a transaction in SATS
      await back(driver);
      await back(driver);
      await tapId(driver, 'changeAmountUnitButton'); // switched to BTC
      await replaceAmount(driver, '0.00015');
      await tapId(driver, 'changeAmountUnitButton'); // switched to sats
      assert.strictEqual(await amountValue(driver), '15000');
      await tapId(driver, 'changeAmountUnitButton'); // switched to FIAT
      await tapId(driver, 'changeAmountUnitButton'); // switched to BTC
      assert.strictEqual(await amountValue(driver), '0.00015');
      await tapId(driver, 'changeAmountUnitButton'); // switched to sats
      await replaceAmount(driver, '50000');
      tx = await createTransaction(driver);
      assert.strictEqual(tx.outs.length, 2);
      assert.strictEqual(tx.outs[0].value, 50000n);
    },
    CASE_TIMEOUT,
  );

  test(
    'can batch send',
    async driver => {
      await importFundedWallet(driver);
      await send(driver);
      await replaceId(driver, 'AddressInput', recipient2);
      await replaceAmount(driver, '0.0001');
      await addRecipient(driver, 'Transaction1', recipient, '0.0002');

      // remove all recipients and start over
      await tapHeaderMenuItem(driver, 'Remove All Recipients');
      await tapButtonWithLabel(driver, 'OK');
      await waitForIdGone(driver, 'Transaction1');
      await replaceId(driver, 'AddressInput', recipient2);
      await replaceAmount(driver, '0.0001');
      await setCustomFeeRate(driver, 2);

      await addRecipient(driver, 'Transaction1', recipient, '0.0002');
      await addRecipient(driver, 'Transaction2', recipient3, '0.0003');

      // remove the last output, check the second one is shown, then add it again
      await tapHeaderMenuItem(driver, 'Remove Recipient');
      await waitForIdGone(driver, 'Transaction2');
      await waitForId(driver, 'Transaction1');
      await addRecipient(driver, 'Transaction2', recipient3, '0.0003');

      // Detox swipes to the second output and removes it; the macOS menu removes
      // the focused (last) recipient, so drop the third output again instead.
      await tapHeaderMenuItem(driver, 'Remove Recipient');
      await waitForIdGone(driver, 'Transaction2');

      const tx = await createTransaction(driver);
      assert.strictEqual(tx.outs.length, 3);
      const paid = (address: string) => tx.outs.find(output => bitcoinAddress.fromOutputScript(output.script) === address);
      assert.strictEqual(paid(recipient2)?.value, 10000n, `got txhex ${tx.toHex()}`);
      assert.strictEqual(paid(recipient)?.value, 20000n, `got txhex ${tx.toHex()}`);
    },
    CASE_TIMEOUT,
  );

  test(
    'can sendMAX',
    async driver => {
      await importFundedWallet(driver);
      await send(driver);
      await setCustomFeeRate(driver, 2);

      // first send MAX output
      await replaceId(driver, 'AddressInput', recipient2);
      await replaceAmount(driver, '0.0001');
      await useFullBalance(driver);
      let tx = await createTransaction(driver);
      assert.strictEqual(tx.outs.length, 1, 'should be single output, no change');
      assert.ok(Number(tx.outs[0].value) > 100000);

      // add second output with amount
      await back(driver);
      await back(driver);
      await addRecipient(driver, 'Transaction1', recipient, '0.0001');
      tx = await createTransaction(driver);
      assert.strictEqual(tx.outs.length, 2, 'should be two outputs, no change');
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), recipient2);
      assert.ok(tx.outs[0].value > 50000n);
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[1].script), recipient);
      assert.strictEqual(tx.outs[1].value, 10000n);
    },
    CASE_TIMEOUT,
  );

  test(
    'can cosign psbt',
    async driver => {
      await importFundedWallet(driver);
      await send(driver);
      await tapHeaderMenuItem(driver, 'Sign a transaction');
      // 1 input, 2 outputs. wallet can fully sign this tx
      await scanText(
        driver,
        'cHNidP8BAFICAAAAAXYa7FEQBAQ2X0B48aHHKKgzkVuHfQ2yCOi3v9RR0IqlAQAAAAAAAACAAegDAAAAAAAAFgAUSnH40G+jiJfreeRb36cs641KFm8AAAAAAAEBH5YVAAAAAAAAFgAUTKHjDm4OJQSbvy9uzyLYi5i5XIoiBgMQcGrP5TIMrdvb73yB4WnZvkPzKr1EzJXJYBHWmlPJZRgAAAAAVAAAgAAAAIAAAACAAQAAAD4AAAAAAA==',
      );
      // this is a fully-signed tx, "this is tx hex" help text should appear
      await waitForId(driver, 'DynamicCode');
      const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      assert.strictEqual(tx.ins.length, 1);
      assert.strictEqual(tx.outs.length, 1);
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), 'bc1qffcl35r05wyf06meu3dalfevawx559n0ufrxcw');
      assert.strictEqual(tx.outs[0].value, 1000n);
    },
    CASE_TIMEOUT,
  );

  test(
    'payment codes & manage contacts',
    async driver => {
      const contact = '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS';
      const silentPayment =
        'sp1qqgste7k9hx0qftg6qmwlkqtwuy6cycyavzmzj85c6qdfhjdpdjtdgqjuexzk6murw56suy3e0rd2cgqvycxttddwsvgxe2usfpxumr70xc9pkqwv';
      const paymentCode =
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
      const ownPaymentCode =
        'PM8TJbcHbQFgBL5mAYUCxJEhsz8F66abWAnVqiq6Pa8Rav8qG6XjaJQmSzNqgc1k63ipiEnobNpAoxNJVzRkdoUEANj9KyBEjLt4hL99RMoa8iJXwwwM';
      const openContacts = async () => {
        await walletDetails(driver, FUNDED_LABEL);
        await scrollDownToText(driver, 'WalletDetailsScroll', 'Contacts,', 'prefix');
        await clickRow(driver, 'elementType == 9 AND label BEGINSWITH "Contacts,"');
        await waitForText(driver, 'Add Contact');
      };

      await importFundedWallet(driver);
      await walletDetails(driver, FUNDED_LABEL);
      await scrollDownToId(driver, 'WalletDetailsScroll', 'BIP47Switch');
      if ((await getText(driver, 'BIP47Switch')) !== '1') {
        await tapId(driver, 'BIP47Switch');
        await expectText(driver, 'BIP47Switch', '1');
      }
      await backToWallets(driver);

      // payment code is shown on the receive screen
      await openWallet(driver, FUNDED_LABEL);
      await receive(driver);
      await tapText(driver, 'Payment Code');
      await waitForText(driver, ownPaymentCode);
      await backToWallets(driver);

      // contacts list
      await step('Open contacts', openContacts);
      for (const value of [contact, silentPayment]) {
        await tapText(driver, 'Add Contact');
        await prompt(driver, value);
        await waitForText(driver, shortened(value));
      }
      await tapText(driver, 'Add Contact');
      await prompt(driver, paymentCode);
      await waitForText(driver, 'On-chain transaction needed');
      await tapButtonWithLabel(driver, 'Cancel');

      // rename a contact
      await tapId(driver, 'ContactListItem0');
      await tapText(driver, 'Rename contact');
      await prompt(driver, 'c0ntact');
      await waitForText(driver, 'c0ntact');

      // a real transaction with our contacts
      await back(driver);
      await back(driver);
      await send(driver);
      await tapHeaderMenuItem(driver, 'Insert Contact');
      await tapId(driver, 'ContactListItem0');
      await replaceAmount(driver, '0.0001');
      await tapHeaderMenuItem(driver, 'Add Recipient');
      await waitForId(driver, 'Transaction1');
      await tapHeaderMenuItem(driver, 'Insert Contact');
      await tapId(driver, 'ContactListItem1');
      await replaceAmount(driver, '0.0002', 'Transaction1');
      await setCustomFeeRate(driver, 1);
      const tx = await step('Create batch transaction for both contacts', () => createTransaction(driver));
      assert.strictEqual(tx.outs.length, 3);
      assert.strictEqual(hex(tx.outs[0].script), '76a91419129d53e6319baf19dba059bead166df90ab8f588ac');
      assert.strictEqual(tx.outs[0].value, 10000n);
      assert.strictEqual(hex(tx.outs[1].script), '5120b81959cd9a4954cd525916cd636b4ffe9466600412ccd162653a0f464489f1a8');
      assert.strictEqual(tx.outs[1].value, 20000n);
    },
    CASE_TIMEOUT,
  );

  test(
    'can do basic wallet-details operations',
    async driver => {
      await importFundedWallet(driver);
      await walletDetails(driver, FUNDED_LABEL);

      // rename and rename back
      await tapId(driver, 'WalletNameEditButton');
      await prompt(driver, 'testname');
      await expectText(driver, 'WalletNameDisplay', 'testname');
      await backToWallets(driver);
      await waitForId(driver, 'testname');
      await walletDetails(driver, 'testname');
      await tapId(driver, 'WalletNameEditButton');
      await prompt(driver, FUNDED_LABEL);
      await expectText(driver, 'WalletNameDisplay', FUNDED_LABEL);
      await backToWallets(driver);
      await walletDetails(driver, FUNDED_LABEL);

      // wallet export
      await scrollDownToId(driver, 'WalletDetailsScroll', 'WalletExport');
      await tapId(driver, 'WalletExport');
      // assert.ok: a mismatch must not print the mnemonic into the CI log.
      assert.ok((await readSeed(driver)) === secret('HD_MNEMONIC_BIP84'), 'WalletExport does not show the imported mnemonic');
      await back(driver);

      // XPUB
      await scrollDownToId(driver, 'WalletDetailsScroll', 'XpubButton');
      await tapId(driver, 'XpubButton');
      await waitForId(driver, 'CopyTextToClipboard');
      await back(driver);
      await backToWallets(driver);

      // ManageWallets opens on long press
      const card = await waitForId(driver, FUNDED_LABEL);
      await activate(driver);
      await driver.execute('macos: clickAndDrag', { sourceElementId: card.elementId, destinationElementId: card.elementId, duration: 1 });
      await waitForId(driver, 'NavigationCloseButton');
      await waitForId(driver, FUNDED_LABEL);
      await tapId(driver, 'NavigationCloseButton');
      await waitForIdGone(driver, 'NavigationCloseButton');
      await waitForId(driver, 'CreateAWallet');
    },
    CASE_TIMEOUT,
  );

  test(
    'should handle URL successfully',
    async driver => {
      await importFundedWallet(driver);
      // Explicit target prevents Launch Services from opening an installed production wallet.
      await driver.execute('macos: deepLink', {
        url: 'bitcoin:BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=0.0001&label=Yo',
        bundleId: BUNDLE_ID,
      });
      await waitForId(driver, 'chooseFee');
      await setCustomFeeRate(driver, 2);
      await tapId(driver, 'CreateTransactionButton');
      await expectText(driver, 'TransactionValue', '0.0001');
      await expectText(driver, 'TransactionAddress', 'BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7');
    },
    CASE_TIMEOUT,
  );

  test(
    'can manage UTXO',
    async driver => {
      await importFundedWallet(driver);
      const txid = '8b0ab2c7196312e021e0d3dc73f801693826428782970763df6134457bd2ec20';

      // note on the 0.00069909 transaction
      await openTransaction(driver, '0.00069909');
      await expectText(driver, 'TransactionIdDisplayText', shortened(txid));
      // Transaction ID is intentionally shortened in UI; the full txid is the copy button's label.
      assert.strictEqual(await getText(driver, 'TransactionIdCopyButton'), txid);
      await tapText(driver, 'add');
      await prompt(driver, 'Test1');
      await waitForText(driver, 'Test1');

      // restart to confirm the note is persisted, then change it in coin control and freeze the coin
      await relaunch(driver);
      await openWallet(driver, FUNDED_LABEL);
      await send(driver);
      await tapHeaderMenuItem(driver, 'Coin Control');
      await waitForIdGone(driver, 'Loading', 300_000);
      await openCoin(driver, 'Test1');
      await replaceId(driver, 'OutputMemo', 'Test2');
      await tapId(driver, 'FreezeSwitch');
      await expectText(driver, 'FreezeSwitch', '1');
      await back(driver);
      await waitForIdGone(driver, 'OutputMemo');
      // The FrozenBadge text is part of the coin row's label.
      await waitForRowContaining(driver, 'Test2, Freeze');

      // A frozen coin cannot be spent. Unfreeze it, then use that coin.
      await openCoin(driver, 'Test2');
      await tapId(driver, 'FreezeSwitch');
      await expectText(driver, 'FreezeSwitch', '0');
      await tapId(driver, 'UseCoin');
      await replaceId(driver, 'AddressInput', recipient);
      await useFullBalance(driver);
      await setCustomFeeRate(driver, 1);
      const tx1 = await createTransaction(driver);
      assert.strictEqual(tx1.outs.length, 1);
      assert.strictEqual(hex(tx1.outs[0].script), '00147ea385f352be696ab0f6e94a0ee0e3c6d4b14a53');
      assert.strictEqual(tx1.outs[0].value, 69797n);
      assert.strictEqual(tx1.ins.length, 1);
      assert.strictEqual(hex(tx1.ins[0].hash), '20ecd27b453461df63079782874226386901f873dcd3e021e0126319c7b20a8b');
      assert.strictEqual(tx1.ins[0].index, 0);

      // Freeze that coin again so full balance skips it and spends the other coins.
      await back(driver);
      await back(driver);
      await back(driver);
      await send(driver);
      await tapHeaderMenuItem(driver, 'Coin Control');
      await waitForIdGone(driver, 'Loading', 300_000);
      await openCoin(driver, 'Test2');
      await tapId(driver, 'FreezeSwitch');
      await expectText(driver, 'FreezeSwitch', '1');
      await back(driver);
      await back(driver);
      await waitForId(driver, 'AddressInput');
      await replaceId(driver, 'AddressInput', recipient);
      await useFullBalance(driver);
      await setCustomFeeRate(driver, 1);
      const tx2 = await createTransaction(driver);
      assert.strictEqual(tx2.outs.length, 1);
      assert.strictEqual(hex(tx2.outs[0].script), '00147ea385f352be696ab0f6e94a0ee0e3c6d4b14a53');
      assert.strictEqual(tx2.outs[0].value, 35369n);
      assert.strictEqual(tx2.ins.length, 3);
      const inputHashes = tx2.ins.map(input => hex(input.hash));
      // Full balance must skip the frozen coin. Input order follows the latest UTXO fetch.
      assert.ok(!inputHashes.includes('20ecd27b453461df63079782874226386901f873dcd3e021e0126319c7b20a8b'));
      assert.ok(inputHashes.includes('d479264875a0f7c4a84e47141be005404531a8655f2388ae21e89a9701f14c10'));
    },
    CASE_TIMEOUT,
  );

  test(
    'can purge txs and balance, then refetch data from tx list screen and see data on screen update',
    async driver => {
      await importFundedWallet(driver);
      await purge(driver);
      // View › Reload Transactions is the desktop pull-to-refresh.
      await selectMenuItem(driver, 'View', 'Reload Transactions');
      await expectText(driver, 'WalletBalance', FUNDED_BALANCE, 120_000);
      await waitForIdGone(driver, 'TransactionsListEmpty');
      assert.ok((await transactionRows(driver).length) >= 3); // 3 is arbitrary, real txs on screen depend on screen size
    },
    CASE_TIMEOUT,
  );

  test(
    'can purge txs and balance, then restart the app and witness it to refetch tx list screen and balance',
    async driver => {
      await importFundedWallet(driver);
      await purge(driver);
      await relaunch(driver);
      await openWallet(driver, FUNDED_LABEL);
      await expectText(driver, 'WalletBalance', FUNDED_BALANCE, 120_000);
      await waitForIdGone(driver, 'TransactionsListEmpty');
      assert.ok((await transactionRows(driver).length) >= 2); // 2 is arbitrary, real txs on screen depend on screen size
    },
    CASE_TIMEOUT,
  );
});
