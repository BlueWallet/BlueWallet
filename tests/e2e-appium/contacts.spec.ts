import assert from 'assert';
import { Transaction, address as bitcoinAddress } from 'bitcoinjs-lib';
import { catalystSuite, step } from './suite';
import { importWallet, openWallet, receive, walletDetails } from './flows';
import { MNEMONIC } from './electrum';
import {
  activate,
  clipboard,
  expectText,
  getText,
  pressKey,
  prompt,
  relaunch,
  replaceAmount,
  replaceFocusedText,
  scrollDownToId,
  scrollDownToText,
  setClipboard,
  tapButtonWithLabel,
  tapId,
  tapHeaderMenuItem,
  tapText,
  waitForText,
} from './driver';
import { assertFixtureTransactionSigned } from './transactionAssertions';
import contactFixture from './fixtures/contacts.json';

const label = 'Imported HD SegWit (BIP84 Bech32 Native)';
const { address, silentPayment, paymentCode, silentPaymentScript, ownPaymentCode } = contactFixture;
const contacts = async (driver: Parameters<typeof walletDetails>[0]) => {
  await walletDetails(driver, label);
  await scrollDownToText(driver, 'WalletDetailsScroll', 'Contacts,', 'prefix');
  await activate(driver);
  await driver.$('-ios predicate string:elementType == 9 AND label BEGINSWITH "Contacts,"').click();
  await waitForText(driver, 'Add Contact');
};
const enablePaymentCodes = async (driver: Parameters<typeof walletDetails>[0]) => {
  await importWallet(driver, MNEMONIC, 'HDsegwitBech32', label);
  await tapId(driver, 'WalletDetails');
  await scrollDownToId(driver, 'WalletDetailsScroll', 'BIP47Switch');
  await tapId(driver, 'BIP47Switch');
  await expectText(driver, 'BIP47Switch', '1');
  await relaunch(driver);
};

catalystSuite('Contacts and payment codes', test => {
  test('shows the persisted BIP47 payment code on Receive and copies it exactly', async driver => {
    await enablePaymentCodes(driver);
    await openWallet(driver, label);
    await receive(driver);
    await tapText(driver, 'Payment Code');
    await waitForText(driver, ownPaymentCode);
    await setClipboard(driver, '');
    await tapId(driver, 'CopyTextToClipboard');
    assert.strictEqual(await clipboard(driver), ownPaymentCode);
  });
  test(
    'adds contacts, persists a rename and signs a batch payment to address and silent-payment contacts',
    async driver => {
      await step('Prepare wallet with payment codes', () => enablePaymentCodes(driver));
      await step('Open contacts for creation', () => contacts(driver));
      for (const value of [address, silentPayment]) {
        await tapText(driver, 'Add Contact');
        await prompt(driver, value);
        await waitForText(driver, `${value.slice(0, 10)}...${value.slice(-10)}`);
      }
      await tapText(driver, 'Add Contact');
      await prompt(driver, paymentCode);
      await waitForText(driver, 'On-chain transaction needed');
      await tapButtonWithLabel(driver, 'Cancel');
      await tapText(driver, `${address.slice(0, 10)}...${address.slice(-10)}`);
      await tapText(driver, 'Rename contact');
      await prompt(driver, 'Catalyst contact');
      await waitForText(driver, 'Catalyst contact');
      await relaunch(driver);
      await step('Reopen contacts after rename and restart', () => contacts(driver));
      await waitForText(driver, 'Catalyst contact');
      await tapText(driver, 'Catalyst contact');
      await setClipboard(driver, '');
      await tapText(driver, 'Copy Payment Code');
      assert.strictEqual(await clipboard(driver), address);
      await tapText(driver, 'Catalyst contact');
      await tapText(driver, 'Pay this contact');
      await expectText(driver, 'AddressInput', address);
      await replaceAmount(driver, '0.0001');
      await tapHeaderMenuItem(driver, 'Add Recipient');
      await tapHeaderMenuItem(driver, 'Insert Contact');
      await tapText(driver, `${silentPayment.slice(0, 10)}...${silentPayment.slice(-10)}`);
      await replaceAmount(driver, '0.0002', 'Transaction1');
      await tapId(driver, 'chooseFee');
      await tapId(driver, 'feeCustomContainerButton');
      await replaceFocusedText(driver, '2');
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      await step('Create batch transaction for both contacts', () => tapId(driver, 'CreateTransactionButton'));
      await tapId(driver, 'TransactionDetailsButton');
      const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      await assertFixtureTransactionSigned(tx);
      assert.strictEqual(tx.outs.length, 3);
      assert.strictEqual(bitcoinAddress.fromOutputScript(tx.outs[0].script), address);
      assert.strictEqual(tx.outs[0].value, 10000n);
      assert.strictEqual(tx.outs[1].value, 20000n);
      assert.strictEqual(tx.ins.length, 1);
      assert.strictEqual(tx.ins[0].index, 0);
      assert.strictEqual(Buffer.from(tx.outs[1].script).toString('hex'), silentPaymentScript);
    },
    20 * 60_000,
  ); // Intel passed in 589.6s; the repeat was still progressing when the 600s budget expired.
});
