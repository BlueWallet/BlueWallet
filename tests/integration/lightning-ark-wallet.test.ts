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

// Muted until Lightning is back on Arkade.
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('LightningArkWallet (integration)', () => {
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
  });
});
