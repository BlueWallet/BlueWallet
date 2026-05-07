import assert from 'assert';

import { ArkRealmSchemas, ARK_REALM_SCHEMA_VERSION } from '@arkade-os/sdk/repositories/realm';
import { BoltzRealmSchemas } from '@arkade-os/boltz-swap/repositories/realm';

import { LightningArkWallet, __testing__ as walletTesting } from '../../class/wallets/lightning-ark-wallet.ts';
import { resetArkadeTestState } from '../helpers/arkadeMocks';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

beforeEach(() => {
  resetArkadeTestState();
});

describe('LightningArkWallet — pure', () => {
  describe('isAddressValid', () => {
    const w = new LightningArkWallet();

    it('accepts known valid Ark addresses', () => {
      assert.ok(
        w.isAddressValid(
          'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t5z8sz5n95k570z5r004szc9h2q3qprkzdd5zveujdpx24srcrqg8hf6j4v',
        ),
      );
      assert.ok(
        w.isAddressValid(
          'ark1qqellv77udfmr20tun8dvju5vgudpf9vxe8jwhthrkn26fz96pawqfdy8nk05rsmrf8h94j26905e7n6sng8y059z8ykn2j5xcuw4xt8ngt9rw',
        ),
      );
      assert.ok(
        w.isAddressValid(
          'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t4sedhdvfcgaky2qk2p55wj4ut38v9tnpuvjr8ee8hv6htp23pzjpwx5esw',
        ),
      );
    });

    it('rejects truncated, malformed, or non-ark addresses', () => {
      assert.ok(
        !w.isAddressValid(
          'ark1qqellv77udfmr20tun8dvju5vgudpf9vxe8jwhthrkn26fz96pawqfdy8nk05rsmrf8h94j26905e7n6sng8y059z8ykn2j5xcuw4xt8ngt9r',
        ),
        'truncated bech32m -> reject',
      );
      assert.ok(
        !w.isAddressValid(
          'ark1qqellv77udfmr20tun8dvju5vgudpf9vxe8jwhthrkn26fz96pawqfdy8nk05rsmrf8h94j26905e7n6sng8y059z8ykn2j5xcuw4xt8ngt9',
        ),
      );
      assert.ok(!w.isAddressValid('ark1sfhshhehehwer'), 'gibberish ark1 -> reject');
      assert.ok(!w.isAddressValid('test'), 'plain text -> reject');
      assert.ok(!w.isAddressValid('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'), 'bech32 BTC address -> reject');
      assert.ok(!w.isAddressValid(''), 'empty -> reject');
    });
  });

  describe('decodeInvoice', () => {
    const w = new LightningArkWallet();
    const invoice =
      'lnbc20n1p59n9nkpp58s49flel3cz5u3lrve8qeqzxljxmu0gja06elfcgwrx2e9nq959ssp5z7ytwq0rm6yq8evn2kteduj6a0rs4svn3sfwvg92a29f8l022jjqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdq023mk7gryv9uhxgq9qyyssqy4mv8te3l6mrc7qf4pksh4m4z76jz7s2qrwxd7q2s22ghnanqt33e9p0nahz9fr32g00vn2vhc9rrhpvtr54s40tle25tyyvp59sdpsqty30rp';

    it('extracts amount, description, payment hash, expiry, and routing fields', () => {
      const decoded = w.decodeInvoice(invoice);
      assert.strictEqual(decoded.num_satoshis, 2);
      assert.strictEqual(decoded.num_millisatoshis, 2000);
      assert.strictEqual(decoded.timestamp, 1750701686);
      assert.strictEqual(decoded.expiry, 2592000);
      assert.strictEqual(decoded.description, 'Two days ');
      assert.strictEqual(decoded.payment_hash, '3c2a54ff3f8e054e47e3664e0c8046fc8dbe3d12ebf59fa70870ccac96602d0b');
      assert.strictEqual(decoded.destination, '030936e7a016fb3f5ce53c8db29da2b6dfbf8e068ea058c363e0fd77f444270d8a');
      assert.strictEqual(decoded.fallback_addr, '');
      assert.strictEqual(decoded.description_hash, '');
      assert.strictEqual(decoded.cltv_expiry, '40');
      assert.strictEqual(decoded.route_hints.length, 0);
    });
  });

  describe('isInvoiceExpired', () => {
    const w = new LightningArkWallet();
    // Real BOLT11 with timestamp 1761137387, expiry 86400 (1 day) → expired now.
    const invoice =
      'lnbc6670n1p5jp0p9pp5jmyumdwfejjxzwhxh7wnckeugcwcpkqtf5t6dh2fzykjjh4hkatqdq6235x2grhdaexggrs09exzmtfvscqz3txqyyzzssp5ae74xvmlk5q6vxsxe3sqm90w2x4x0ekejt7qp9ca5zzhu83ru8hq9qxpqysgql4dexpmwacw98va6v6smww69a3w6hs5ng0573v8skyhlj7lylt8r65jm5zqaa7hzx3vlrs2fr3h0rtqjw7x94xprdwqy6rr9ff5pnxsppnpr5q';

    it('flags an old invoice as expired against the current clock', () => {
      assert.strictEqual(w.isInvoiceExpired(invoice), true);
    });

    it('treats the invoice as fresh if "now" is set to a moment before expiry', () => {
      // 1763752997 < timestamp (1761137387) + expiry (86400 * 30=2592000) wait, this BOLT11
      // actually has expiry=2592000 (30 days). Pinning: 1763752997 falls inside the
      // 30-day window, so the invoice has not expired yet.
      assert.strictEqual(w.isInvoiceExpired(invoice, 1763752997), false);
    });
  });
});

