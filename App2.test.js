/* global it, describe, jasmine */
import { WatchOnlyWallet } from './class';
let assert = require('assert');

it('bip38 decodes', async () => {
  const bip38 = require('./bip38');
  const wif = require('wif');

  let encryptedKey = '6PRVWUbkzq2VVjRuv58jpwVjTeN46MeNmzUHqUjQptBJUHGcBakduhrUNc';
  let decryptedKey = await bip38.decrypt(
    encryptedKey,
    'TestingOneTwoThree',
    () => {},
    { N: 1, r: 8, p: 8 }, // using non-default parameters to speed it up (not-bip38 compliant)
  );

  assert.strictEqual(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    '5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR',
  );
});

it('bip38 decodes slow', async () => {
  if (process.env.USER === 'burn' || process.env.USER === 'igor') {
    // run only on circleCI
    return;
  }
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  const bip38 = require('bip38');
  const wif = require('wif');

  let encryptedKey = '6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN';
  let decryptedKey = await bip38.decrypt(encryptedKey, 'qwerty', status => process.stdout.write(parseInt(status.percent) + '%\r'));

  assert.strictEqual(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    'KxqRtpd9vFju297ACPKHrGkgXuberTveZPXbRDiQ3MXZycSQYtjc',
  );
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
  });
});
