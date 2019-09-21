/* global it, describe, jasmine */
import Frisbee from 'frisbee';
import { LightningCustodianWallet } from '../../class';
let assert = require('assert');

describe('LightningCustodianWallet', () => {
  let l1 = new LightningCustodianWallet();

  it.skip('issue credentials', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    assert.ok(l1.refill_addressess.length === 0);
    assert.ok(l1._refresh_token_created_ts === 0);
    assert.ok(l1._access_token_created_ts === 0);
    l1.balance = 'FAKE';

    await l1.createAccount(false);
    await l1.authorize();

    assert.ok(l1.access_token);
    assert.ok(l1.refresh_token);
    assert.ok(l1._refresh_token_created_ts > 0);
    assert.ok(l1._access_token_created_ts > 0);
    console.log(l1.getSecret());
  });

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
    assert.strictEqual(l2.transactions_raw.length, txLen + 1);
    let lastTx = l2.transactions_raw[l2.transactions_raw.length - 1];
    assert.strictEqual(typeof lastTx.payment_preimage, 'string', 'preimage is present and is a string');
    assert.strictEqual(lastTx.payment_preimage.length, 64, 'preimage is present and is a string of 32 hex-encoded bytes');
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
    assert.strictEqual(l2.transactions_raw.length, txLen + 1);
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
    assert.strictEqual(lNew.balance, 0);

    let invoices = await lNew.getUserInvoices();
    let invoice = await lNew.addInvoice(1, 'test memo');
    let invoices2 = await lNew.getUserInvoices();
    assert.strictEqual(invoices2.length, invoices.length + 1);
    assert.ok(invoices2[0].ispaid === false);
    assert.ok(invoices2[0].description);
    assert.strictEqual(invoices2[0].description, 'test memo');
    assert.ok(invoices2[0].payment_request);
    assert.ok(invoices2[0].timestamp);
    assert.ok(invoices2[0].expire_time);
    assert.strictEqual(invoices2[0].amt, 1);
    for (let inv of invoices2) {
      assert.strictEqual(inv.type, 'user_invoice');
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
    assert.strictEqual(oldBalance - lOld.balance, 1);
    assert.strictEqual(lNew.balance, 1);

    await lOld.fetchTransactions();
    assert.strictEqual(lOld.transactions_raw.length, txLen + 1, 'internal invoice should also produce record in payer`s tx list');
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
    assert.strictEqual(lOld.balance - oldBalance, 1);
    assert.strictEqual(lNew.balance, 0);

    // now, paying same internal invoice. should fail:

    let coughtError = false;
    await lOld.fetchTransactions();
    txLen = lOld.transactions_raw.length;
    let invLen = (await lNew.getUserInvoices()).length;
    try {
      await lOld.payInvoice(invoice);
    } catch (Err) {
      coughtError = true;
    }
    assert.ok(coughtError);

    await lOld.fetchTransactions();
    assert.strictEqual(txLen, lOld.transactions_raw.length, 'tx count should not be changed');
    assert.strictEqual(invLen, (await lNew.getUserInvoices()).length, 'invoices count should not be changed');

    // testing how limiting works:
    assert.strictEqual(lNew.user_invoices_raw.length, 1);
    await lNew.addInvoice(666, 'test memo 2');
    invoices = await lNew.getUserInvoices(1);
    assert.strictEqual(invoices.length, 2);
    assert.strictEqual(invoices[0].amt, 1);
    assert.strictEqual(invoices[1].amt, 666);
  });

  it('can pay free amount (tip) invoice', async function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }

    // fetchig invoice from tippin.me :

    const api = new Frisbee({
      baseURI: 'https://tippin.me',
    });
    const res = await api.post('/lndreq/newinvoice.php', {
      headers: {
        Origin: 'https://tippin.me',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      body: 'userid=1188&username=overtorment&istaco=0&customAmnt=0&customMemo=',
    });

    let json;
    let invoice;
    if (res && res.body && (json = JSON.parse(res.body)) && json.message) {
      invoice = json.message;
    } else {
      throw new Error('tippin.me problem: ' + JSON.stringify(res));
    }

    // --> use to pay specific invoice
    // invoice =
    //   'lnbc1pwrp35spp5z62nvj8yw6luq7ns4a8utpwn2qkkdwdt0ludwm54wjeazk2xv5wsdpu235hqurfdcsx7an9wf6x7undv4h8ggpgw35hqurfdchx6eff9p6nzvfc8q5scqzysxqyz5vqj8xq6wz6dezmunw6qxleuw67ensjnt3fldltrmmkvzurge0dczpn94fkwwh7hkh5wqrhsvfegtvhswn252hn6uw5kx99dyumz4v5n9sp337py2';

    let l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    await l2.fetchBalance();
    let oldBalance = +l2.balance;
    let txLen = l2.transactions_raw.length;

    let decoded = await l2.decodeInvoice(invoice);
    assert.ok(decoded.payment_hash);
    assert.ok(decoded.description);
    assert.strictEqual(+decoded.num_satoshis, 0);

    await l2.checkRouteInvoice(invoice);

    // first, tip invoice without amount should not work:
    let gotError = false;
    try {
      await l2.payInvoice(invoice);
    } catch (_) {
      gotError = true;
    }
    assert.ok(gotError);

    // then, pay:

    let start = +new Date();
    await l2.payInvoice(invoice, 3);
    let end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    await l2.fetchTransactions();
    assert.strictEqual(l2.transactions_raw.length, txLen + 1);
    // transactions became more after paying an invoice

    await l2.fetchBalance();
    assert.strictEqual(oldBalance - l2.balance, 3);
  });

  it('cant create zemo amt invoices yet', async () => {
    let l1 = new LightningCustodianWallet();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    assert.ok(l1.refill_addressess.length === 0);
    assert.ok(l1._refresh_token_created_ts === 0);
    assert.ok(l1._access_token_created_ts === 0);
    l1.balance = 'FAKE';

    await l1.createAccount(true);
    await l1.authorize();
    await l1.fetchBalance();

    assert.ok(l1.access_token);
    assert.ok(l1.refresh_token);
    assert.ok(l1._refresh_token_created_ts > 0);
    assert.ok(l1._access_token_created_ts > 0);
    assert.ok(l1.balance === 0);

    let err = false;
    try {
      await l1.addInvoice(0, 'zero amt inv');
    } catch (_) {
      err = true;
    }
    assert.ok(err);

    err = false;
    try {
      await l1.addInvoice(NaN, 'zero amt inv');
    } catch (_) {
      err = true;
    }
    assert.ok(err);
  });

  it('cant pay negative free amount', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }

    // fetchig invoice from tippin.me :

    const api = new Frisbee({
      baseURI: 'https://tippin.me',
    });
    const res = await api.post('/lndreq/newinvoice.php', {
      headers: {
        Origin: 'https://tippin.me',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      body: 'userid=1188&username=overtorment&istaco=0&customAmnt=0&customMemo=',
    });

    let json;
    let invoice;
    if (res && res.body && (json = JSON.parse(res.body)) && json.message) {
      invoice = json.message;
    } else {
      throw new Error('tippin.me problem: ' + JSON.stringify(res));
    }

    let l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    await l2.fetchBalance();
    let oldBalance = +l2.balance;
    let txLen = l2.transactions_raw.length;

    let decoded = await l2.decodeInvoice(invoice);
    assert.ok(decoded.payment_hash);
    assert.ok(decoded.description);
    assert.strictEqual(+decoded.num_satoshis, 0);

    await l2.checkRouteInvoice(invoice);

    let error = false;
    try {
      await l2.payInvoice(invoice, -1);
    } catch (Err) {
      error = true;
    }
    assert.ok(error);
    await l2.fetchBalance();
    assert.strictEqual(l2.balance, oldBalance);
    await l2.fetchTransactions();
    assert.strictEqual(l2.transactions_raw.length, txLen);
  });
});