describe('LightningArkWallet — getTransactions mapping', () => {
  let w: LightningArkWallet;
  // Real BOLT11 with timestamp=1761137387, expiry=86400 (1 day) → long expired.
  // Reused by the expiry-filter tests so we can assert on actual decoded
  // expiry behavior instead of relying on decodeInvoice() throwing on
  // placeholder strings.
  const EXPIRED_INVOICE =
    'lnbc6670n1p5jp0p9pp5jmyumdwfejjxzwhxh7wnckeugcwcpkqtf5t6dh2fzykjjh4hkatqdq6235x2grhdaexggrs09exzmtfvscqz3txqyyzzssp5ae74xvmlk5q6vxsxe3sqm90w2x4x0ekejt7qp9ca5zzhu83ru8hq9qxpqysgql4dexpmwacw98va6v6smww69a3w6hs5ng0573v8skyhlj7lylt8r65jm5zqaa7hzx3vlrs2fr3h0rtqjw7x94xprdwqy6rr9ff5pnxsppnpr5q';
  const EXPIRED_INVOICE_TIMESTAMP = 1761137387;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  it('returns an empty list when there is no swap or boarding history', () => {
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('maps a settled submarine swap (transaction.claimed) as a paid_invoice with negative amount', () => {
    const swap = {
      id: 'swap-out',
      type: 'submarine',
      status: 'transaction.claimed',
      createdAt: 1700000000,
      preimage: 'aa'.repeat(32),
      request: { invoice: 'lnbc1234...send', invoiceAmount: 1234 },
      response: { expectedAmount: 1234 },
    } as any;
    (w as any)._swapHistory = [swap];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'paid_invoice');
    assert.strictEqual(txs[0].value, -1234);
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].timestamp, 1700000000);
    assert.strictEqual(txs[0].payment_preimage, 'aa'.repeat(32));
    assert.strictEqual(txs[0].txid, 'swap-swap-out', 'stable id is swap-<id> regardless of status');
  });

  it('maps a settled reverse swap (invoice.settled) as a user_invoice with positive amount', () => {
    const swap = {
      id: 'swap-in',
      type: 'reverse',
      status: 'invoice.settled',
      createdAt: 1700001000,
      preimage: 'bb'.repeat(32),
      request: { invoice: 'lnbc999...receive' },
      response: { invoice: 'lnbc999...receive', onchainAmount: 9999 },
    } as any;
    (w as any)._swapHistory = [swap];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'user_invoice');
    assert.strictEqual(txs[0].value, 9999);
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].txid, 'swap-swap-in');
  });

  it('maps a pending reverse swap (swap.created) as a user_invoice with ispaid=false', () => {
    const swap = {
      id: 'swap-pending',
      type: 'reverse',
      status: 'swap.created',
      createdAt: 1700002000,
      request: { invoice: 'lnbc1u1pjpending', invoiceAmount: 100000 },
      response: { invoice: 'lnbc1u1pjpending', onchainAmount: 100000 },
    } as any;
    (w as any)._swapHistory = [swap];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].ispaid, false);
    assert.strictEqual(txs[0].value, 100000);
    assert.strictEqual(txs[0].type, 'user_invoice');
  });

  it('maps a pending submarine swap (swap.created) as a payment_request with ispaid=false', () => {
    const swap = {
      id: 'sub-pending',
      type: 'submarine',
      status: 'swap.created',
      createdAt: 1700002500,
      request: { invoice: 'lnbc...subpending', invoiceAmount: 50000 },
      response: { expectedAmount: 50000 },
    } as any;
    (w as any)._swapHistory = [swap];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'payment_request', 'submarine pending = LN send pending');
    assert.strictEqual(txs[0].ispaid, false);
    assert.strictEqual(txs[0].value, -50000, 'submarine = negative (outgoing)');
  });

  it('hides submarine invoice.set entries (failed-to-pay attempts) from the visible list', () => {
    (w as any)._swapHistory = [
      {
        id: 'failed',
        type: 'submarine',
        status: 'invoice.set',
        createdAt: 1700003000,
        request: { invoice: 'lnbc...failed', invoiceAmount: 50 },
        response: { expectedAmount: 50 },
      },
    ];

    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('skips chain swaps — no LN-shaped UX surface for them yet', () => {
    (w as any)._swapHistory = [
      {
        id: 'chain1',
        type: 'chain',
        status: 'transaction.claimed',
        createdAt: 1700003500,
        request: {},
        response: { claimDetails: { amount: 1000 }, lockupDetails: { amount: 1000 } },
        amount: 1000,
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('preserves failed reverse swaps with a Failed: memo prefix and ispaid=false', () => {
    // Use a real, long-expired BOLT11 so the expiry filter would fire on
    // an unguarded path. Fix 2: terminal failed/refunded rows must survive
    // even when their underlying invoice is past expiry — they carry
    // diagnostic value beyond the BOLT11 lifetime.
    (w as any)._swapHistory = [
      {
        id: 'rev-failed',
        type: 'reverse',
        status: 'transaction.failed',
        createdAt: EXPIRED_INVOICE_TIMESTAMP,
        request: { invoice: EXPIRED_INVOICE, invoiceAmount: 667 },
        response: { invoice: EXPIRED_INVOICE, onchainAmount: 667 },
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'failed reverse with expired BOLT11 must stay visible');
    assert.strictEqual(txs[0].ispaid, false);
    assert.ok(txs[0].memo!.startsWith('Failed: '), 'failed reverse keeps a Failed: prefix');
    assert.strictEqual(txs[0].txid, 'swap-rev-failed');
  });

  it('preserves refunded submarine swaps with a Refunded: memo prefix', () => {
    (w as any)._swapHistory = [
      {
        id: 'sub-refunded',
        type: 'submarine',
        status: 'transaction.refunded',
        createdAt: EXPIRED_INVOICE_TIMESTAMP,
        request: { invoice: EXPIRED_INVOICE, invoiceAmount: 667 },
        response: { invoice: EXPIRED_INVOICE, expectedAmount: 667 },
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'refunded submarine with expired BOLT11 must stay visible');
    assert.strictEqual(txs[0].ispaid, false);
    assert.strictEqual(txs[0].type, 'payment_request');
    assert.ok(txs[0].memo!.startsWith('Refunded: '));
  });

  it('preserves submarine swap.expired with a Failed: prefix (lockup is refundable)', () => {
    // Fix 3: SDK classifies submarine swap.expired as a refundable failure
    // — the user's lockup is on-chain and they need the row to recover
    // funds. Dropping it (as the previous code did) hid that recovery
    // surface entirely.
    (w as any)._swapHistory = [
      {
        id: 'sub-expired',
        type: 'submarine',
        status: 'swap.expired',
        createdAt: 1700004600,
        request: { invoice: 'lnbc...subexp', invoiceAmount: 400 },
        response: { expectedAmount: 400 },
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'swap.expired submarine must stay visible');
    assert.strictEqual(txs[0].ispaid, false);
    assert.strictEqual(txs[0].type, 'payment_request');
    assert.ok(txs[0].memo!.startsWith('Failed: '));
    assert.strictEqual(txs[0].txid, 'swap-sub-expired');
  });

  it('still drops submarine invoice.set rows (no funds at risk yet)', () => {
    (w as any)._swapHistory = [
      {
        id: 'sub-noopen',
        type: 'submarine',
        status: 'invoice.set',
        createdAt: 1700004700,
        request: { invoice: 'lnbc...invset', invoiceAmount: 100 },
        response: { expectedAmount: 100 },
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('maps a pending boarding UTXO as a "Pending refill" bitcoind_tx row', () => {
    (w as any)._boardingUtxos = [{ txid: 'boardtx', vout: 0, value: 50000, status: { block_time: 1700005000 } }];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'bitcoind_tx');
    assert.strictEqual(txs[0].description, 'Pending refill');
    assert.strictEqual(txs[0].value, 50000);
    assert.strictEqual(txs[0].timestamp, 1700005000);
    assert.strictEqual(txs[0].txid, 'boarding-utxo-boardtx:0');
  });

  it('falls back to "now" when the boarding UTXO has no block_time yet', () => {
    (w as any)._boardingUtxos = [{ txid: 'pendingboard', vout: 1, value: 100, status: {} }];
    const before = Math.floor(Date.now() / 1000);
    const tx = w.getTransactions()[0];
    const after = Math.floor(Date.now() / 1000);
    assert.ok(tx.timestamp! >= before && tx.timestamp! <= after, 'timestamp falls within now ± 1s');
  });

  it('maps a settled boarding history record as a "Refill" bitcoind_tx row', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'abc', commitmentTxid: '', arkTxid: '' },
        type: 'RECEIVED',
        settled: true,
        amount: 100000,
        createdAt: 1700006000_000, // SDK uses ms; mapper divides by 1000
      },
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].description, 'Refill');
    assert.strictEqual(txs[0].value, 100000);
    assert.strictEqual(txs[0].timestamp, 1700006000);
    assert.strictEqual(txs[0].txid, 'boarding-abc');
  });

  it('skips unsettled boarding history records (only completed refills surface)', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'pending', commitmentTxid: '', arkTxid: '' },
        type: 'RECEIVED',
        settled: false,
        amount: 5000,
        createdAt: 1700007000_000,
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('skips non-RECEIVED boarding history records (e.g. SENT, FORFEITED)', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'sent', commitmentTxid: '', arkTxid: '' },
        type: 'SENT',
        settled: true,
        amount: 5000,
        createdAt: 1700007000_000,
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('maps a native Ark RECEIVED entry (no boardingTxid) as a positive bitcoind_tx row', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'arkrx1' },
        type: 'RECEIVED',
        settled: true,
        amount: 7777,
        createdAt: 1700008000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'bitcoind_tx');
    assert.strictEqual(txs[0].description, 'Received');
    assert.strictEqual(txs[0].value, 7777);
    assert.strictEqual(txs[0].timestamp, 1700008000);
    assert.strictEqual(txs[0].txid, 'ark-arkrx1');
  });

  it('maps a native Ark SENT entry (no boardingTxid) as a negative bitcoind_tx row', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'arktx2' },
        type: 'SENT',
        settled: true,
        amount: 4321, // SDK reports magnitude; mapper signs from `type`
        createdAt: 1700009000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].description, 'Sent');
    assert.strictEqual(txs[0].value, -4321);
    assert.strictEqual(txs[0].timestamp, 1700009000);
    assert.strictEqual(txs[0].txid, 'ark-arktx2');
  });

  it('falls back to commitmentTxid when arkTxid is missing', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: 'commit-only', arkTxid: '' },
        type: 'RECEIVED',
        settled: true,
        amount: 100,
        createdAt: 1700009500_000,
      },
    ];
    assert.strictEqual(w.getTransactions()[0].txid, 'ark-commit-only');
  });

  it('dedupes the Ark-history leg of a swap whose Lightning row we already render', () => {
    // A reverse swap that settled — Boltz claimed 1000 sat into our wallet.
    // The SDK history will also contain the matching RECEIVED entry; we must
    // not show it as a second native-Ark row (Invariant 12).
    (w as any)._swapHistory = [
      {
        id: 'rev1',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700010000,
        preimage: 'ee'.repeat(32),
        request: { invoice: 'lnbc...rev1' },
        response: { invoice: 'lnbc...rev1', onchainAmount: 1000 },
      },
    ];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'rev1-arkleg' },
        type: 'RECEIVED',
        settled: true,
        amount: 1000,
        createdAt: 1700010120_000, // 2 min after swap.createdAt → inside dedup window
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'one row, not two');
    assert.strictEqual(txs[0].txid, 'swap-rev1');
  });

  it('does not dedupe a native Ark transfer against a pending reverse swap', () => {
    // Fix 1: pending swaps don't yet have an Ark-side leg in
    // _transactionsHistory, so recording a fingerprint for them would hide
    // unrelated same-amount native transfers in the ±30-min window.
    (w as any)._swapHistory = [
      {
        id: 'rev-pending-coalesce',
        type: 'reverse',
        status: 'swap.created',
        createdAt: 1700020000,
        request: { invoice: 'lnbc1u1pjpend' },
        response: { invoice: 'lnbc1u1pjpend', onchainAmount: 5000 },
      },
    ];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'unrelated-rx' },
        type: 'RECEIVED',
        settled: true,
        amount: 5000,
        createdAt: 1700020120_000, // inside the ±30-min dedup window
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 2, 'pending swaps must not fingerprint native Ark history');
    assert.ok(txs.some(t => t.txid === 'swap-rev-pending-coalesce'));
    assert.ok(txs.some(t => t.txid === 'ark-unrelated-rx'));
  });

  it('does not dedupe a native Ark transfer against a failed reverse swap', () => {
    // Fix 1: a failed reverse swap leaves no Ark-side leg (Boltz never
    // claimed). A coincident same-amount native RECEIVED in the window
    // must remain visible.
    (w as any)._swapHistory = [
      {
        id: 'rev-failed-coalesce',
        type: 'reverse',
        status: 'transaction.failed',
        createdAt: 1700021000,
        request: { invoice: 'lnbc...revfail2' },
        response: { invoice: 'lnbc...revfail2', onchainAmount: 4321 },
      },
    ];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'real-rx' },
        type: 'RECEIVED',
        settled: true,
        amount: 4321,
        createdAt: 1700021000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 2, 'failed swaps must not fingerprint native Ark history');
    assert.ok(txs.some(t => t.txid === 'ark-real-rx'));
  });

  it('keeps the native-Ark row when its amount or direction differs from any swap', () => {
    (w as any)._swapHistory = [
      {
        id: 'rev2',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700011000,
        preimage: 'ff'.repeat(32),
        request: { invoice: 'lnbc...rev2' },
        response: { invoice: 'lnbc...rev2', onchainAmount: 1000 },
      },
    ];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'native' },
        type: 'RECEIVED',
        settled: true,
        amount: 2222, // different amount → not a dedup match
        createdAt: 1700011000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 2);
    assert.ok(txs.some(t => t.txid === 'swap-rev2'));
    assert.ok(txs.some(t => t.txid === 'ark-native'));
  });

  it('hides expired unpaid reverse-swap invoices when expiry was decoded', () => {
    (w as any)._swapHistory = [
      {
        id: 'rev-expired',
        type: 'reverse',
        status: 'swap.created',
        createdAt: EXPIRED_INVOICE_TIMESTAMP,
        request: { invoice: EXPIRED_INVOICE },
        response: { invoice: EXPIRED_INVOICE, onchainAmount: 667 },
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), [], 'expired unpaid pending reverse invoice is hidden');
  });

  it('keeps submarine pending rows visible even when their BOLT11 has aged out', () => {
    // Fix 4: by invoice.pending the user's lockup is on-chain. The
    // expiry-filter applies to reverse only — submarine pending rows must
    // stay visible until the swap transitions to swap.expired /
    // transaction.refunded so users don't lose visibility into recoverable
    // locked funds.
    (w as any)._swapHistory = [
      {
        id: 'sub-stalled',
        type: 'submarine',
        status: 'invoice.pending',
        createdAt: EXPIRED_INVOICE_TIMESTAMP,
        request: { invoice: EXPIRED_INVOICE, invoiceAmount: 667 },
        response: { expectedAmount: 667 },
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'submarine pending with expired BOLT11 must stay visible');
    assert.strictEqual(txs[0].ispaid, false);
    assert.strictEqual(txs[0].type, 'payment_request');
    assert.strictEqual(txs[0].txid, 'swap-sub-stalled');
  });

  it('returns mixed swap + boarding rows in a single list', () => {
    (w as any)._swapHistory = [
      {
        id: 'paid',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700000000,
        preimage: 'cc'.repeat(32),
        request: { invoice: 'lnbc...paid' },
        response: { invoice: 'lnbc...paid', onchainAmount: 1000 },
      },
    ];
    (w as any)._boardingUtxos = [{ txid: 'mixboard', vout: 0, value: 2000, status: { block_time: 1700001000 } }];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'refilled', commitmentTxid: '', arkTxid: '' },
        type: 'RECEIVED',
        settled: true,
        amount: 3000,
        createdAt: 1700002000_000,
      },
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 3);
    assert.strictEqual(txs[0].type, 'user_invoice');
    assert.strictEqual(txs[1].description, 'Pending refill');
    assert.strictEqual(txs[2].description, 'Refill');
  });
});

