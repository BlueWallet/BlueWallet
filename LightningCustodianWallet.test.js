/* global it, describe, jasmine */
import { LightningCustodianWallet } from './class';
let assert = require('assert');

describe('LightningCustodianWallet', () => {
  let l1 = new LightningCustodianWallet();

  it('can create, auth and getbtc', async () => {
    assert.ok(l1.refill_addressess.length === 0);
    assert.ok(l1._refresh_token_created_ts === 0);
    assert.ok(l1._access_token_created_ts === 0);
    l1.balance = 'FAKE';
    try {
      await l1.createAccount();
      await l1.authorize();
      await l1.fetchBtcAddress();
      await l1.fetchBalance();
      await l1.fetchInfo();
      await l1.fetchPendingTransactions();
    } catch (Err) {
      console.warn(Err.message);
    }

    assert.ok(l1.access_token);
    assert.ok(l1.refresh_token);
    assert.ok(l1._refresh_token_created_ts > 0);
    assert.ok(l1._access_token_created_ts > 0);
    assert.ok(l1.refill_addressess.length > 0);
    assert.ok(l1.balance === 0);
    assert.ok(l1.info_raw);
    assert.ok(l1.pending_transactions_raw.length === 0);
  });

  it('can refresh token', async () => {
    let old_refresh_token = l1.refresh_token;
    let old_access_token = l1.access_token;
    await l1.refreshAcessToken();
    assert.ok(old_refresh_token !== l1.refresh_token);
    assert.ok(old_access_token !== l1.access_token);
    assert.ok(l1.access_token);
    assert.ok(l1.refresh_token);
  });

  it('can use existing login/pass', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    let l2 = new LightningCustodianWallet();
    l2.setSecret('blitzhub://fenjeflw:ToPgV#Lzz{d6hmV?');
    await l2.authorize();
    await l2.fetchBtcAddress();
    console.log(l2.refill_addressess);
    await l2.fetchPendingTransactions();
    console.log(l2.pending_transactions_raw);
    await l2.fetchTransactions();
    console.log('transactions_raw =', l2.transactions_raw);

    await l2.fetchBalance();
    console.log('balance', l2.getBalance());

    let invoice =
      'lnbc1u1pdha2z6pp5fpg6uqp3dn7ffwn6u2ggv4r9t8nndrrf2awnu0km7qhs384xh7yqdp8dp6kuerjv4j9xct5daeks6tnyp3xc6t50f582cscqp2rtks3v6nr3llcaufqg3yng25d68wddwjwfj25042juecd9dn937p3arsjt2mp985wgz9cwnu4s3uf38lpla8uydcuym42jrjy7nydysqs593lp';

    // await l2.payInvoice(invoice);
    // console.log('paid invoice');

    // await l2.fetchTransactions();
    // console.log('transactions_raw =', l2.transactions_raw);
  });

  it.only('can use existing login/pass 2', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
    let l2 = new LightningCustodianWallet();
    l2.setSecret('blitzhub://fenjeflw:ToPgV#Lzz{d6hmV?');
    await l2.fetchBalance();
  });
});
