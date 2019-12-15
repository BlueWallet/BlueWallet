/* global it, describe, jasmine, afterAll, beforeAll */
import { HDSegwitBech32Wallet } from '../../class';
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
let assert = require('assert');
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
let BlueElectrum = require('../../BlueElectrum'); // so it connects ASAP

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

describe('Bech32 Segwit HD (BIP84)', () => {
  it('can create', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    let mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);

    assert.strictEqual(true, hd.validateMnemonic());
    assert.strictEqual(
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
      hd.getXpub(),
    );

    assert.strictEqual(hd._getExternalWIFByIndex(0), 'KyZpNDKnfs94vbrwhJneDi77V6jF64PWPF8x5cdJb8ifgg2DUc9d');
    assert.strictEqual(hd._getExternalWIFByIndex(1), 'Kxpf5b8p3qX56DKEe5NqWbNUP9MnqoRFzZwHRtsFqhzuvUJsYZCy');
    assert.strictEqual(hd._getInternalWIFByIndex(0), 'KxuoxufJL5csa1Wieb2kp29VNdn92Us8CoaUG3aGtPtcF3AzeXvF');
    assert.ok(hd._getInternalWIFByIndex(0) !== hd._getInternalWIFByIndex(1));

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/84'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(1)), "m/84'/0'/0'/0/1");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/84'/0'/0'/1/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(1)), "m/84'/0'/0'/1/1");

    assert.ok(hd._lastBalanceFetch === 0);
    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), 0);
    assert.ok(hd._lastBalanceFetch > 0);

    // checking that internal pointer and async address getter return the same address
    let freeAddress = await hd.getAddressAsync();
    assert.strictEqual(hd.next_free_address_index, 1); // someone ACTUALLY used this example mnemonic lol
    assert.strictEqual(hd._getExternalAddressByIndex(hd.next_free_address_index), freeAddress);
    let freeChangeAddress = await hd.getChangeAddressAsync();
    assert.strictEqual(hd.next_free_change_address_index, 0);
    assert.strictEqual(hd._getInternalAddressByIndex(hd.next_free_change_address_index), freeChangeAddress);
  });

  it('can fetch balance', async function() {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    assert.strictEqual(
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
      hd.getXpub(),
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy');
    assert.strictEqual(hd._getInternalAddressByIndex(1), 'bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r');

    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), 200000);
    assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(2));
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(2));
    assert.strictEqual(hd.next_free_address_index, 2);
    assert.strictEqual(hd.next_free_change_address_index, 2);

    // now, reset HD wallet, and find free addresses from scratch:
    hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);

    assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(2));
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(2));
    assert.strictEqual(hd.next_free_address_index, 2);
    assert.strictEqual(hd.next_free_change_address_index, 2);
  });

  it('can fetch transactions', async function() {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    assert.strictEqual(hd.timeToRefreshBalance(), true);
    assert.ok(hd._lastTxFetch === 0);
    assert.ok(hd._lastBalanceFetch === 0);
    await hd.fetchBalance();
    await hd.fetchTransactions();
    assert.ok(hd._lastTxFetch > 0);
    assert.ok(hd._lastBalanceFetch > 0);
    assert.strictEqual(hd.timeToRefreshBalance(), false);
    assert.strictEqual(hd.getTransactions().length, 4);

    for (let tx of hd.getTransactions()) {
      assert.ok(tx.hash);
      assert.strictEqual(tx.value, 50000);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }
  });

  it('can fetch UTXO', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    await hd.fetchBalance();
    await hd.fetchUtxo();
    let utxo = hd.getUtxo();
    assert.strictEqual(utxo.length, 4);
    assert.ok(utxo[0].txId);
    assert.ok(utxo[0].vout === 0 || utxo[0].vout === 1);
    assert.ok(utxo[0].value);
    assert.ok(utxo[0].address);
  });

  it('can generate addresses only via zpub', function() {
    let zpub = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
    let hd = new HDSegwitBech32Wallet();
    hd._xpub = zpub;
    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));
  });

  it('can generate', async () => {
    let hd = new HDSegwitBech32Wallet();
    let hashmap = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      let secret = hd.getSecret();
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    let hd2 = new HDSegwitBech32Wallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });

  it('can catch up with externally modified wallet', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());

    await hd.fetchBalance();
    let oldBalance = hd.getBalance();

    await hd.fetchTransactions();
    let oldTransactions = hd.getTransactions();

    // now, mess with internal state, make it 'obsolete'

    hd._txs_by_external_index['2'].pop();
    hd._txs_by_internal_index['16'].pop();
    hd._txs_by_internal_index['17'] = [];

    for (let c = 17; c < 100; c++) hd._balances_by_internal_index[c] = { c: 0, u: 0 };
    hd._balances_by_external_index['2'].c = 1000000;

    assert.ok(hd.getBalance() !== oldBalance);
    assert.ok(hd.getTransactions().length !== oldTransactions.length);

    // now, refetch! should get back to normal

    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), oldBalance);
    await hd.fetchTransactions();
    assert.strictEqual(hd.getTransactions().length, oldTransactions.length);
  });

  it('can work with fauty zpub', async () => {
    if (!process.env.FAULTY_ZPUB) {
      console.error('process.env.FAULTY_ZPUB not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
    let hd = new HDSegwitBech32Wallet();
    hd._xpub = process.env.FAULTY_ZPUB;

    await hd.fetchBalance();
    await hd.fetchTransactions();

    assert.ok(hd.getTransactions().length >= 76);
  });

  it('can fetchBalance, fetchTransactions, fetchUtxo and create transactions', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());
    assert.strictEqual(
      hd.getXpub(),
      'zpub6qoWjSiZRHzSYPGYJ6EzxEXJXP1b2Rj9syWwJZFNCmupMwkbSAWSBk3UvSkJyQLEhQpaBAwvhmNj3HPKpwCJiTBB9Tutt46FtEmjL2DoU3J',
    );

    let start = +new Date();
    await hd.fetchBalance();
    let end = +new Date();
    end - start > 5000 && console.warn('fetchBalance took', (end - start) / 1000, 'sec');

    assert.ok(hd.next_free_change_address_index > 0);
    assert.ok(hd.next_free_address_index > 0);

    start = +new Date();
    await hd.fetchTransactions();
    end = +new Date();
    end - start > 15000 && console.warn('fetchTransactions took', (end - start) / 1000, 'sec');

    start = +new Date();
    await hd.fetchBalance();
    end = +new Date();
    end - start > 2000 && console.warn('warm fetchBalance took', (end - start) / 1000, 'sec');

    global.debug = true;
    start = +new Date();
    await hd.fetchTransactions();
    end = +new Date();
    end - start > 2000 && console.warn('warm fetchTransactions took', (end - start) / 1000, 'sec');

    let txFound = 0;
    for (let tx of hd.getTransactions()) {
      if (tx.hash === 'e9ef58baf4cff3ad55913a360c2fa1fd124309c59dcd720cdb172ce46582097b') {
        assert.strictEqual(tx.value, -129545);
        assert.strictEqual(tx.inputs[0].addresses[0], 'bc1qffcl35r05wyf06meu3dalfevawx559n0ufrxcw');
        assert.strictEqual(tx.inputs[1].addresses[0], 'bc1qtvh8mjcfdg9224nx4wu3sw7fmmtmy2k3jhdeul');
        assert.strictEqual(tx.inputs[2].addresses[0], 'bc1qhe03zgvq4fmfw8l2qq2zu4dxyhgyukcz6k2a5w');
        txFound++;
      }
      if (tx.hash === 'e112771fd43962abfe4e4623bf788d6d95ff1bd0f9b56a6a41fb9ed4dacc75f1') {
        assert.strictEqual(tx.value, 1000000);
        assert.strictEqual(tx.inputs[0].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        assert.strictEqual(tx.inputs[1].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        txFound++;
      }
      if (tx.hash === 'c94bdec21c72d3441245caa164b00315b131f6b72513369f4be1b00b9fb99cc5') {
        assert.strictEqual(tx.inputs[0].addresses[0], '16Nf5X77RbFz9Mb6t2GFqxs3twQN1joBkD');
        txFound++;
      }
      if (tx.hash === '51fc225ddf24f7e124f034637f46442645ca7ea2c442b28124d4bcdd04e30195') {
        assert.strictEqual(tx.inputs[0].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        txFound++;
      }
    }
    assert.strictEqual(txFound, 4);

    await hd.fetchUtxo();
    let changeAddress = await hd.getChangeAddressAsync();
    assert.ok(changeAddress && changeAddress.startsWith('bc1'));

    let { tx, inputs, outputs, fee } = hd.createTransaction(
      hd.getUtxo(),
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 51000 }],
      13,
      changeAddress,
    );

    assert.strictEqual(Math.round(fee / tx.byteLength()), 13);

    let totalInput = 0;
    for (let inp of inputs) {
      totalInput += inp.value;
    }

    assert.strictEqual(outputs.length, 2);
    let totalOutput = 0;
    for (let outp of outputs) {
      totalOutput += outp.value;
    }

    assert.strictEqual(totalInput - totalOutput, fee);
    assert.strictEqual(outputs[outputs.length - 1].address, changeAddress);
  });
});