describe('LightningArkWallet — Realm schema integration', () => {
  it('combines Ark + Boltz schemas into a single open() schema list', () => {
    // Phase 2 task 4 / Phase 3 task 3: opening a per-wallet Realm against
    // [...ArkRealmSchemas, ...BoltzRealmSchemas] is the integration that lets
    // the SDK and Boltz repositories share one encrypted file. Pin both
    // halves so a partial drop doesn't silently lose one repository's data.
    const arkNames = ArkRealmSchemas.map((s: any) => s.name);
    const boltzNames = BoltzRealmSchemas.map((s: any) => s.name);

    assert.ok(arkNames.includes('ArkVtxo'), 'Ark schema list missing ArkVtxo');
    assert.ok(arkNames.includes('ArkUtxo'), 'Ark schema list missing ArkUtxo');
    assert.ok(arkNames.includes('ArkContract'), 'Ark schema list missing ArkContract');
    assert.ok(arkNames.includes('ArkWalletState'), 'Ark schema list missing ArkWalletState');
    assert.ok(arkNames.includes('ArkTransaction'), 'Ark schema list missing ArkTransaction');
    assert.ok(boltzNames.includes('BoltzSwap'), 'Boltz schema list missing BoltzSwap');

    assert.strictEqual(typeof ARK_REALM_SCHEMA_VERSION, 'number');
    assert.ok(ARK_REALM_SCHEMA_VERSION >= 1, 'schemaVersion must be a positive integer');

    // Sanity: the two schema lists must not conflict on object name. If the
    // SDK adds an Ark-side schema with a name that collides with a Boltz one
    // (or vice versa), Realm.open will throw and re-import will fail silently
    // for affected users. Catch that at test time instead.
    const overlap = arkNames.filter((n: string) => boltzNames.includes(n));
    assert.deepStrictEqual(overlap, [], `schema name collision: ${overlap.join(', ')}`);
  });
});

