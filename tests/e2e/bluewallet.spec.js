/* global it, describe, expect, element, by, waitFor, device, jasmine */

const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');
const createHash = require('create-hash');

jasmine.getEnv().addReporter({
  specStarted: result => (jasmine.currentTest = result),
  specDone: result => (jasmine.currentTest = result),
});

describe('BlueWallet UI Tests', () => {
  it('selftest passes', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    await waitFor(element(by.id('WalletsList')))
      .toBeVisible()
      .withTimeout(300 * 1000);

    // go to settings, press SelfTest and wait for OK
    await element(by.id('SettingsButton')).tap();
    await element(by.id('AboutButton')).tap();
    await element(by.id('AboutScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await element(by.id('RunSelfTestButton')).tap();
    await waitFor(element(by.id('SelfTestOk')))
      .toBeVisible()
      .withTimeout(300 * 1000);
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can create wallet, reload app and it persists', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    await yo('WalletsList');

    await helperCreateWallet();

    await device.launchApp({ newInstance: true });
    await yo('WalletsList');
    await expect(element(by.id('cr34t3d'))).toBeVisible();
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can encrypt storage, with plausible deniability', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    await yo('WalletsList');

    // lets create a wallet
    await helperCreateWallet();

    // go to settings
    await expect(element(by.id('SettingsButton'))).toBeVisible();
    await element(by.id('SettingsButton')).tap();
    await expect(element(by.id('SecurityButton'))).toBeVisible();

    // go to Security page where we will enable encryption
    await element(by.id('SecurityButton')).tap();
    // await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible(); // @see https://github.com/react-native-elements/react-native-elements/issues/2519
    await expect(element(by.id('PlausibleDeniabilityButton'))).toBeNotVisible();

    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // first, trying to mistype second password:
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol. lets tap it
    await element(by.type('android.widget.EditText')).typeText('08902');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('666');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Passwords do not match'))).toBeVisible();
    await element(by.text('OK')).tap();

    // now, lets put correct passwords and encrypt the storage
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);

    // trying to decrypt with wrong password
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('wrong');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Wrong password, please try again.'))).toBeVisible();

    // correct password
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // now lets enable plausible deniability feature

    // go to settings -> security screen -> plausible deniability screen
    await element(by.id('SettingsButton')).tap();
    await expect(element(by.id('SecurityButton'))).toBeVisible();
    await element(by.id('SecurityButton')).tap();
    // await expect(element(by.id('EncyptedAndPasswordProtected'))).toBeVisible(); // @see https://github.com/react-native-elements/react-native-elements/issues/2519
    await expect(element(by.id('PlausibleDeniabilityButton'))).toBeVisible();
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    await expect(element(by.text('Password for fake storage should not match the password for your main storage'))).toBeVisible();

    // trying MAIN password: should fail, obviously
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Password is currently in use. Please, try a different password.'))).toBeVisible();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.text('OK')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash

    // trying new password, but will mistype
    await element(by.id('CreateFakeStorageButton')).tap();
    if (process.env.TRAVIS) await sleep(3000); // hopefully helps prevent crash
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Retype password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorageWithTypo'); // retyping with typo
    await element(by.text('OK')).tap();
    await expect(element(by.text('Passwords do not match, try again'))).toBeVisible();
    await element(by.text('OK')).tap();

    // trying new password
    await element(by.id('CreateFakeStorageButton')).tap();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Retype password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage'); // retyping
    await element(by.text('OK')).tap();

    await expect(element(by.text('Success'))).toBeVisible();
    await element(by.text('OK')).tap();

    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch the app, unlock with fake password, expect to see fake wallet

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('qqq');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet IN MAIN STORAGE should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await sleep(3000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('passwordForFakeStorage');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet in FAKE storage should be visible
    await expect(element(by.id('fake_wallet'))).toBeVisible();
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can encrypt storage, and decrypt storage works', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    await yo('WalletsList');
    await helperCreateWallet();
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();
    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // lets put correct passwords and encrypt the storage
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Retype password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('fake'); // retyping
    await element(by.text('OK')).tap();
    await expect(element(by.text('Success'))).toBeVisible();
    await element(by.text('OK')).tap();

    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet IN MAIN STORAGE should be visible
    await expect(element(by.id('cr34t3d'))).toBeVisible();

    // now go to settings, and decrypt
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();

    // putting FAKE storage password. should not succeed
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Wrong password, please try again.'))).toBeVisible();
    await element(by.text('OK')).tap();

    // correct password
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await yo('cr34t3d'); // success
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it.skip('can encrypt storage, and decrypt storage, but this time the fake one', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    // this test mostly repeats previous one, except in the end it logins with FAKE password to unlock FAKE
    // storage bucket, and then decrypts it. effectively, everything from MAIN storage bucket is lost
    if (process.env.TRAVIS) return; // skipping on CI to not take time (plus it randomly fails)
    await yo('WalletsList');
    await helperCreateWallet();
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();
    if (device.getPlatform() === 'ios') {
      console.warn('Android only test skipped');
      return;
    }

    // lets encrypt the storage.
    // lets put correct passwords and encrypt the storage
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await element(by.id('PlausibleDeniabilityButton')).tap();

    // trying to enable plausible denability
    await element(by.id('CreateFakeStorageButton')).tap();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Retype password'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('fake'); // retyping
    await element(by.text('OK')).tap();
    await expect(element(by.text('Success'))).toBeVisible();
    await element(by.text('OK')).tap();

    // created fake storage.
    // creating a wallet inside this fake storage
    await helperCreateWallet('fake_wallet');

    // relaunch app
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(33000);
    //
    await expect(element(by.text('Your storage is encrypted. Password is required to decrypt it'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();
    await yo('WalletsList');

    // previously created wallet IN FAKE STORAGE should be visible
    await expect(element(by.id('fake_wallet'))).toBeVisible();

    // now go to settings, and decrypt
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();

    // putting MAIN storage password. should not succeed
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('pass');
    await element(by.text('OK')).tap();
    await expect(element(by.text('Wrong password, please try again.'))).toBeVisible();
    await element(by.text('OK')).tap();

    // correct password
    await element(by.type('android.widget.CompoundButton')).tap(); // thats a switch lol
    await element(by.text('OK')).tap();
    await element(by.type('android.widget.EditText')).typeText('fake');
    await element(by.text('OK')).tap();

    // relaunch app
    await device.launchApp({ newInstance: true });
    await yo('fake_wallet'); // success, we are observing wallet in FAKE storage. wallet from main storage is lost
    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can import BIP84 mnemonic, fetch balance & transactions, then create a transaction', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    await helperImportWallet(process.env.HD_MNEMONIC_BIP84, 'Imported HD SegWit (BIP84 Bech32 Native)', '0.00105526 BTC');

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
    expect(element(by.id('TransactionValue'))).toHaveText('0.0001');
    await element(by.id('TransactionDetailsButton')).tap();

    let txhex = await extractTextFromElementById('TxhexInput');

    let transaction = bitcoin.Transaction.fromHex(txhex);
    assert.ok(transaction.ins.length === 1 || transaction.ins.length === 2); // depending on current fees gona use either 1 or 2 inputs
    assert.strictEqual(transaction.outs.length, 2);
    assert.strictEqual(bitcoin.address.fromOutputScript(transaction.outs[0].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl'); // to address
    assert.strictEqual(transaction.outs[0].value, 10000);

    // checking fee rate:
    const totalIns = 100000 + 5526; // we hardcode it since we know it in advance
    const totalOuts = transaction.outs.map(el => el.value).reduce((a, b) => a + b, 0);
    assert.strictEqual(Math.round((totalIns - totalOuts) / (txhex.length / 2)), feeRate);

    if (device.getPlatform() === 'ios') {
      console.warn('rest of the test is Android only, skipped');
      return;
    }

    // now, testing scanQR with bip21:

    await device.pressBack();
    await device.pressBack();
    await element(by.id('BlueAddressInputScanQrButton')).tap();

    // tapping 10 times invisible button is a backdoor:
    for (let c = 0; c <= 10; c++) {
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

    // now, testing units switching, and then creating tx with SATS:

    await device.pressBack();
    await device.pressBack();
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

    // now, testing sendMAX feature:

    await device.pressBack();
    await device.pressBack();
    await element(by.id('advancedOptionsMenuButton')).tap();
    await element(by.id('sendMaxButton')).tap();
    await element(by.text('OK')).tap();
    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}
    // created. verifying:
    await yo('TransactionValue');
    await element(by.id('TransactionDetailsButton')).tap();
    txhex = await extractTextFromElementById('TxhexInput');
    transaction = bitcoin.Transaction.fromHex(txhex);
    assert.strictEqual(transaction.outs.length, 1, 'should be single output, no change');
    assert.ok(transaction.outs[0].value > 100000);

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('can import zpub as watch-only and create PSBT', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    await helperImportWallet(
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
      'Imported Watch-only',
      '0.002 BTC',
    );

    await element(by.id('SendButton')).tap();
    await element(by.text('OK')).tap();

    await element(by.id('AddressInput')).replaceText('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    await element(by.id('BitcoinAmountInput')).typeText('0.0005\n');

    // setting fee rate:
    const feeRate = 1;
    await element(by.id('chooseFee')).tap();
    await element(by.id('feeCustom')).tap();
    await element(by.type('android.widget.EditText')).typeText(feeRate + '');
    await element(by.text('OK')).tap();

    if (process.env.TRAVIS) await sleep(5000);
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    await yo('TextHelperForPSBT');

    // now lets test scanning back QR with txhex. this should lead straight to broadcast dialog

    await element(by.id('PsbtWithHardwareScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit
    await element(by.id('PsbtTxScanButton')).tap(); // opening camera

    // tapping 10 times invisible button is a backdoor:
    for (let c = 0; c <= 10; c++) {
      await element(by.id('ScanQrBackdoorButton')).tap();
      await sleep(1000);
    }

    const randomTxHex =
      '020000000001011628f58e8e81bfcfff1b106bb8968e342fb86f09aa810ed2939e43d5127c51040200000000000000000227e42d000000000017a914c679a827d57a9b8b539515dbafb4e573d2bcc6ca87df15cf02000000002200209705cdfcbc459a220e7f39ffe547a31335505c2357f452ae12a22b9ae36ea59d04004730440220626c5205a6f49d1dd1577c85c0af4c5fc70f41de61f891d71a5cf57af09110d4022045bcb1e7d4e93e1a9baf6ae1ad0b4087c9e9f73ec366e97576912377d9f6904301473044022044aea98e8983f09cb0639f08d34526bb7e3ed47d208b7bf714fb29a1b5f9535a02200baa510b94cf434775b4aa2184682f2fb33f15e5e76f79aa0885e7ee12bdc8f70169522102e67ce679d617d674d68eea95ecb166c67b4b5520105c4745adf37ce8a40b92dc21029ff54b8bf26dbddd7bd4336593d2ff17519d5374989f36a6f5f8239675ff79a421039000ee2853c6db4bd956e80b1ecfb8711bf3e0a9a8886d15450c29458b60473153ae00000000';
    await element(by.id('scanQrBackdoorInput')).replaceText(randomTxHex);
    await element(by.id('scanQrBackdoorOkButton')).tap();
    await yo('PsbtWithHardwareWalletBroadcastTransactionButton');

    // TODO: same but with real signed PSBT QR for this specific transaction

    process.env.TRAVIS && require('fs').writeFileSync(lockFile, '1');
  });

  it('should handle URL successfully', async () => {
    const lockFile = '/tmp/travislock.' + hashIt(jasmine.currentTest.fullName);
    if (process.env.TRAVIS) {
      if (require('fs').existsSync(lockFile))
        return console.warn('skipping', JSON.stringify(jasmine.currentTest.fullName), 'as it previously passed on Travis');
    }
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    await helperImportWallet(process.env.HD_MNEMONIC_BIP84, 'Imported HD SegWit (BIP84 Bech32 Native)', '0.00105526 BTC');

    await device.launchApp({
      newInstance: true,
      url: 'bitcoin:BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7\\?amount=0.0001\\&label=Yo',
    });
    try {
      await element(by.id('CreateTransactionButton')).tap();
    } catch (_) {}

    // created. verifying:
    await yo('TransactionValue');
    expect(element(by.id('TransactionValue'))).toHaveText('0.0001');
    expect(element(by.id('TransactionAddress'))).toHaveText('BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7');
  });

  it('can manage UTXO', async () => {
    await helperImportWallet(
      'zpub6qoWjSiZRHzSYPGYJ6EzxEXJXP1b2Rj9syWwJZFNCmupMwkbSAWSBk3UvSkJyQLEhQpaBAwvhmNj3HPKpwCJiTBB9Tutt46FtEmjL2DoU3J',
      'Imported Watch-only',
      '0.00105526 BTC',
    );

    // refresh transactions
    await element(by.id('refreshTransactions')).tap();
    await waitFor(element(by.id('NoTxBuyBitcoin')))
      .not.toExist()
      .withTimeout(300 * 1000);

    // change note of 0.001 tx output
    await element(by.text('0.001')).atIndex(0).tap();
    await element(by.text('details')).tap();
    await expect(element(by.text('49944e90fe917952e36b1967cdbc1139e60c89b4800b91258bf2345a77a8b888'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText('test1');
    await element(by.text('Save')).tap();
    await element(by.text('OK')).tap();

    // back to wallet screen
    await device.pressBack();
    await device.pressBack();

    // open CoinControl
    await element(by.id('SendButton')).tap();
    await element(by.text('OK')).tap();
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
    await expect(element(by.text('freeze')).atIndex(0)).toBeVisible();

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

    await element(by.id('CreateTransactionButton')).tap();
    await yo('TextHelperForPSBT');

    const psbthex1 = await extractTextFromElementById('PSBTHex');
    const psbt1 = bitcoin.Psbt.fromHex(psbthex1);
    assert.strictEqual(psbt1.txOutputs.length, 1);
    assert.strictEqual(psbt1.txOutputs[0].address, 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    assert.strictEqual(psbt1.txOutputs[0].value, 99808);
    assert.strictEqual(psbt1.data.inputs.length, 1);
    assert.strictEqual(psbt1.data.inputs[0].witnessUtxo.value, 100000);

    // back to wallet screen
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

    await element(by.id('CreateTransactionButton')).tap();
    await yo('TextHelperForPSBT');

    const psbthex2 = await extractTextFromElementById('PSBTHex');
    const psbt2 = bitcoin.Psbt.fromHex(psbthex2);
    assert.strictEqual(psbt2.txOutputs.length, 1);
    assert.strictEqual(psbt2.txOutputs[0].address, 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
    assert.strictEqual(psbt2.txOutputs[0].value, 5334);
    assert.strictEqual(psbt2.data.inputs.length, 1);
    assert.strictEqual(psbt2.data.inputs[0].witnessUtxo.value, 5526);
  });
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function yo(id, timeout = 33000) {
  return waitFor(element(by.id(id)))
    .toBeVisible()
    .withTimeout(timeout);
}

async function sup(text, timeout = 33000) {
  return waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
}

async function helperCreateWallet(walletName) {
  await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
  await element(by.id('CreateAWallet')).tap();
  await element(by.id('WalletNameInput')).replaceText(walletName || 'cr34t3d');
  await yo('ActivateBitcoinButton');
  await element(by.id('ActivateBitcoinButton')).tap();
  await element(by.id('ActivateBitcoinButton')).tap();
  // why tf we need 2 taps for it to work..? mystery
  await element(by.id('Create')).tap();

  await yo('PleaseBackupScrollView');
  await element(by.id('PleaseBackupScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit

  await yo('PleasebackupOk');
  await element(by.id('PleasebackupOk')).tap();
  await expect(element(by.id('WalletsList'))).toBeVisible();
  await element(by.id('WalletsList')).swipe('right', 'fast', 1); // in case emu screen is small and it doesnt fit
  await expect(element(by.id(walletName || 'cr34t3d'))).toBeVisible();
}

async function helperImportWallet(importText, expectedWalletLabel, expectedBalance) {
  await yo('WalletsList');
  await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
  // going to Import Wallet screen and importing mnemonic
  await element(by.id('CreateAWallet')).tap();
  await element(by.id('ImportWallet')).tap();
  await element(by.id('MnemonicInput')).replaceText(importText);
  try {
    await element(by.id('DoImport')).tap();
  } catch (_) {}
  if (process.env.TRAVIS) await sleep(60000);
  await sup('OK', 3 * 61000); // waiting for wallet import
  await element(by.text('OK')).tap();
  // ok, wallet imported

  // lets go inside wallet
  await element(by.text(expectedWalletLabel)).tap();
  // label might change in the future
  expect(element(by.id('WalletBalance'))).toHaveText(expectedBalance);
}

function hashIt(s) {
  return createHash('sha256').update(s).digest().toString('hex');
}

/**
 * a hack to extract element text. warning, this might break in future
 * @see https://github.com/wix/detox/issues/445
 *
 * @returns {Promise<string>}
 */
async function extractTextFromElementById(id) {
  try {
    await expect(element(by.id(id))).toHaveText('_unfoundable_text');
  } catch (error) {
    if (device.getPlatform() === 'ios') {
      const start = `accessibilityLabel was "`;
      const end = '" on ';
      const errorMessage = error.message.toString();
      const [, restMessage] = errorMessage.split(start);
      const [label] = restMessage.split(end);
      return label;
    } else {
      const start = 'Got:';
      const end = '}"';
      const errorMessage = error.message.toString();
      const [, restMessage] = errorMessage.split(start);
      const [label] = restMessage.split(end);
      const value = label.split(',');
      var combineText = value.find(i => i.includes('text=')).trim();
      const [, elementText] = combineText.split('=');
      return elementText;
    }
  }
}
