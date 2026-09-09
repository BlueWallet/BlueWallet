import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';
import { disposeAllArkadeRuntime, teardownArkadeWallet } from '../helpers/arkadeMocks';
import { installSdkBackgroundLoopStubs, restoreSdkBackgroundLoopStubs } from '../helpers/sdkProviderMocks';

// Ark storage lives in Realm, not AsyncStorage. Realm + Keychain are mocked
// globally by tests/setup.js (per-path Realm + service-keyed Keychain), and
// pure unit-level coverage lives in tests/unit/lightning-ark-wallet.test.ts
// and tests/unit/lightning-ark-derivation.test.ts. What remains here are the
// env-gated tests that exercise the real init pipeline against the
// production ASP / delegator using a real mnemonic.

jest.setTimeout(30_000);

// This migration is that event: the suite runs un-skipped (env-gated).
describe('LightningArkWallet (integration)', () => {
  const w = new LightningArkWallet();

  beforeAll(async () => {
    // Install before the env guard: `can generate` runs init() regardless of
    // HD_MNEMONIC_OLD, and without the stubs its background loops keep Jest alive.
    installSdkBackgroundLoopStubs();
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }
    w.setSecret('arkade://' + process.env.HD_MNEMONIC_OLD);
    await w.init();
    // Corridor records restore from the local repository only — `await
    // client.ready` inside init() already ran the restore read. No
    // server-side swap refetch exists.
  });

  afterAll(async () => {
    if (process.env.HD_MNEMONIC_OLD) {
      await teardownArkadeWallet(w);
    }
    await disposeAllArkadeRuntime();
    restoreSdkBackgroundLoopStubs();
  });

  it('can generate', async () => {
    const wGenerated = new LightningArkWallet();
    try {
      await wGenerated.generate();

      assert.ok(wGenerated.getSecret().startsWith('arkade://'));

      const mnemonics = wGenerated.getSecret().replace('arkade://', '');
      const hd = new HDSegwitBech32Wallet();
      hd.setSecret(mnemonics);
      assert.ok(hd.validateMnemonic());
    } finally {
      await teardownArkadeWallet(wGenerated);
    }
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

    const txs = w.getTransactions();
    assert.ok(txs.length > 0, 'Should have transaction history from the Ark indexer');

    const receiveTx = txs.find(t => t.value! > 0);
    assert.ok(receiveTx, 'Should have at least one receive transaction');
    assert.ok(receiveTx.value! > 0);
    assert.ok(receiveTx.timestamp! > 0);
    assert.ok(receiveTx.memo);

    const swapViews: any[] = w.getSwapViews();
    const settledReceive = swapViews.find(s => s.direction > 0 && ['paid', 'claimed', 'filled'].includes(s.outcome));
    if (settledReceive) {
      // When v2 receive history is restored, settled receives read paid.
      assert.strictEqual(receiveTx.ispaid, true);
      assert.ok(receiveTx.payment_hash);
      assert.ok(receiveTx.payment_request);

      const ownInvoice = settledReceive.bolt11;
      if (ownInvoice) {
        assert.ok(w.isInvoiceGeneratedByWallet(ownInvoice));
      }
    }

    const settledSend = swapViews.find(s => s.direction < 0 && ['paid', 'claimed', 'filled'].includes(s.outcome));
    if (settledSend) {
      const sendTx = txs.find(t => t.value! < 0);
      assert.ok(sendTx, 'Should have a send transaction when settled send history exists');
      assert.strictEqual(sendTx.ispaid, true);
      assert.ok(sendTx.payment_hash);
      assert.ok(sendTx.payment_request);
    }

    const invoices = await w.getUserInvoices();
    if (settledReceive) {
      assert.ok(invoices.length > 0);
      assert(invoices[0].value! > 0);
      assert(invoices[0].ispaid);
    }
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
