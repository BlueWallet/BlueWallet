/* global it, describe, jasmine, afterAll, beforeAll  */
import { WatchOnlyWallet } from '../../class';
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

describe('Watch only wallet', () => {
  it('can fetch balance', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    await w.fetchBalance();
    assert.ok(w.getBalance() > 16);
  });

  it('can fetch tx', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;
    let w = new WatchOnlyWallet();

    w.setSecret('167zK5iZrs1U6piDqubD3FjRqUTM2CZnb8');
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 233);

    w = new WatchOnlyWallet();
    w.setSecret('1BiJW1jyUaxcJp2JWwbPLPzB1toPNWTFJV');
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    // fetch again and make sure no duplicates
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
  });

  it('can fetch complex TXs', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 120 * 1000;
    let w = new WatchOnlyWallet();
    w.setSecret('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    await w.fetchTransactions();
    for (let tx of w.getTransactions()) {
      assert.ok(tx.value, 'incorrect tx.value');
    }
  });

  it('can validate address', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
    assert.ok(w.valid());
    w.setSecret('3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2');
    assert.ok(w.valid());
    w.setSecret('not valid');
    assert.ok(!w.valid());

    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    assert.ok(w.valid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy');
    assert.ok(w.valid());
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    assert.ok(w.valid());
  });

  it('can fetch balance & transactions from zpub HD', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    let w = new WatchOnlyWallet();
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 200000);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 4);
    assert.ok((await w.getAddressAsync()).startsWith('bc1'));
  });

  it('can fetch balance & transactions from ypub HD', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    let w = new WatchOnlyWallet();
    w.setSecret('ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 51432);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 107);
    assert.ok((await w.getAddressAsync()).startsWith('3'));
  });

  it('can fetch balance & transactions from xpub HD', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    let w = new WatchOnlyWallet();
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 0);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 4);
    assert.ok((await w.getAddressAsync()).startsWith('1'));
  });

  it('can fetch large HD', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 500 * 1000;
    let w = new WatchOnlyWallet();
    w.setSecret('ypub6WnnYxkQCGeowv4BXq9Y9PHaXgHMJg9TkFaDJkunhcTAfbDw8z3LvV9kFNHGjeVaEoGdsSJgaMWpUBvYvpYGMJd43gTK5opecVVkvLwKttx');
    await w.fetchBalance();

    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 167);
  });
});
