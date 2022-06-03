import { helperDeleteWallet, sleep, hashIt, sup, helperImportWallet, yo, extractTextFromElementById } from './helperz';
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');

beforeAll(async () => {
  if (!process.env.HD_MNEMONIC_BIP84) {
    console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
    return;
  }

  console.log('before all - importing bip48');
  await helperImportWallet(process.env.HD_MNEMONIC_BIP84, 'HDsegwitBech32', 'Imported HD SegWit (BIP84 Bech32 Native)', '0.00105526 BTC');
  await device.pressBack();
  await sleep(15000);
}, 1200000);

afterAll(async () => {
  if (!process.env.HD_MNEMONIC_BIP84) {
    console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
    return;
  }

  console.log('after all - deleting bip84');
  await helperDeleteWallet('Imported HD SegWit (BIP84 Bech32 Native)', '105526');
});

describe('BlueWallet UI Tests - import BIP84 wallet', () => {
  it('can import BIP84 mnemonic, fetch balance & transactions, then create a transaction; then cosign', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t21');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t21'), 'as it previously passed on Travis');
    }
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    // go inside the wallet
    await element(by.text('Imported HD SegWit (BIP84 Bech32 Native)')).tap();

    // lets create real transaction:
    await element(by.id('SendButton')).tap();
    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput')).typeText('0.0001\n');

    // setting fee rate:
    const feeRate = 2;
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText(feeRate + '');
    await element(by.text('OK')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    // created. verifying:
    await yo('TransactionValue');
    await expect(element(by.id('TransactionValue'))).toHaveText('0.0001');
    const transactionFee = await extractTextFromElementById('TransactionFee');
    assert.ok(transactionFee.startsWith('Fee: 0.00000292 BTC'), 'Unexpected tx fee: ' + transactionFee);
    await element(by.id('TransactionDetailsButton')).tap();

    let txhex = await extractTextFromElementById('TxhexInput');

    let transaction = bitcoin.Transaction.fromHex(txhex);
    assert.ok(transaction.ins.length === 1 || transaction.ins.length === 2); // depending on current fees gona use either 1 or 2 inputs
    assert.strictEqual(transaction.outs.length, 2);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl'); // to address
    assert.strictEqual(transaction.outs[0].value, 10000);

    // checking fee rate:
    const totalIns = 69909; // we hardcode it since we know it in advance
    const totalOuts = transaction.outs.map(el => el.value).reduce((a, b) => a + b, 0);
    const tx = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(Math.round((totalIns - totalOuts) / tx.virtualSize()), feeRate);
    assert.strictEqual(transactionFee.split(' ')[1] * 100000000, totalIns - totalOuts);

    if (device.getPlatform() === 'ios') {
      console.warn('rest of the test is Android only, skipped');
      return;
    }

    // now, testing scanQR with bip21:

    await device.pressBack();
    await device.pressBack();
    await element(by.id('changeAmountUnitButton')).tap(); // switched to SATS
    await element(by.id('BlueAddressInputScanQrButton')).tap();

    // tapping 5 times invisible button is a backdoor:
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
      await sleep(1000);
    }

    const bip21 = 'bitcoin:bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.00015&pj=https://btc.donate.kukks.org/BTC/pj';
    await element(by.id('scanQrBackdoorInput')).replaceText(bip21);
    await element(by.id('scanQrBackdoorOkButton')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}
    // created. verifying:
    await yo('TransactionValue');
    await yo('PayjoinSwitch');
    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7');
    assert.strictEqual(transaction.outs[0].value, 15000);

    // now, testing scanQR with just address after amount set to 1.1 USD. Denomination should not change after qrcode scan

    await device.pressBack();
    await device.pressBack();
    await element(by.id('changeAmountUnitButton')).tap(); // switched to SATS
    await element(by.id('changeAmountUnitButton')).tap(); // switched to FIAT
    await element(by.id('BitcoinAmountInput')).replaceText('1.1');
    await element(by.id('BlueAddressInputScanQrButton')).tap();

    // tapping 5 times invisible button is a backdoor:
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
      await sleep(1000);
    }

    await element(by.id('scanQrBackdoorInput')).replaceText('bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7');
    await element(by.id('scanQrBackdoorOkButton')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}
    // created. verifying:
    await yo('TransactionValue');
    await yo('PayjoinSwitch');
    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7');
    assert.notEqual(transaction.outs[0].value, 110000000); // check that it is 1.1 USD, not 1 BTC
    assert.ok(transaction.outs[0].value < 10000); // 1.1 USD ~ 0,00001964 sats in march 2021

    // now, testing units switching, and then creating tx with SATS:

    await device.pressBack();
    await device.pressBack();
    await element(by.id('changeAmountUnitButton')).tap(); // switched to BTC
    await element(by.id('BitcoinAmountInput')).replaceText('0.00015');
    await element(by.id('changeAmountUnitButton')).tap(); // switched to sats
    assert.strictEqual(await extractTextFromElementById('BitcoinAmountInput'), '15000');
    await element(by.id('changeAmountUnitButton')).tap(); // switched to FIAT
    await element(by.id('changeAmountUnitButton')).tap(); // switched to BTC
    assert.strictEqual(await extractTextFromElementById('BitcoinAmountInput'), '0.00015');
    await element(by.id('changeAmountUnitButton')).tap(); // switched to sats
    await element(by.id('BitcoinAmountInput')).replaceText('50000');

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}
    // created. verifying:
    await yo('TransactionValue');
    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(transaction.outs.length, 2);
    assert.strictEqual(transaction.outs[0].value, 50000);

    // now, testing send many feature

    await device.pressBack();
    await device.pressBack();
    // we already have one output, lest add another two
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('AddRecipient')).tap();
    await yo('Transaction1'); // adding a recipient autoscrolls it to the last one
    await element(by.id('AddressInput').withAncestor(by.id('Transaction1'))).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput').withAncestor(by.id('Transaction1'))).typeText('0.0002\n');

    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('AddRecipient')).tap();
    await yo('Transaction2'); // adding a recipient autoscrolls it to the last one

    // remove last output, check if second output is shown
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('RemoveRecipient')).tap();
    await yo('Transaction1');

    // adding it again
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('AddRecipient')).tap();
    await yo('Transaction2'); // adding a recipient autoscrolls it to the last one
    await element(by.id('AddressInput').withAncestor(by.id('Transaction2'))).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput').withAncestor(by.id('Transaction2'))).typeText('0.0003\n');

    // remove second output
    await element(by.id('Transaction2')).swipe('right', 'fast', NaN, 0.2);
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('RemoveRecipient')).tap();

    // creating and verifying. tx should have 3 outputs
    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(transaction.outs.length, 3);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7');
    assert.strictEqual(transaction.outs[0].value, 50000);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[1].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    assert.strictEqual(transaction.outs[1].value, 30000);

    // now, testing sendMAX feature:

    await device.pressBack();
    await device.pressBack();
    await device.pressBack(); // go back to wallet tx list to reset the form
    await element(by.id('SendButton')).tap();

    // set fee rate
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText(feeRate + '');
    await element(by.text('OK')).tap();

    // first send MAX output
    await element(by.id('AddressInput')).replaceText('bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7');
    await element(by.id('BitcoinAmountInput')).typeText('0.0001\n');
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('sendMaxButton')).tap();
    await element(by.text('OK')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}
    // created. verifying:
    await yo('TransactionDetailsButton');
    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(transaction.outs.length, 1, 'should be single output, no change');
    assert.ok(transaction.outs[0].value > 100000);

    // add second output with amount
    await device.pressBack();
    await device.pressBack();
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('AddRecipient')).tap();
    await yo('Transaction1');
    await element(by.id('AddressInput').withAncestor(by.id('Transaction1'))).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput').withAncestor(by.id('Transaction1'))).typeText('0.0001\n');

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}
    // created. verifying:
    await yo('TransactionDetailsButton');
    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(transaction.outs.length, 2, 'should be single output, no change');
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7');
    assert.ok(transaction.outs[0].value > 50000);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[1].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    assert.strictEqual(transaction.outs[1].value, 10000);

    // now, testing cosign psbt:

    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    await element(by.id('SendButton')).tap();
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('PsbtSign')).tap();

    // tapping 5 times invisible button is a backdoor:
    for (let c = 0; c <= 5; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
      await sleep(1000);
    }
    // 1 input, 2 outputs. wallet can fully sign this tx
    const psbt =
      'cHNidP8BAFICAAAAAXYa7FEQBAQ2X0B48aHHKKgzkVuHfQ2yCOi3v9RR0IqlAQAAAAAAAACAAegDAAAAAAAAFgAUSnH40G+jiJfreeRb36cs641KFm8AAAAAAAEBH5YVAAAAAAAAFgAUTKHjDm4OJQSbvy9uzyLYi5i5XIoiBgMQcGrP5TIMrdvb73yB4WnZvkPzKr1EzJXJYBHWmlPJZRgAAAAAVAAAgAAAAIAAAACAAQAAAD4AAAAAAA==';
    await element(by.id('scanQrBackdoorInput')).replaceText(psbt);
    await element(by.id('scanQrBackdoorOkButton')).tap();

    // this is fully-signed tx, "this is tx hex" help text should appear
    await yo('DynamicCode');
    await device.pressBack();
    await device.pressBack();

    // let's test wallet details screens
    await element(by.id('WalletDetails')).tap();

    // rename test
    await element(by.id('WalletNameInput')).replaceText('testname\n');
    await element(by.id('Save')).tap();
    await sup('OK');
    await element(by.text('OK')).tap();
    await expect(element(by.id('WalletLabel'))).toHaveText('testname');
    await element(by.id('WalletDetails')).tap();

    // rename back
    await element(by.id('WalletNameInput')).replaceText('Imported HD SegWit (BIP84 Bech32 Native)\n');
    await element(by.id('Save')).tap();
    await sup('OK');
    await element(by.text('OK')).tap();
    await expect(element(by.id('WalletLabel'))).toHaveText('Imported HD SegWit (BIP84 Bech32 Native)');
    await element(by.id('WalletDetails')).tap();

    // wallet export
    await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 1);
    await element(by.id('WalletExport')).tap();
    await element(by.id('WalletExportScroll')).swipe('up', 'fast', 1);
    await expect(element(by.id('Secret'))).toHaveText(process.env.HD_MNEMONIC_BIP84);
    await device.pressBack();

    // XPUB
    await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 1);
    await element(by.id('XPub')).tap();
    await expect(element(by.id('BlueCopyTextToClipboard'))).toBeVisible();
    await device.pressBack();

    // Delete
    await device.pressBack();
    await device.pressBack();

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('should handle URL successfully', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t22');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t22'), 'as it previously passed on Travis');
    }
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    await device.launchApp({
      newInstance: true,
      url: 'bitcoin:BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7\\?amount=0.0001\\&label=Yo',
    });

    // setting fee rate:
    const feeRate = 2;
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText(feeRate + '');
    await element(by.text('OK')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    // created. verifying:
    await yo('TransactionValue');
    await expect(element(by.id('TransactionValue'))).toHaveText('0.0001');
    await expect(element(by.id('TransactionAddress'))).toHaveText('BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7');

    await device.pressBack();
    await device.pressBack();
    // await helperDeleteWallet('Imported HD SegWit (BIP84 Bech32 Native)', '105526');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can manage UTXO', async () => {
    const lockFile = '/tmp/travislock.' + hashIt('t23');
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile)) return console.warn('skipping', JSON.stringify('t23'), 'as it previously passed on Travis');
    }
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    // go inside the wallet
    await element(by.text('Imported HD SegWit (BIP84 Bech32 Native)')).tap();

    // refresh transactions
    await element(by.id('refreshTransactions')).tap();
    await waitFor(element(by.id('NoTxBuyBitcoin')))
      .not.toExist()
      .withTimeout(300 * 1000);

    // change note of 0.00069909 tx output
    await element(by.text('0.00069909')).atIndex(0).tap();
    await element(by.text('Details')).tap();
    await expect(element(by.text('8b0ab2c7196312e021e0d3dc73f801693826428782970763df6134457bd2ec20'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('test1');
    await element(by.text('Save')).tap();
    await element(by.text('OK')).tap();

    // back to wallet screen
    await device.pressBack();
    await device.pressBack();

    // open CoinControl
    await element(by.id('SendButton')).tap();
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('CoinControl')).tap();
    await waitFor(element(by.id('Loading'))) // wait for outputs to be loaded
      .not.toExist()
      .withTimeout(300 * 1000);
    await expect(element(by.text('test1')).atIndex(0)).toBeVisible();

    // change output note and freeze it
    await element(by.text('test1')).atIndex(0).tap();
    await element(by.id('OutputMemo')).replaceText('test2');
    await element(by.type('android.widget.CompoundButton')).tap(); // freeze switch
    await device.pressBack(); // closing modal
    await expect(element(by.text('test2')).atIndex(0)).toBeVisible();
    await expect(element(by.text('Freeze')).atIndex(0)).toBeVisible();

    // use frozen output to create tx using "Use coin" feature
    await element(by.text('test2')).atIndex(0).tap();
    await element(by.id('UseCoin')).tap();
    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('sendMaxButton')).tap();
    await element(by.text('OK')).tap();
    // setting fee rate:
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText('1');
    await element(by.text('OK')).tap();
    if (process.env.TRAVIS) await sleep(5000);
    await element(by.id('CreateTransactionButton')).tap();
    await element(by.id('TransactionDetailsButton')).tap();

    const txhex1 = await extractTextFromElementById('TxhexInput');
    const tx1 = bitcoin.Transaction.fromHex(txhex1);
    assert.strictEqual(tx1.outs.length, 1);
    assert.strictEqual(tx1.outs[0].script.toString('hex'), '00147ea385f352be696ab0f6e94a0ee0e3c6d4b14a53');
    assert.strictEqual(tx1.outs[0].value, 69797);
    assert.strictEqual(tx1.ins.length, 1);
    assert.strictEqual(tx1.ins[0].hash.toString('hex'), '20ecd27b453461df63079782874226386901f873dcd3e021e0126319c7b20a8b');
    assert.strictEqual(tx1.ins[0].index, 0);

    // back to wallet screen
    await device.pressBack();
    await device.pressBack();
    await device.pressBack();

    // create tx with unfrozen input
    await element(by.id('SendButton')).tap();
    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('sendMaxButton')).tap();
    await element(by.text('OK')).tap();
    // setting fee rate:
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText('1');
    await element(by.text('OK')).tap();
    if (process.env.TRAVIS) await sleep(5000);
    await element(by.id('CreateTransactionButton')).tap();
    await element(by.id('TransactionDetailsButton')).tap();

    const txhex2 = await extractTextFromElementById('TxhexInput');
    const tx2 = bitcoin.Transaction.fromHex(txhex2);

    assert.strictEqual(tx2.outs.length, 1);
    assert.strictEqual(tx2.outs[0].script.toString('hex'), '00147ea385f352be696ab0f6e94a0ee0e3c6d4b14a53');
    assert.strictEqual(tx2.outs[0].value, 35369);
    assert.strictEqual(tx2.ins.length, 3);
    assert.strictEqual(tx2.ins[0].hash.toString('hex'), 'd479264875a0f7c4a84e47141be005404531a8655f2388ae21e89a9701f14c10');
    assert.strictEqual(tx2.ins[0].index, 0);

    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    await device.pressBack();
    // await helperDeleteWallet('Imported HD SegWit (BIP84 Bech32 Native)', '105526');

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });
});
