import assert from 'assert';
import { Psbt, Transaction, address } from 'bitcoinjs-lib';
import { catalystSuite, step } from './suite';
import { BUNDLE_ID } from './config';
import { importWallet, openWallet, scanText } from './flows';
import { MNEMONIC, VALUES, FUNDING_TXID, ADDRESS } from './electrum';
import {
  back,
  assertMenuItemAbsent,
  activate,
  clipboard,
  COMMAND,
  SHIFT,
  expectText,
  getText,
  pressKey,
  prompt,
  relaunch,
  replaceId,
  replaceAmount,
  replaceFocusedText,
  selectMenuItem,
  setClipboard,
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
import { assertFixtureTransactionSigned } from './transactionAssertions';

const label = 'Imported HD SegWit (BIP84 Bech32 Native)';
const recipient = 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl';
const recipient2 = 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7';
const total = VALUES.reduce((sum, value) => sum + value, 0);
const fund = async (driver: Driver) => {
  await importWallet(driver, MNEMONIC, 'HDsegwitBech32', label);
  await expectText(driver, 'WalletBalance', String(total / 1e8));
};
const transactionRow = (driver: Driver) => driver.$('-ios predicate string:elementType == 9 AND label BEGINSWITH "Incoming Transaction,"');
const openTransaction = async (driver: Driver) => {
  const row = transactionRow(driver);
  await row.waitForExist({ timeout: 30_000 });
  await activate(driver);
  await row.click();
};
const fee = async (driver: Driver) => {
  await tapId(driver, 'chooseFee');
  await tapId(driver, 'feeCustomContainerButton');
  await replaceFocusedText(driver, '2');
  await pressKey(driver, 'XCUIKeyboardKeyReturn');
  await waitForId(driver, 'chooseFee');
};
const transaction = async (driver: Driver) => {
  await tapId(driver, 'CreateTransactionButton');
  await tapId(driver, 'TransactionDetailsButton');
  return Transaction.fromHex(await getText(driver, 'TxhexInput'));
};

catalystSuite('Transactions with local Electrum fixtures', test => {
  // Temporarily deferred: hosted Intel macOS aborts in Metal/RenderBox during
  // address input. Re-enable after resolving CI run 38456922450's native crash.
  test.skip('creates and signs a payment with the requested amount, recipient and fee', async driver => {
    await fund(driver);
    await tapId(driver, 'SendButton');
    await replaceId(driver, 'AddressInput', recipient, 'type');
    await replaceAmount(driver, '0.0001');
    await fee(driver);
    const tx = await transaction(driver);
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.strictEqual(tx.outs[0].value, 10000n);
  });
  test('sends the full balance without creating change', async driver => {
    await fund(driver);
    await tapId(driver, 'SendButton');
    await replaceId(driver, 'AddressInput', recipient);
    await fee(driver);
    await tapHeaderMenuItem(driver, 'Use Full Balance');
    await tapButtonWithLabel(driver, 'OK');
    const tx = await transaction(driver);
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(tx.ins.length, VALUES.length);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.ok(tx.outs[0].value > 100000n && tx.outs[0].value < BigInt(total));
  });
  test('batch sends to multiple recipients', async driver => {
    await fund(driver);
    await tapId(driver, 'SendButton');
    await replaceId(driver, 'AddressInput', recipient);
    await replaceAmount(driver, '0.0001');
    await fee(driver);
    await tapHeaderMenuItem(driver, 'Add Recipient');
    const row = await waitForId(driver, 'Transaction1');
    const field = await row.$('~AddressInput');
    await activate(driver);
    await field.click();
    await replaceFocusedText(driver, recipient2);
    assert.strictEqual(await field.getAttribute('value'), recipient2);
    await replaceAmount(driver, '0.0002', 'Transaction1');
    const tx = await transaction(driver);
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(tx.outs.length, 3);
    assert.ok(tx.outs.some(output => address.fromOutputScript(output.script) === recipient && output.value === 10000n));
    assert.ok(tx.outs.some(output => address.fromOutputScript(output.script) === recipient2 && output.value === 20000n));
  });
  test('BIP21 scan sets the amount and address before signing', async driver => {
    await fund(driver);
    await tapId(driver, 'SendButton');
    await tapId(driver, 'BlueAddressInputScanQrButton');
    await scanText(driver, `bitcoin:${recipient}?amount=0.00015&label=Catalyst&pj=https://example.com/payjoin`);
    await fee(driver);
    await tapId(driver, 'CreateTransactionButton');
    await waitForId(driver, 'PayjoinSwitch');
    await tapId(driver, 'TransactionDetailsButton');
    const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.strictEqual(tx.outs[0].value, 15000n);
  });
  test('converts BTC to sats and preserves the amount when scanning a bare address', async driver => {
    await fund(driver);
    await tapId(driver, 'SendButton');
    await replaceAmount(driver, '0.0005');
    await tapId(driver, 'changeAmountUnitButton');
    await tapId(driver, 'BlueAddressInputScanQrButton');
    await scanText(driver, recipient);
    await fee(driver);
    const tx = await transaction(driver);
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.strictEqual(tx.outs[0].value, 50000n);
  });
  test('opens a BIP21 URL in the isolated app and signs its requested payment', async driver => {
    await fund(driver);
    // Explicit target prevents Launch Services from opening an installed production wallet.
    await driver.execute('macos: deepLink', { url: `bitcoin:${recipient}?amount=0.0001&label=Catalyst`, bundleId: BUNDLE_ID });
    await waitForId(driver, 'chooseFee');
    await fee(driver);
    const tx = await transaction(driver);
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.strictEqual(tx.outs[0].value, 10000n);
  });
  test('keeps fiat units when scanning a bare address and signs the converted amount', async driver => {
    // Seed a fresh cache in the E2E sandbox's real native preferences.
    // This is a synthetic USD rate, not a live quote.
    await relaunch(driver, {
      reset: true,
      defaults: {
        preferredCurrency: 'USD',
        preferredCurrencyLocale: 'en_US',
        exchangeRates: JSON.stringify({ BTC_USD: 50_000, LAST_UPDATED: Date.now(), LAST_UPDATED_ERROR: false }),
      },
    });
    await fund(driver);
    await tapId(driver, 'SendButton');
    await replaceAmount(driver, '0.0001');
    await tapId(driver, 'changeAmountUnitButton'); // sats
    await tapId(driver, 'changeAmountUnitButton'); // USD
    await tapId(driver, 'BlueAddressInputScanQrButton');
    await scanText(driver, recipient);
    await fee(driver);
    const converted = await transaction(driver);
    await assertFixtureTransactionSigned(converted);
    assert.strictEqual(converted.outs[0].value, 10000n);
    await back(driver);
    await back(driver);
    await replaceAmount(driver, '5.5');
    await tapId(driver, 'BlueAddressInputScanQrButton');
    await scanText(driver, recipient);
    await fee(driver);
    const tx = await transaction(driver);
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.strictEqual(tx.outs[0].value, 11000n);
  });
  test('cosigns an imported PSBT with the wallet key', async driver => {
    await fund(driver);
    // Public BIP84 vector m/84'/0'/0'/0/0, matching the synthetic funding output.
    const psbt = new Psbt()
      .addInput({
        hash: FUNDING_TXID,
        index: 0,
        witnessUtxo: { script: address.toOutputScript(ADDRESS), value: BigInt(VALUES[0]) },
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from('73c5da0a', 'hex'),
            path: "m/84'/0'/0'/0/0",
            pubkey: Buffer.from('0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c', 'hex'),
          },
        ],
      })
      .addOutput({ address: recipient, value: BigInt(VALUES[0] - 220) });
    await tapId(driver, 'SendButton');
    await tapHeaderMenuItem(driver, 'Sign a transaction');
    await scanText(driver, psbt.toBase64());
    const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
    await assertFixtureTransactionSigned(tx);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual(address.fromOutputScript(tx.outs[0].script), recipient);
    assert.strictEqual(tx.outs[0].value, BigInt(VALUES[0] - 220));
  });
  test('transaction note persists and Copy Transaction ID copies the full ID', async driver => {
    await fund(driver);
    await openTransaction(driver);
    await assertMenuItemAbsent(driver, 'Edit', 'Copy Address');
    for (const shortcut of [false, true]) {
      // CopyTextToClipboard ignores repeated actions while its "Copied!"
      // feedback is visible. Exercise each command after that state resets.
      await expectText(driver, 'TransactionIdDisplayText', `${FUNDING_TXID.slice(0, 10)}...${FUNDING_TXID.slice(-10)}`);
      await setClipboard(driver, 'empty');
      if (shortcut) await pressKey(driver, 'c', COMMAND | SHIFT);
      else await selectMenuItem(driver, 'Edit', 'Copy Transaction ID');
      await driver.waitUntil(async () => (await clipboard(driver)) === FUNDING_TXID, {
        timeout: 5_000,
        timeoutMsg: 'Copy Transaction ID did not put the full transaction ID on the clipboard',
      });
    }
    await tapText(driver, 'add');
    await prompt(driver, 'Catalyst transaction note');
    await waitForText(driver, 'Catalyst transaction note');
    await relaunch(driver);
    await openWallet(driver, label);
    await openTransaction(driver);
    await tapText(driver, 'Catalyst transaction note');
  });
  test(
    'coin control saves a note and excludes a frozen coin from full balance',
    async driver => {
      const openCoin = async () => {
        // The accessible row combines its amount, memo and badges on Catalyst.
        const coin = driver.$('-ios predicate string:label BEGINSWITH "0.00069909" OR value BEGINSWITH "0.00069909"');
        await coin.waitForExist({ timeout: 30_000 });
        await activate(driver);
        await coin.click();
      };
      await step('Import funded wallet for coin control', () => fund(driver));
      await tapId(driver, 'SendButton');
      await tapHeaderMenuItem(driver, 'Coin Control');
      await waitForIdGone(driver, 'Loading');
      await openCoin();
      await replaceId(driver, 'OutputMemo', 'Frozen test coin');
      await tapId(driver, 'FreezeSwitch');
      await step('Verify coin is frozen', () => expectText(driver, 'FreezeSwitch', '1'));
      await back(driver);
      await step('Restart to verify persisted coin metadata', () => relaunch(driver));
      await openWallet(driver, label);
      await tapId(driver, 'SendButton');
      await tapHeaderMenuItem(driver, 'Coin Control');
      await openCoin();
      await expectText(driver, 'OutputMemo', 'Frozen test coin');
      await step('Verify frozen state survived restart', () => expectText(driver, 'FreezeSwitch', '1'));
      await back(driver);
      await back(driver);
      await replaceId(driver, 'AddressInput', recipient);
      await fee(driver);
      await tapHeaderMenuItem(driver, 'Use Full Balance');
      await tapButtonWithLabel(driver, 'OK');
      const tx = await step('Create full-balance transaction excluding the frozen coin', () => transaction(driver));
      await assertFixtureTransactionSigned(tx);
      assert.strictEqual(tx.ins.length, VALUES.length - 1);
      assert.ok(tx.ins.every(input => input.index !== 0));
    },
    20 * 60_000,
  ); // Intel passes took 546–592s; run 38736838958 reached Create at the 600s deadline.
  test('Reload Transactions restores a purged balance and history', async driver => {
    await fund(driver);
    await tapId(driver, 'WalletDetails');
    await tapRepeatedly(driver, 'PurgeBackdoorButton', 11);
    await tapButtonWithLabel(driver, 'OK');
    await back(driver);
    await expectText(driver, 'WalletBalance', '0');
    await selectMenuItem(driver, 'View', 'Reload Transactions');
    await expectText(driver, 'WalletBalance', String(total / 1e8));
    await transactionRow(driver).waitForExist({ timeout: 30_000 });
  });
  test('reloads purged transactions and balance after restarting the app', async driver => {
    await fund(driver);
    await tapId(driver, 'WalletDetails');
    await tapRepeatedly(driver, 'PurgeBackdoorButton', 11);
    await tapButtonWithLabel(driver, 'OK');
    await relaunch(driver);
    await openWallet(driver, label);
    await expectText(driver, 'WalletBalance', String(total / 1e8));
    await transactionRow(driver).waitForExist({ timeout: 30_000 });
  });
});
