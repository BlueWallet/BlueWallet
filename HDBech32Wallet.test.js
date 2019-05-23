/* global it, describe, jasmine, afterAll, beforeAll */
import { HDSegwitBech32Wallet } from './class';
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
let assert = require('assert');
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
let BlueElectrum = require('./BlueElectrum'); // so it connects ASAP

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

    assert.ok(hd._lastBalanceFetch === 0);
    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), 0);
    assert.ok(hd._lastBalanceFetch > 0);

    // checking that internal pointer and async address getter return the same address
    let freeAddress = await hd.getAddressAsync();
    assert.strictEqual(hd.next_free_address_index, 0);
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

    await hd.fetchBalance();
    await hd.fetchTransactions();
    assert.strictEqual(hd.getTransactions().length, 4);
    // console.warn(JSON.stringify(hd.getTransactions(), null, 2));

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
    assert.ok(utxo[0].tx_hash);
    assert.ok(utxo[0].tx_pos === 0 || utxo[0].tx_pos === 1);
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
});
