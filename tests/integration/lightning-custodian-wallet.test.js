import Frisbee from 'frisbee';
import { LightningCustodianWallet } from '../../class';

describe.skip('LightningCustodianWallet', () => {
  const l1 = new LightningCustodianWallet();

  it.skip('issue credentials', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    expect(l1.refill_addressess.length === 0).toBeTruthy();
    expect(l1._refresh_token_created_ts === 0).toBeTruthy();
    expect(l1._access_token_created_ts === 0).toBeTruthy();
    l1.balance = 'FAKE';

    await l1.createAccount(false);
    await l1.authorize();

    expect(l1.access_token).toBeTruthy();
    expect(l1.refresh_token).toBeTruthy();
    expect(l1._refresh_token_created_ts > 0).toBeTruthy();
    expect(l1._access_token_created_ts > 0).toBeTruthy();
    console.log(l1.getSecret());
  });

  it('can create, auth and getbtc', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    expect(l1.refill_addressess.length === 0).toBeTruthy();
    expect(l1._refresh_token_created_ts === 0).toBeTruthy();
    expect(l1._access_token_created_ts === 0).toBeTruthy();
    l1.balance = 'FAKE';

    await l1.createAccount(true);
    await l1.authorize();
    await l1.fetchBtcAddress();
    await l1.fetchBalance();
    await l1.fetchInfo();
    await l1.fetchTransactions();
    await l1.fetchPendingTransactions();

    expect(l1.access_token).toBeTruthy();
    expect(l1.refresh_token).toBeTruthy();
    expect(l1._refresh_token_created_ts > 0).toBeTruthy();
    expect(l1._access_token_created_ts > 0).toBeTruthy();
    expect(l1.refill_addressess.length > 0).toBeTruthy();
    expect(l1.balance === 0).toBeTruthy();
    expect(l1.info_raw).toBeTruthy();
    expect(l1.pending_transactions_raw.length === 0).toBeTruthy();
    expect(l1.transactions_raw.length === 0).toBeTruthy();
    expect(l1.transactions_raw.length === l1.getTransactions().length).toBeTruthy();
  });

  it('can refresh token', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    const oldRefreshToken = l1.refresh_token;
    const oldAccessToken = l1.access_token;
    await l1.refreshAcessToken();
    expect(oldRefreshToken !== l1.refresh_token).toBeTruthy();
    expect(oldAccessToken !== l1.access_token).toBeTruthy();
    expect(l1.access_token).toBeTruthy();
    expect(l1.refresh_token).toBeTruthy();
  });

  it('can use existing login/pass', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchPendingTransactions();
    await l2.fetchTransactions();

    expect(l2.pending_transactions_raw.length === 0).toBeTruthy();
    expect(l2.transactions_raw.length > 0).toBeTruthy();
    expect(l2.transactions_raw.length === l2.getTransactions().length).toBeTruthy();
    for (const tx of l2.getTransactions()) {
      expect(typeof tx.fee !== 'undefined').toBeTruthy();
      expect(tx.value).toBeTruthy();
      expect(tx.timestamp).toBeTruthy();
      expect(tx.description || tx.memo).toBeTruthy();
      expect(!isNaN(tx.value)).toBeTruthy();
      expect(tx.type === 'bitcoind_tx' || tx.type === 'paid_invoice').toBeTruthy();
    }
    await l2.fetchBalance();
    expect(l2.getBalance() > 0).toBeTruthy();
  });

  it('can decode & check invoice', async () => {
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();

    let invoice =
      'lnbc1u1pdcqpt3pp5ltuevvq2g69kdrzcegrs9gfqjer45rwjc0w736qjl92yvwtxhn6qdp8dp6kuerjv4j9xct5daeks6tnyp3xc6t50f582cscqp2zrkghzl535xjav52ns0rpskcn20takzdr2e02wn4xqretlgdemg596acq5qtfqhjk4jpr7jk8qfuuka2k0lfwjsk9mchwhxcgxzj3tsp09gfpy';
    const decoded = l2.decodeInvoice(invoice);

    expect(decoded.payment_hash).toBeTruthy();
    expect(decoded.description).toBeTruthy();
    expect(decoded.num_satoshis).toBeTruthy();
    expect(parseInt(decoded.num_satoshis) * 1000).toBe(parseInt(decoded.num_millisatoshis));

    // checking that bad invoice cant be decoded
    invoice = 'gsom';
    let error = false;
    try {
      l2.decodeInvoice(invoice);
    } catch (Err) {
      error = true;
    }
    expect(error).toBeTruthy();
  });

  it('decode can handle zero sats but present msats', async () => {
    const l = new LightningCustodianWallet();
    const decoded = l.decodeInvoice(
      'lnbc89n1p0zptvhpp5j3h5e80vdlzn32df8y80nl2t7hssn74lzdr96ve0u4kpaupflx2sdphgfkx7cmtwd68yetpd5s9xct5v4kxc6t5v5s9gunpdeek66tnwd5k7mscqp2sp57m89zv0lrgc9zzaxy5p3d5rr2cap2pm6zm4n0ew9vyp2d5zf2mfqrzjqfxj8p6qjf5l8du7yuytkwdcjhylfd4gxgs48t65awjg04ye80mq7z990yqq9jsqqqqqqqqqqqqq05qqrc9qy9qsq9mynpa9ucxg53hwnvw323r55xdd3l6lcadzs584zvm4wdw5pv3eksdlcek425pxaqrn9u5gpw0dtpyl9jw2pynjtqexxgh50akwszjgq4ht4dh',
    );
    expect(decoded.num_satoshis).toBe('8.9');
  });

  it('can decode invoice locally & remotely', async () => {
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    const invoice =
      'lnbc1u1pdcqpt3pp5ltuevvq2g69kdrzcegrs9gfqjer45rwjc0w736qjl92yvwtxhn6qdp8dp6kuerjv4j9xct5daeks6tnyp3xc6t50f582cscqp2zrkghzl535xjav52ns0rpskcn20takzdr2e02wn4xqretlgdemg596acq5qtfqhjk4jpr7jk8qfuuka2k0lfwjsk9mchwhxcgxzj3tsp09gfpy';
    const decodedLocally = l2.decodeInvoice(invoice);
    const decodedRemotely = await l2.decodeInvoiceRemote(invoice);
    expect(decodedLocally.destination).toBe(decodedRemotely.destination);
    expect(decodedLocally.num_satoshis).toBe(decodedRemotely.num_satoshis);
    expect(decodedLocally.timestamp).toBe(decodedRemotely.timestamp);
    expect(decodedLocally.expiry).toBe(decodedRemotely.expiry);
    expect(decodedLocally.payment_hash).toBe(decodedRemotely.payment_hash);
    expect(decodedLocally.description).toBe(decodedRemotely.description);
    expect(decodedLocally.cltv_expiry).toBe(decodedRemotely.cltv_expiry);
  });

  it('can pay invoice from opennode', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    if (!process.env.OPENNODE) {
      console.error('process.env.OPENNODE not set, skipped');
      return;
    }
    const api = new Frisbee({
      baseURI: 'https://api.opennode.co',
    });

    const res = await api.post('/v1/charges', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.OPENNODE,
      },
      body: '{"amount": "0.01", "currency": "USD"}',
    });
    if (!res.body || !res.body.data || !res.body.data.lightning_invoice || !res.body.data.lightning_invoice.payreq) {
      throw new Error('Opennode problem');
    }

    const invoice = res.body.data.lightning_invoice.payreq;

    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    const txLen = l2.transactions_raw.length;

    const start = +new Date();
    await l2.payInvoice(invoice);
    const end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen + 1);
    const lastTx = l2.transactions_raw[l2.transactions_raw.length - 1];
    expect(typeof lastTx.payment_preimage).toBe('string');
    expect(lastTx.payment_preimage.length).toBe(64);
    // transactions became more after paying an invoice
  });

  // turned off because acinq strike is shutting down
  it.skip('can pay invoice (acinq)', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
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
      headers: {},
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

    const invoice = res.body.payment_request;

    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    const txLen = l2.transactions_raw.length;

    const decoded = l2.decodeInvoice(invoice);
    expect(decoded.payment_hash).toBeTruthy();
    expect(decoded.description).toBeTruthy();

    let start = +new Date();
    await l2.payInvoice(invoice);
    let end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen + 1);
    const lastTx = l2.transactions_raw[l2.transactions_raw.length - 1];
    expect(typeof lastTx.payment_preimage).toBe('string');
    expect(lastTx.payment_preimage.length).toBe(64);
    // transactions became more after paying an invoice

    // now, trying to pay duplicate invoice
    start = +new Date();
    let caughtError = false;
    try {
      await l2.payInvoice(invoice);
    } catch (Err) {
      caughtError = true;
    }
    expect(caughtError).toBeTruthy();
    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen + 1);
    // havent changed since last time
    end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('duplicate payInvoice took', (end - start) / 1000, 'sec');
    }
  });

  it('can pay invoice (bitrefill)', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }
    if (!process.env.BITREFILL) {
      console.error('process.env.BITREFILL not set, skipped');
      return;
    }

    const api = new Frisbee({
      baseURI: 'https://api.bitrefill.com',
      headers: {},
    });

    const res = await api.get('/v1/lnurl_pay/' + process.env.BITREFILL + '/callback?amount=1000');

    if (!res.body || !res.body.pr) {
      throw new Error('Bitrefill problem: ' + JSON.stringify(res));
    }

    const invoice = res.body.pr;

    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    const txLen = l2.transactions_raw.length;

    const decoded = l2.decodeInvoice(invoice);
    expect(decoded.payment_hash).toBeTruthy();

    let start = +new Date();
    await l2.payInvoice(invoice);
    let end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen + 1);
    const lastTx = l2.transactions_raw[l2.transactions_raw.length - 1];
    expect(typeof lastTx.payment_preimage).toBe('string');
    expect(lastTx.payment_preimage.length).toBe(64);
    // transactions became more after paying an invoice

    // now, trying to pay duplicate invoice
    start = +new Date();
    let caughtError = false;
    try {
      await l2.payInvoice(invoice);
    } catch (Err) {
      caughtError = true;
    }
    expect(caughtError).toBeTruthy();
    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen + 1);
    // havent changed since last time
    end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('duplicate payInvoice took', (end - start) / 1000, 'sec');
    }
  });

  it('can create invoice and pay other blitzhub invoice', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.BLITZHUB) {
      console.error('process.env.BLITZHUB not set, skipped');
      return;
    }

    const lOld = new LightningCustodianWallet();
    lOld.setSecret(process.env.BLITZHUB);
    await lOld.authorize();
    await lOld.fetchTransactions();
    let txLen = lOld.transactions_raw.length;

    // creating LND wallet
    const lNew = new LightningCustodianWallet();
    await lNew.createAccount(true);
    await lNew.authorize();
    await lNew.fetchBalance();
    expect(lNew.balance).toBe(0);

    let invoices = await lNew.getUserInvoices();
    let invoice = await lNew.addInvoice(1, 'test memo');
    const decoded = lNew.decodeInvoice(invoice);
    let invoices2 = await lNew.getUserInvoices();
    expect(invoices2.length).toBe(invoices.length + 1);
    expect(invoices2[0].ispaid === false).toBeTruthy();
    expect(invoices2[0].description).toBeTruthy();
    expect(invoices2[0].description).toBe('test memo');
    expect(invoices2[0].payment_request).toBeTruthy();
    expect(invoices2[0].timestamp).toBeTruthy();
    expect(invoices2[0].expire_time).toBeTruthy();
    expect(invoices2[0].amt).toBe(1);
    for (const inv of invoices2) {
      expect(inv.type).toBe('user_invoice');
    }

    await lOld.fetchBalance();
    let oldBalance = lOld.balance;

    const start = +new Date();
    await lOld.payInvoice(invoice);
    const end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    invoices2 = await lNew.getUserInvoices();
    expect(invoices2[0].ispaid).toBeTruthy();

    expect(lNew.weOwnTransaction(decoded.payment_hash)).toBeTruthy();
    expect(!lNew.weOwnTransaction('d45818ae11a584357f7b74da26012d2becf4ef064db015a45bdfcd9cb438929d')).toBeTruthy();

    await lOld.fetchBalance();
    await lNew.fetchBalance();
    expect(oldBalance - lOld.balance).toBe(1);
    expect(lNew.balance).toBe(1);

    await lOld.fetchTransactions();
    expect(lOld.transactions_raw.length).toBe(txLen + 1);
    const newTx = lOld.transactions_raw.slice().pop();
    expect(typeof newTx.fee !== 'undefined').toBeTruthy();
    expect(newTx.value).toBeTruthy();
    expect(newTx.description || newTx.memo).toBeTruthy();
    expect(newTx.timestamp).toBeTruthy();
    expect(!isNaN(newTx.value)).toBeTruthy();
    expect(newTx.type === 'paid_invoice').toBeTruthy();

    // now, paying back that amount
    oldBalance = lOld.balance;
    invoice = await lOld.addInvoice(1, 'test memo');
    await lNew.payInvoice(invoice);
    await lOld.fetchBalance();
    await lNew.fetchBalance();
    expect(lOld.balance - oldBalance).toBe(1);
    expect(lNew.balance).toBe(0);

    // now, paying same internal invoice. should fail:

    let coughtError = false;
    await lOld.fetchTransactions();
    txLen = lOld.transactions_raw.length;
    const invLen = (await lNew.getUserInvoices()).length;
    try {
      await lOld.payInvoice(invoice);
    } catch (Err) {
      coughtError = true;
    }
    expect(coughtError).toBeTruthy();

    await lOld.fetchTransactions();
    expect(txLen).toBe(lOld.transactions_raw.length);
    expect(invLen).toBe((await lNew.getUserInvoices()).length);

    // testing how limiting works:
    expect(lNew.user_invoices_raw.length).toBe(1);
    await lNew.addInvoice(666, 'test memo 2');
    invoices = await lNew.getUserInvoices(1);
    expect(invoices.length).toBe(2);
    expect(invoices[0].amt).toBe(1);
    expect(invoices[1].amt).toBe(666);
  });

  it('can pay invoice with free amount (tippin.me)', async function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
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

    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    await l2.fetchBalance();
    const oldBalance = +l2.balance;
    const txLen = l2.transactions_raw.length;

    const decoded = l2.decodeInvoice(invoice);
    expect(decoded.payment_hash).toBeTruthy();
    expect(decoded.description).toBeTruthy();
    expect(+decoded.num_satoshis).toBe(0);

    // first, tip invoice without amount should not work:
    let gotError = false;
    try {
      await l2.payInvoice(invoice);
    } catch (_) {
      gotError = true;
    }
    expect(gotError).toBeTruthy();

    // then, pay:

    const start = +new Date();
    await l2.payInvoice(invoice, 3);
    const end = +new Date();
    if ((end - start) / 1000 > 9) {
      console.warn('payInvoice took', (end - start) / 1000, 'sec');
    }

    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen + 1);
    // transactions became more after paying an invoice

    await l2.fetchBalance();
    expect(oldBalance - l2.balance >= 3).toBeTruthy();
    expect(oldBalance - l2.balance < 10).toBeTruthy(); // sanity check
  });

  it('cant create zemo amt invoices yet', async () => {
    const l1 = new LightningCustodianWallet();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    expect(l1.refill_addressess.length === 0).toBeTruthy();
    expect(l1._refresh_token_created_ts === 0).toBeTruthy();
    expect(l1._access_token_created_ts === 0).toBeTruthy();
    l1.balance = 'FAKE';

    await l1.createAccount(true);
    await l1.authorize();
    await l1.fetchBalance();

    expect(l1.access_token).toBeTruthy();
    expect(l1.refresh_token).toBeTruthy();
    expect(l1._refresh_token_created_ts > 0).toBeTruthy();
    expect(l1._access_token_created_ts > 0).toBeTruthy();
    expect(l1.balance === 0).toBeTruthy();

    let err = false;
    try {
      await l1.addInvoice(0, 'zero amt inv');
    } catch (_) {
      err = true;
    }
    expect(err).toBeTruthy();

    err = false;
    try {
      await l1.addInvoice(NaN, 'zero amt inv');
    } catch (_) {
      err = true;
    }
    expect(err).toBeTruthy();
  });

  it('cant pay negative free amount', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
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

    const l2 = new LightningCustodianWallet();
    l2.setSecret(process.env.BLITZHUB);
    await l2.authorize();
    await l2.fetchTransactions();
    await l2.fetchBalance();
    const oldBalance = +l2.balance;
    const txLen = l2.transactions_raw.length;

    const decoded = l2.decodeInvoice(invoice);
    expect(decoded.payment_hash).toBeTruthy();
    expect(decoded.description).toBeTruthy();
    expect(+decoded.num_satoshis).toBe(0);

    let error = false;
    try {
      await l2.payInvoice(invoice, -1);
    } catch (Err) {
      error = true;
    }
    expect(error).toBeTruthy();
    await l2.fetchBalance();
    expect(l2.balance).toBe(oldBalance);
    await l2.fetchTransactions();
    expect(l2.transactions_raw.length).toBe(txLen);
  });
});
