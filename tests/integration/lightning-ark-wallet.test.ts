import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';

// Ark storage lives in Realm, not AsyncStorage. Realm + Keychain are mocked
// globally by tests/setup.js (per-path Realm + service-keyed Keychain), and
// pure unit-level coverage lives in tests/unit/lightning-ark-wallet.test.ts
// and tests/unit/lightning-ark-derivation.test.ts. What remains here are the
// env-gated tests that exercise the real init pipeline against the
// production ASP / delegator using a real mnemonic.

jest.setTimeout(30_000);

const w = new LightningArkWallet();

beforeAll(async () => {
  if (!process.env.HD_MNEMONIC_OLD) {
    console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
    return;
  }
  w.setSecret('arkade://' + process.env.HD_MNEMONIC_OLD);
  await w.init();
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 3_000)); // sleep
});

describe('LightningArkWallet (integration)', () => {
  it('can generate', async () => {
    const wGenerated = new LightningArkWallet();
    await wGenerated.generate();

    assert.ok(wGenerated.getSecret().startsWith('arkade://'));

    const mnemonics = wGenerated.getSecret().replace('arkade://', '');
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonics);
    assert.ok(hd.validateMnemonic());
  });

  it('can fetch balance', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    await w.fetchBalance();
    const balance = w.getBalance();

    assert.ok(balance > 0);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can create invoice', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    const invoice = await w.addInvoice(1000, 'test invoice');
    console.log(invoice);
  });

  it('can fetch txs', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    await w.fetchTransactions();
    await w.fetchUserInvoices();

    const txs = w.getTransactions();
    assert.ok(txs.length > 0);

    // Find the reverse swap (incoming) transaction
    const receiveTx = txs.find(t => t.value! > 0);
    assert.ok(receiveTx, 'Should have at least one receive transaction');
    assert.strictEqual(receiveTx.memo, 'test invoice');
    assert.strictEqual(receiveTx.value, 9999);
    assert.strictEqual(receiveTx.timestamp, 1761224952);
    assert.strictEqual(receiveTx.ispaid, true);
    assert.ok(receiveTx.payment_hash);
    assert.ok(receiveTx.payment_request);
    assert.strictEqual(receiveTx.payment_preimage, '7244f7e956a91171038ea935d56cdb758cc36c345f0aa92764bfed6fe6fc9b17');

    // Find the submarine swap (outgoing) transaction
    const sendTx = txs.find(t => t.value! < 0);
    assert.ok(sendTx, 'Should have at least one send transaction');
    assert.strictEqual(sendTx.value, -8001);
    assert.strictEqual(sendTx.timestamp, 1761225645);
    assert.strictEqual(sendTx.ispaid, true);
    assert.ok(sendTx.payment_hash);
    assert.ok(sendTx.payment_request);
    assert.strictEqual(sendTx.payment_preimage, '182fb8f273bda01b22c0e91991e093e18b2970f389fc7f7a2121870324eb2de5');

    const invoices = await w.getUserInvoices();
    assert.ok(invoices.length > 0);
    assert(invoices[0].value! > 0);
    assert(invoices[0].ispaid);

    assert.ok(
      w.isInvoiceGeneratedByWallet(
        'lnbc100u1p50528cpp5rhy4fgs0ff23asecxtxt9zvc3apn0p8h7fxsj0d5k7j3x92zwhlqdq5w3jhxapqd9h8vmmfvdjscqrp80xqyf8ucsp5vcsrzye432n9wh0zwuv5z8y5n9zvkwpctr685e80utzc2yueccms9qxpqysgqd87swq3hput9k6llp0wxg098hc7ge3e5nrtnvak6zreywzaf4k9s8d3u4hrmt3m22kf0jt7ruqj0caknk5ykzdenjdphz50t7xrstnqqn6aw0m',
      ),
    );
    assert.ok(
      !w.isInvoiceGeneratedByWallet(
        'lnbc80u1p5052hwpp5z4ln6hyq4wcck809pt7f0q54ag5he6ce797flm7gl9vuccm9lx2sdqqcqzysxqyz5vqsp5nh9fl4g36606tvxswtnfxzy55yze2656cw2fya7dhl8r6u0czyds9qxpqysgq83sw25g9d9ltr05nkfzejnvvunzkrk4qeuxhszuvvsguk5m6vmg3a7n5nd67l9frru3kjzpt8x6jfusjyc7ezh49jeeh900kt3v30qsqzq7fst',
      ),
    );
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can pay invoice', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    await w.payInvoice(
      'lnbc80u1p5052hwpp5z4ln6hyq4wcck809pt7f0q54ag5he6ce797flm7gl9vuccm9lx2sdqqcqzysxqyz5vqsp5nh9fl4g36606tvxswtnfxzy55yze2656cw2fya7dhl8r6u0czyds9qxpqysgq83sw25g9d9ltr05nkfzejnvvunzkrk4qeuxhszuvvsguk5m6vmg3a7n5nd67l9frru3kjzpt8x6jfusjyc7ezh49jeeh900kt3v30qsqzq7fst',
    );
  });
});