describe('LightningArkWallet — runtime SDK fields are non-enumerable', () => {
  it('saveToDisk-style Object.assign({}, wallet) skips _wallet and _arkadeSwaps', () => {
    // Phase 2 task 8 invariant. The constructor installs both fields as
    // non-enumerable so saveToDisk can't try to serialise a half-built SDK
    // graph through JSON.stringify, and the wallet stays initialised across
    // saves (no nuke-and-rebuild churn that the Phase 1 path triggered).
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._wallet = { fake: 'wallet' };
    (w as any)._arkadeSwaps = { fake: 'swaps' };

    const cloned = Object.assign({}, w) as unknown as Record<string, unknown>;
    assert.ok(!('_wallet' in cloned), '_wallet must not be enumerable');
    assert.ok(!('_arkadeSwaps' in cloned), '_arkadeSwaps must not be enumerable');

    // The values are still present on the instance itself.
    assert.deepStrictEqual((w as any)._wallet, { fake: 'wallet' });
    assert.deepStrictEqual((w as any)._arkadeSwaps, { fake: 'swaps' });
  });

  it('getNamespace requires a secret', () => {
    const w = new LightningArkWallet();
    assert.throws(() => w.getNamespace(), /No secret provided/);
  });

  it('exposes module-private caches via __testing__ for tests only', () => {
    // Phase 2 added these for the deletion-vs-init race test. Pin the shape
    // so a future refactor doesn't silently drop the test surface.
    assert.ok('staticWalletCache' in walletTesting);
    assert.ok('staticSwapsCache' in walletTesting);
    assert.ok('initInFlight' in walletTesting);
    assert.ok('boardingLock' in walletTesting);
  });
});

