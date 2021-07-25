import { HDSegwitBech32Wallet } from '../../class';
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../blue_modules/BlueElectrum'); // so it connects ASAP

jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

describe('Bech32 Segwit HD (BIP84)', () => {
  it.each([false, true])('can fetch balance, transactions & utxo, disableBatching=%p', async function (disableBatching) {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    if (disableBatching) BlueElectrum.setBatchingDisabled();

    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    expect(hd.validateMnemonic()).toBeTruthy();

    expect('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP').toBe(
      hd.getXpub(),
    );

    expect(hd._getExternalAddressByIndex(0)).toBe('bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p');
    expect(hd._getExternalAddressByIndex(1)).toBe('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    expect(hd._getInternalAddressByIndex(0)).toBe('bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy');
    expect(hd._getInternalAddressByIndex(1)).toBe('bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r');

    expect(hd.weOwnAddress('bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p')).toBeTruthy();
    expect(hd.weOwnAddress('BC1QVD6W54SYDC08Z3802SVKXR7297EZ7CUSD6266P')).toBeTruthy();
    expect(hd.weOwnAddress('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh')).toBeTruthy();
    expect(!hd.weOwnAddress('1HjsSTnrwWzzEV2oi4r5MsAYENkTkrCtwL')).toBeTruthy();
    expect(!hd.weOwnAddress('garbage')).toBeTruthy();
    expect(!hd.weOwnAddress(false)).toBeTruthy();

    expect(hd.timeToRefreshBalance()).toBe(true);
    expect(hd._lastTxFetch === 0).toBeTruthy();
    expect(hd._lastBalanceFetch === 0).toBeTruthy();

    await hd.fetchBalance();
    expect(hd.getBalance()).toBe(200000);
    expect(await hd.getAddressAsync()).toBe(hd._getExternalAddressByIndex(2));
    expect(await hd.getChangeAddressAsync()).toBe(hd._getInternalAddressByIndex(2));
    expect(hd.next_free_address_index).toBe(2);
    expect(hd.getNextFreeAddressIndex()).toBe(2);
    expect(hd.next_free_change_address_index).toBe(2);

    // now fetch txs
    await hd.fetchTransactions();
    expect(hd._lastTxFetch > 0).toBeTruthy();
    expect(hd._lastBalanceFetch > 0).toBeTruthy();
    expect(hd.timeToRefreshBalance()).toBe(false);
    expect(hd.getTransactions().length).toBe(4);

    for (const tx of hd.getTransactions()) {
      expect(tx.hash).toBeTruthy();
      expect(tx.value).toBe(50000);
      expect(tx.received).toBeTruthy();
      expect(tx.confirmations > 1).toBeTruthy();
    }

    expect(hd.weOwnTransaction('5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df')).toBeTruthy();
    expect(hd.weOwnTransaction('ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d')).toBeTruthy();
    expect(!hd.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881')).toBeTruthy();

    // now fetch UTXO
    await hd.fetchUtxo();
    const utxo = hd.getUtxo();
    expect(utxo.length).toBe(4);
    expect(utxo[0].txId).toBeTruthy();
    expect(utxo[0].vout === 0 || utxo[0].vout === 1).toBeTruthy();
    expect(utxo[0].value).toBeTruthy();
    expect(utxo[0].address).toBeTruthy();

    // now, reset HD wallet, and find free addresses from scratch:
    hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);

    expect(await hd.getAddressAsync()).toBe(hd._getExternalAddressByIndex(2));
    expect(await hd.getChangeAddressAsync()).toBe(hd._getInternalAddressByIndex(2));
    expect(hd.next_free_address_index).toBe(2);
    expect(hd.getNextFreeAddressIndex()).toBe(2);
    expect(hd.next_free_change_address_index).toBe(2);
    if (disableBatching) BlueElectrum.setBatchingEnabled();
  });

  it('can catch up with externally modified wallet', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    expect(hd.validateMnemonic()).toBeTruthy();

    await hd.fetchBalance();
    const oldBalance = hd.getBalance();

    await hd.fetchTransactions();
    const oldTransactions = hd.getTransactions();

    // now, mess with internal state, make it 'obsolete'

    hd._txs_by_external_index['2'].pop();
    hd._txs_by_internal_index['16'].pop();
    hd._txs_by_internal_index['17'] = [];

    for (let c = 17; c < 100; c++) hd._balances_by_internal_index[c] = { c: 0, u: 0 };
    hd._balances_by_external_index['2'].c = 1000000;

    expect(hd.getBalance() !== oldBalance).toBeTruthy();
    expect(hd.getTransactions().length !== oldTransactions.length).toBeTruthy();

    // now, refetch! should get back to normal

    await hd.fetchBalance();
    expect(hd.getBalance()).toBe(oldBalance);
    await hd.fetchTransactions();
    expect(hd.getTransactions().length).toBe(oldTransactions.length);
  });

  it.skip('can work with faulty zpub', async () => {
    // takes too much time, skipped
    if (!process.env.FAULTY_ZPUB) {
      console.error('process.env.FAULTY_ZPUB not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = process.env.FAULTY_ZPUB;

    await hd.fetchBalance();
    await hd.fetchTransactions();

    expect(hd.getTransactions().length >= 76).toBeTruthy();
  });

  it('can fetchBalance, fetchTransactions, fetchUtxo and create transactions', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    expect(hd.validateMnemonic()).toBeTruthy();
    expect(hd.getXpub()).toBe(
      'zpub6qoWjSiZRHzSYPGYJ6EzxEXJXP1b2Rj9syWwJZFNCmupMwkbSAWSBk3UvSkJyQLEhQpaBAwvhmNj3HPKpwCJiTBB9Tutt46FtEmjL2DoU3J',
    );

    let start = +new Date();
    await hd.fetchBalance();
    let end = +new Date();
    end - start > 5000 && console.warn('fetchBalance took', (end - start) / 1000, 'sec');

    expect(hd.next_free_change_address_index > 0).toBeTruthy();
    expect(hd.next_free_address_index > 0).toBeTruthy();
    expect(hd.getNextFreeAddressIndex() > 0).toBeTruthy();

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
    for (const tx of hd.getTransactions()) {
      if (tx.hash === 'e9ef58baf4cff3ad55913a360c2fa1fd124309c59dcd720cdb172ce46582097b') {
        expect(tx.value).toBe(-129545);
        expect(tx.inputs[0].addresses[0]).toBe('bc1qffcl35r05wyf06meu3dalfevawx559n0ufrxcw');
        expect(tx.inputs[1].addresses[0]).toBe('bc1qtvh8mjcfdg9224nx4wu3sw7fmmtmy2k3jhdeul');
        expect(tx.inputs[2].addresses[0]).toBe('bc1qhe03zgvq4fmfw8l2qq2zu4dxyhgyukcz6k2a5w');
        txFound++;
      }
      if (tx.hash === 'e112771fd43962abfe4e4623bf788d6d95ff1bd0f9b56a6a41fb9ed4dacc75f1') {
        expect(tx.value).toBe(1000000);
        expect(tx.inputs[0].addresses[0]).toBe('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        expect(tx.inputs[1].addresses[0]).toBe('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        txFound++;
      }
      if (tx.hash === 'c94bdec21c72d3441245caa164b00315b131f6b72513369f4be1b00b9fb99cc5') {
        expect(tx.inputs[0].addresses[0]).toBe('16Nf5X77RbFz9Mb6t2GFqxs3twQN1joBkD');
        txFound++;
      }
      if (tx.hash === '51fc225ddf24f7e124f034637f46442645ca7ea2c442b28124d4bcdd04e30195') {
        expect(tx.inputs[0].addresses[0]).toBe('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        txFound++;
      }
    }
    expect(txFound).toBe(4);

    await hd.fetchUtxo();
    expect(hd.getUtxo().length).toBe(2);
    expect(hd.getDerivedUtxoFromOurTransaction().length).toBe(2);
    const u1 = hd.getUtxo()[0];
    const u2 = hd.getDerivedUtxoFromOurTransaction()[0];
    delete u1.confirmations;
    delete u2.confirmations;
    delete u1.height;
    delete u2.height;
    expect(u1).toEqual(u2);
    const changeAddress = await hd.getChangeAddressAsync();
    expect(changeAddress && changeAddress.startsWith('bc1')).toBeTruthy();

    const { tx, inputs, outputs, fee } = hd.createTransaction(
      hd.getUtxo(),
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 51000 }],
      13,
      changeAddress,
    );

    expect(Math.round(fee / tx.byteLength())).toBe(13);

    let totalInput = 0;
    for (const inp of inputs) {
      totalInput += inp.value;
    }

    expect(outputs.length).toBe(2);
    let totalOutput = 0;
    for (const outp of outputs) {
      totalOutput += outp.value;
    }

    expect(totalInput - totalOutput).toBe(fee);
    expect(outputs[outputs.length - 1].address).toBe(changeAddress);
  });

  it('wasEverUsed() works', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    expect(await hd.wasEverUsed()).toBeTruthy();

    hd = new HDSegwitBech32Wallet();
    await hd.generate();
    expect(!(await hd.wasEverUsed())).toBeTruthy();
  });
});
