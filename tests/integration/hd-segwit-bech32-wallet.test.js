/* global it, describe, jasmine, afterAll, beforeAll */
import { HDSegwitBech32Wallet } from '../../class';

global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
const assert = require('assert');

global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../BlueElectrum'); // so it connects ASAP

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
    jest.setTimeout(30000);

    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitBech32Wallet();
    await hd.setSecret(mnemonic);

    assert.strictEqual(true, hd.validateMnemonic());

    assert.strictEqual(
      'zpub6qV8gC8H2NR4zcdP5rvnTpY7xZw3H3Samf8XuoeJdKDvF4UCJzeaj7DjwSYdj5A6wdmt6qVHqbnonjQXZA56Ecs1QTe4ug6gPRBwYnMiW2s',
      await hd.getXpub(),
    );

    assert.strictEqual(await hd._getWIFByIndex(0), 'KwLAKpr3t88u6E6CEQT6Qb2Q9ZJ6RJzoxc4Z2Gx6ALxwgAgaqfEn');
    assert.strictEqual(await hd._getWIFByIndex(1), 'L4CRAA2JrVuivLTLQc4A2g2Nnu7Xjhnnh8jCEzJaP739C9hWqXux');
    assert.strictEqual(await hd._getWIFByIndex(2), 'KxNUq8mMoo14fVGgG3EqyYjMMAPAvKZVTqhNFfS2AAeka8LRSPWr');
    assert.ok((await hd._getWIFByIndex(0)) !== (await hd._getWIFByIndex(1)));

    assert.strictEqual(hd.getAddress()[0], 'royale1qs79r2xk6nhr8ce9ae6rexrtprms3cr7yggm3dt');
    assert.strictEqual(hd.getAddress()[1], 'royale1q6ur0znmd0ux9tj5h66h9jhpzjv7ahpjhxu8z7z');
    assert.strictEqual(hd.getAddress()[2], 'royale1qjk9php9jn577926wu9sqgnwz9whj2sea68dejp');

    assert.strictEqual(hd._getDerivationPathByAddress(hd.getAddress()[1]), "m/84'/440'/0'/0/1");
    assert.strictEqual(hd._getDerivationPathByAddress(hd.getAddress()[0]), "m/84'/440'/0'/0/0");

    assert.ok(hd._lastBalanceFetch === 0);
    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), 0);
    assert.ok(hd._lastBalanceFetch > 0);
  });

  it('can fetch balance', async function() {
    jest.setTimeout(90000);

    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
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
    jest.setTimeout(90000);
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
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

    for (const tx of hd.getTransactions()) {
      assert.ok(tx.hash);
      assert.strictEqual(tx.value, 50000);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }
  });

  it('can fetch UTXO', async () => {
    jest.setTimeout(90000);
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    await hd.fetchBalance();
    await hd.fetchUtxos();
    const utxo = hd.getUtxos();
    assert.strictEqual(utxo.length, 4);
    assert.ok(utxo[0].txId);
    assert.ok(utxo[0].vout === 0 || utxo[0].vout === 1);
    assert.ok(utxo[0].value);
    assert.ok(utxo[0].address);
  });

  xit('can generate addresses only via zpub', function() {
    const zpub =
      'zpub6qV8gC8H2NR4zcdP5rvnTpY7xZw3H3Samf8XuoeJdKDvF4UCJzeaj7DjwSYdj5A6wdmt6qVHqbnonjQXZA56Ecs1QTe4ug6gPRBwYnMiW2s';
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = zpub;
    hd.generateAddresses();
    assert.strictEqual(hd.getAddress()[0], 'royale1qs79r2xk6nhr8ce9ae6rexrtprms3cr7yggm3dt');
    assert.strictEqual(hd.getAddress()[1], 'royale1q6ur0znmd0ux9tj5h66h9jhpzjv7ahpjhxu8z7z');
    assert.strictEqual(hd.getAddress()[2], 'royale1qjk9php9jn577926wu9sqgnwz9whj2sea68dejp');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));
  });

  it('can generate', async () => {
    jest.setTimeout(60000);
    const hd = new HDSegwitBech32Wallet();
    const hashmap = {};
    for (let c = 0; c < 10; c++) {
      await hd.generate();
      const secret = hd.getSecret();
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    const hd2 = new HDSegwitBech32Wallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });

  it('can work with fauty zpub', async () => {
    jest.setTimeout(90000);
    if (!process.env.FAULTY_ZPUB) {
      console.error('process.env.FAULTY_ZPUB not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = process.env.FAULTY_ZPUB;

    await hd.fetchBalance();
    await hd.fetchTransactions();

    assert.ok(hd.getTransactions().length >= 76);
  });

  it('can fetchBalance, fetchTransactions, fetchUtxo and create transactions', async () => {
    jest.setTimeout(90000);
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());
    assert.strictEqual(
      hd.getXpub(),
      'zpub6qoWjSiZRHzSYPGYJ6EzxEXJXP1b2Rj9syWwJZFNCmupMwkbSAWSBk3UvSkJyQLEhQpaBAwvhmNj3HPKpwCJiTBB9Tutt46FtEmjL2DoU3J',
    );

    let start = new Date().getTime();
    await hd.fetchBalance();
    let end = new Date().getTime();
    end - start > 5000 && console.warn('fetchBalance took', (end - start) / 1000, 'sec');

    assert.ok(hd.next_free_change_address_index > 0);
    assert.ok(hd.next_free_address_index > 0);

    start = new Date().getTime();
    await hd.fetchTransactions();
    end = new Date().getTime();
    end - start > 15000 && console.warn('fetchTransactions took', (end - start) / 1000, 'sec');

    start = new Date().getTime();
    await hd.fetchBalance();
    end = new Date().getTime();
    end - start > 2000 && console.warn('warm fetchBalance took', (end - start) / 1000, 'sec');

    global.debug = true;
    start = new Date().getTime();
    await hd.fetchTransactions();
    end = new Date().getTime();
    end - start > 2000 && console.warn('warm fetchTransactions took', (end - start) / 1000, 'sec');

    let txFound = 0;
    for (const tx of hd.getTransactions()) {
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

    await hd.fetchUtxos();
    const changeAddress = await hd.getChangeAddressAsync();
    assert.ok(changeAddress && changeAddress.startsWith('bc1'));

    const { tx, inputs, outputs, fee } = hd.createTransaction(
      hd.getUtxos(),
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 51000 }],
      13,
      changeAddress,
    );

    assert.strictEqual(Math.round(fee / tx.byteLength()), 13);

    let totalInput = 0;
    for (const inp of inputs) {
      totalInput += inp.value;
    }

    assert.strictEqual(outputs.length, 2);
    let totalOutput = 0;
    for (const outp of outputs) {
      totalOutput += outp.value;
    }

    assert.strictEqual(totalInput - totalOutput, fee);
    assert.strictEqual(outputs[outputs.length - 1].address, changeAddress);
  });
});