describe('LightningArkWallet — generate', () => {
  it('refuses init without a secret', async () => {
    const w = new LightningArkWallet();
    await assert.rejects(() => (w as any).getArkAddress(), /No secret provided/);
  });

  it('isInvoiceGeneratedByWallet matches a known incoming swap by payment_request', () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._swapHistory = [
      {
        id: 'mine',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700000000,
        preimage: 'dd'.repeat(32),
        request: { invoice: 'lnbc100u1p50528cpp5...mine' },
        response: { invoice: 'lnbc100u1p50528cpp5...mine', onchainAmount: 100 },
      },
    ];
    assert.ok(w.isInvoiceGeneratedByWallet('lnbc100u1p50528cpp5...mine'));
    assert.ok(!w.isInvoiceGeneratedByWallet('lnbc999u1psomeoneelse'));
  });
});

describe('LightningArkWallet — addInvoice + payInvoice (mocked SDK runtime)', () => {
  // These tests bypass init() (which would auto-start VtxoManager polling and
  // ContractWatcher subscriptions) by injecting the runtime SDK objects
  // directly. We exercise the wallet's wiring — fee math, BOLT11 vs Ark
  // address routing, parameter forwarding — not the SDK's network behavior.
  let w: LightningArkWallet;
  const fakeWallet: { sendBitcoin: jest.Mock } = { sendBitcoin: jest.fn() };
  const fakeArkadeSwaps: {
    createLightningInvoice: jest.Mock;
    sendLightningPayment: jest.Mock;
  } = {
    createLightningInvoice: jest.fn(),
    sendLightningPayment: jest.fn(),
  };

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    fakeWallet.sendBitcoin.mockReset().mockResolvedValue(undefined);
    fakeArkadeSwaps.createLightningInvoice.mockReset();
    fakeArkadeSwaps.sendLightningPayment.mockReset();
    // Wire the wallet up as if init() had already completed.
    (w as any)._wallet = fakeWallet;
    (w as any)._arkadeSwaps = fakeArkadeSwaps;
    // Phase 1's _fetchLightningFeesAndLimits seeds these from Boltz; bypass
    // by setting them directly so the assertion guards inside addInvoice /
    // payInvoice pass.
    (w as any)._limitMin = 100;
    (w as any)._limitMax = 1_000_000;
    (w as any)._feePercentage = 0;
  });

  it('addInvoice returns the BOLT11 string from ArkadeSwaps.createLightningInvoice', async () => {
    fakeArkadeSwaps.createLightningInvoice.mockResolvedValue({
      invoice: 'lnbc1234u1pjabcdef',
      paymentHash: 'cafebabe',
      expiry: 3600,
      pendingSwap: {},
      preimage: undefined,
    });

    const out = await w.addInvoice(50_000, 'coffee');

    assert.strictEqual(out, 'lnbc1234u1pjabcdef');
    assert.strictEqual(fakeArkadeSwaps.createLightningInvoice.mock.calls.length, 1);
    const call = fakeArkadeSwaps.createLightningInvoice.mock.calls[0][0];
    assert.strictEqual(call.amount, 50_000); // _feePercentage=0 → no surcharge
    assert.strictEqual(call.description, 'coffee');
  });

  it('addInvoice adds the Boltz reverse-fee surcharge to the amount it asks for', async () => {
    (w as any)._feePercentage = 0.5; // 0.5% reverse fee
    fakeArkadeSwaps.createLightningInvoice.mockResolvedValue({ invoice: 'lnbc...', paymentHash: '', expiry: 3600 });

    await w.addInvoice(10_000, 'fees');

    const call = fakeArkadeSwaps.createLightningInvoice.mock.calls[0][0];
    // 10_000 * 0.5 / 100 = 50 sat surcharge → request 10_050
    assert.strictEqual(call.amount, 10_050);
  });

  it('addInvoice rejects amounts at or below the Boltz minimum', async () => {
    (w as any)._limitMin = 1000;
    await assert.rejects(() => w.addInvoice(1000, 'too small'), /Minimum to receive/);
    await assert.rejects(() => w.addInvoice(500, 'too small'), /Minimum to receive/);
  });

  it('addInvoice rejects amounts at or above the Boltz maximum', async () => {
    (w as any)._limitMax = 1_000_000;
    await assert.rejects(() => w.addInvoice(1_000_000, 'too big'), /Maximum to receive/);
    await assert.rejects(() => w.addInvoice(2_000_000, 'too big'), /Maximum to receive/);
  });

  it('payInvoice routes a BOLT11 invoice through ArkadeSwaps.sendLightningPayment', async () => {
    // Real BOLT11 with amount = 0.0001 BTC (10000 sat) so it passes the limits assertion.
    const invoice =
      'lnbc100u1p50528cpp5rhy4fgs0ff23asecxtxt9zvc3apn0p8h7fxsj0d5k7j3x92zwhlqdq5w3jhxapqd9h8vmmfvdjscqrp80xqyf8ucsp5vcsrzye432n9wh0zwuv5z8y5n9zvkwpctr685e80utzc2yueccms9qxpqysgqd87swq3hput9k6llp0wxg098hc7ge3e5nrtnvak6zreywzaf4k9s8d3u4hrmt3m22kf0jt7ruqj0caknk5ykzdenjdphz50t7xrstnqqn6aw0m';
    fakeArkadeSwaps.sendLightningPayment.mockResolvedValue({ amount: 10_000, preimage: 'pre', txid: 'tx' });

    await w.payInvoice(invoice);

    assert.strictEqual(fakeArkadeSwaps.sendLightningPayment.mock.calls.length, 1);
    assert.strictEqual(fakeArkadeSwaps.sendLightningPayment.mock.calls[0][0].invoice, invoice);
    assert.strictEqual(fakeWallet.sendBitcoin.mock.calls.length, 0, 'Ark sendBitcoin must not run for BOLT11');
  });

  it('payInvoice routes a valid Ark address through Wallet.sendBitcoin', async () => {
    const arkAddress =
      'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t5z8sz5n95k570z5r004szc9h2q3qprkzdd5zveujdpx24srcrqg8hf6j4v';

    await w.payInvoice(arkAddress, 12_345);

    assert.strictEqual(fakeWallet.sendBitcoin.mock.calls.length, 1);
    assert.deepStrictEqual(fakeWallet.sendBitcoin.mock.calls[0][0], {
      address: arkAddress,
      amount: 12_345,
    });
    assert.strictEqual(
      fakeArkadeSwaps.sendLightningPayment.mock.calls.length,
      0,
      'Lightning swap must not run for native Ark transfers',
    );
  });
});
