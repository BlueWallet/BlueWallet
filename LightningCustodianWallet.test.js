/* global it, describe, jasmine */
import Frisbee from 'frisbee';
import { LightningCustodianWallet } from './class';
let assert = require('assert');

describe('LightningCustodianWallet', () => {
  let l1 = new LightningCustodianWallet();

  it('can create, auth and getbtc', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    assert.ok(l1.refill_addressess.length === 0);
    assert.ok(l1._refresh_token_created_ts === 0);
    assert.ok(l1._access_token_created_ts === 0);
    l1.balance = 'FAKE';

    await l1.createAccount(true);
    await l1.authorize();
    await l1.fetchBtcAddress();
    await l1.fetchBalance();
    await l1.fetchInfo();
    await l1.fetchTransactions();
    await l1.fetchPendingTransactions();

    assert.ok(l1.access_token);
    assert.ok(l1.refresh_token);
    assert.ok(l1._refresh_token_created_ts > 0);
    assert.ok(l1._access_token_created_ts > 0);
    assert.ok(l1.refill_addressess.length > 0);
    assert.ok(l1.balance === 0);
    assert.ok(l1.info_raw);
    assert.ok(l1.pending_transactions_raw.length === 0);
    assert.ok(l1.transactions_raw.length === 0);
    assert.ok(l1.transactions_raw.length === l1.getTransactions().length);
  });

  it('can refresh token', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    let oldRefreshToken = l1.refresh_token;
    let oldAccessToken = l1.access_token;
    await l1.refreshAcessToken();
    assert.ok(oldRefreshToken !== l1.refresh_token);
    assert.ok(oldAccessToken !== l1.access_token);
    assert.ok(l1.access_token);
    assert.ok(l1.refresh_token);
  });

  it('can use existing login/pass', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    let l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchPendingTransactions();
    await l2.fetchTransactions();

    assert.ok(l2.pending_transactions_raw.length === 0);
    assert.ok(l2.transactions_raw.length > 0);
    assert.ok(l2.transactions_raw.length === l2.getTransactions().length);
    for (let tx of l2.getTransactions()) {
      assert.ok(typeof tx.fee !== 'undefined');
      assert.ok(tx.value);
      assert.ok(tx.timestamp);
      assert.ok(tx.description || tx.memo, JSON.stringify(tx));
      assert.ok(!isNaN(tx.value));
      assert.ok(tx.type === 'bitcoind_tx' || tx.type === 'paid_invoice', 'unexpected tx type ' + tx.type);
    }
    await l2.fetchBalance();
    assert.ok(l2.getBalance() > 0);
  });

  it('can decode & check invoice', async () => {
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    let l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();

    let invoice =
      'lnbc1u1pdcqpt3pp5ltuevvq2g69kdrzcegrs9gfqjer45rwjc0w736qjl92yvwtxhn6qdp8dp6kuerjv4j9xct5daeks6tnyp3xc6t50f582cscqp2zrkghzl535xjav52ns0rpskcn20takzdr2e02wn4xqretlgdemg596acq5qtfqhjk4jpr7jk8qfuuka2k0lfwjsk9mchwhxcgxzj3tsp09gfpy';
    let decoded = await l2.decodeInvoice(invoice);

    assert.ok(decoded.payment_hash);
    assert.ok(decoded.description);
    assert.ok(decoded.num_satoshis);

    await l2.checkRouteInvoice(invoice);

    // checking that bad invoice cant be decoded
    invoice = 'gsom';
    let error = false;
    try {
      await l2.decodeInvoice(invoice);
    } catch (Err) {
      error = true;
    }
    assert.ok(error);
  });

  it('can pay invoice', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    if (!process.env.STRIKE) {
      console.error('process.env.STRIKE not set, skipped');
      return;
    }

    const api = new Frisbee({
      baseURI: 'https://api.strike.acinq.co',
    });

    api.auth(process.env.STRIKE + ':');

    const res = await api.post('/api/v1/charges', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'amount=1&currency=btc&description=acceptance+test',
    });

    if (!res.body || !res.body.payment_request) {
      throw new Error('Strike problem: ' + JSON.stringify(res));
    }

    let invoice = res.body.payment_request;

    let l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    let txLen = l2.transactions_raw.length;

    let decoded = await l2.decodeInvoice(invoice);
    assert.ok(decoded.payment_hash);
    assert.ok(decoded.description);

    await l2.checkRouteInvoice(invoice);

    let start = +new Date();
    await l2.payInvoice(invoice);
    let end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    await l2.fetchTransactions();
    assert.equal(l2.transactions_raw.length, txLen + 1);
    // transactions became more after paying an invoice

    // now, trying to pay duplicate invoice
    start = +new Date();
    let caughtError = false;
    try {
      await l2.payInvoice(invoice);
    } catch (Err) {
      caughtError = true;
    }
    assert.ok(caughtError);
    await l2.fetchTransactions();
    assert.equal(l2.transactions_raw.length, txLen + 1);
    // havent changed since last time
    end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('duplicate payInvoice took', (end - start) / 1000, 'sec');
    }
  });

  it('can create invoice and pay other blitzhub invoice', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }

    let lOld = new LightningCustodianWallet();
    lOld.setSecret(process.env.BLITZHUB);
    await lOld.authorize();
    await lOld.fetchTransactions();
    let txLen = lOld.transactions_raw.length;

    // creating LND wallet
    let lNew = new LightningCustodianWallet();
    await lNew.createAccount(true);
    await lNew.authorize();
    await lNew.fetchBalance();
    assert.equal(lNew.balance, 0);

    let invoices = await lNew.getUserInvoices();
    let invoice = await lNew.addInvoice(1, 'test memo');
    let invoices2 = await lNew.getUserInvoices();
    assert.equal(invoices2.length, invoices.length + 1);
    assert.ok(invoices2[0].ispaid === false);
    assert.ok(invoices2[0].description);
    assert.equal(invoices2[0].description, 'test memo');
    assert.ok(invoices2[0].payment_request);
    assert.ok(invoices2[0].timestamp);
    assert.ok(invoices2[0].expire_time);
    assert.equal(invoices2[0].amt, 1);
    for (let inv of invoices2) {
      assert.equal(inv.type, 'user_invoice');
    }

    await lOld.fetchBalance();
    let oldBalance = lOld.balance;

    await lOld.checkRouteInvoice(invoice);

    let start = +new Date();
    await lOld.payInvoice(invoice);
    let end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    invoices2 = await lNew.getUserInvoices();
    assert.ok(invoices2[0].ispaid);

    await lOld.fetchBalance();
    await lNew.fetchBalance();
    assert.equal(oldBalance - lOld.balance, 1);
    assert.equal(lNew.balance, 1);

    await lOld.fetchTransactions();
    assert.equal(lOld.transactions_raw.length, txLen + 1, 'internal invoice should also produce record in payer`s tx list');
    let newTx = lOld.transactions_raw.slice().pop();
    assert.ok(typeof newTx.fee !== 'undefined');
    assert.ok(newTx.value);
    assert.ok(newTx.description || newTx.memo, JSON.stringify(newTx));
    assert.ok(newTx.timestamp);
    assert.ok(!isNaN(newTx.value));
    assert.ok(newTx.type === 'paid_invoice', 'unexpected tx type ' + newTx.type);

    // now, paying back that amount
    oldBalance = lOld.balance;
    invoice = await lOld.addInvoice(1, 'test memo');
    await lNew.payInvoice(invoice);
    await lOld.fetchBalance();
    await lNew.fetchBalance();
    assert.equal(lOld.balance - oldBalance, 1);
    assert.equal(lNew.balance, 0);
  });
});
