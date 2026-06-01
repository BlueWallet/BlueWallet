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

  it('enriches the native SENT leg of a settled submarine swap (no separate swap row)', () => {
    // A settled submarine (Lightning send) leaves a native SENT leg in the SDK
    // history. The swap enriches that leg in place — it does NOT emit a parallel
    // `swap-` row, so the send shows exactly once.
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
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'sub-leg' },
        type: 'SENT',
        settled: true,
        amount: 1234,
        createdAt: 1700000000_000,
      },
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'settled swap enriches its leg; no parallel swap row');
    assert.strictEqual(txs[0].txid, 'ark-sub-leg', 'the row is the native leg, not a swap- row');
    assert.strictEqual(txs[0].value, -1234);
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].timestamp, 1700000000);
    assert.strictEqual(txs[0].payment_preimage, 'aa'.repeat(32));
    // The enriched leg carries the swap's invoice payload. TransactionListItem
    // routes a row that has `payment_request` to LNDViewInvoice (the Lightning
    // detail), not the on-chain TransactionStatus, despite its 'bitcoind_tx' type.
    assert.strictEqual(txs[0].payment_request, 'lnbc1234...send');
  });

  it('enriches the native RECEIVED leg of a settled reverse swap (no separate swap row)', () => {
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
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'rev-leg' },
        type: 'RECEIVED',
        settled: true,
        amount: 9999,
        createdAt: 1700001000_000,
      },
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].txid, 'ark-rev-leg');
    assert.strictEqual(txs[0].value, 9999);
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].payment_preimage, 'bb'.repeat(32));
    assert.strictEqual(txs[0].payment_request, 'lnbc999...receive');
  });

  it('relabels the SDK default reverse-swap description as "Received via Arkade"', () => {
    const w2 = new LightningArkWallet();
    // The SDK stamps reverse-swap invoices with this default placeholder.
    (w2 as any).decodeInvoice = () => ({
      num_satoshis: 500,
      description: 'Send to Arkade address',
      payment_hash: 'ph',
      expiry: 3600,
    });
    (w2 as any)._swapHistory = [
      {
        id: 'rev-default',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700001000,
        request: { invoice: 'lnbc500...receive' },
        response: { invoice: 'lnbc500...receive', onchainAmount: 500 },
      },
    ];
    (w2 as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'rev-default-leg' },
        type: 'RECEIVED',
        settled: true,
        amount: 500,
        createdAt: 1700001000_000,
      },
    ];

    const txs = w2.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].memo, 'Received via Arkade');
    assert.strictEqual(txs[0].description, 'Received via Arkade');
  });

  it('preserves a user-supplied reverse-swap description instead of relabeling it', () => {
    const w2 = new LightningArkWallet();
    (w2 as any).decodeInvoice = () => ({
      num_satoshis: 500,
      description: 'coffee money',
      payment_hash: 'ph',
      expiry: 3600,
    });
    (w2 as any)._swapHistory = [
      {
        id: 'rev-custom',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700001000,
        request: { invoice: 'lnbc500...receive' },
        response: { invoice: 'lnbc500...receive', onchainAmount: 500 },
      },
    ];
    (w2 as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'rev-custom-leg' },
        type: 'RECEIVED',
        settled: true,
        amount: 500,
        createdAt: 1700001000_000,
      },
    ];

    const txs = w2.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].memo, 'coffee money');
  });

  it('hides a created-but-unpaid reverse swap (swap.created) — an open invoice is not "pending"', () => {
    // A reverse swap in swap.created is an invoice the user generated that
    // nobody has paid yet. It is not a pending receive (no funds in flight),
    // so it must not appear in history nor pin the wallet card to "Pending".
    const swap = {
      id: 'swap-unpaid',
      type: 'reverse',
      status: 'swap.created',
      createdAt: 1700002000,
      request: { invoice: 'lnbc1u1pjpending', invoiceAmount: 100000 },
      response: { invoice: 'lnbc1u1pjpending', onchainAmount: 100000 },
    } as any;
    (w as any)._swapHistory = [swap];

    assert.deepStrictEqual(w.getTransactions(), [], 'an unpaid open invoice is not surfaced');
  });

  it.each(['transaction.mempool', 'transaction.confirmed'])(
    'maps an in-flight reverse swap (%s) as a pending user_invoice with ispaid=false',
    status => {
      // The payer has paid; Boltz has locked funds on-chain and the claim is
      // imminent (isReverseClaimableStatus). This is a genuine pending receive.
      const swap = {
        id: 'swap-inflight',
        type: 'reverse',
        status,
        createdAt: 1700002000,
        request: { invoice: 'lnbc1u1pjpending', invoiceAmount: 100000 },
        response: { invoice: 'lnbc1u1pjpending', onchainAmount: 100000 },
      } as any;
      (w as any)._swapHistory = [swap];

      const txs = w.getTransactions();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].ispaid, false);
      assert.ok(!txs[0].failed, 'an in-flight row must not be flagged failed');
      assert.strictEqual(txs[0].value, 100000);
      assert.strictEqual(txs[0].type, 'user_invoice');
    },
  );

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
    assert.ok(!txs[0].failed, 'an in-flight row must not be flagged failed');
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
    assert.strictEqual(txs[0].failed, true, 'terminal failed row is flagged so the pending pill ignores it');
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
    assert.strictEqual(txs[0].failed, true, 'refunded row is flagged terminal');
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

  it('flags only terminal rows as failed, so the pending-pill predicate ignores dead swaps', () => {
    // Mirrors the wallet-card predicate in WalletsCarousel: a row counts as
    // pending iff `ispaid === false && !failed`. A history of only
    // failed/refunded swaps must therefore report nothing pending.
    (w as any)._swapHistory = [
      {
        id: 'rev-failed',
        type: 'reverse',
        status: 'transaction.failed',
        createdAt: 1700006000,
        request: { invoice: 'lnbc...revfail', invoiceAmount: 1000 },
        response: { invoice: 'lnbc...revfail', onchainAmount: 1000 },
      },
      {
        id: 'sub-refunded',
        type: 'submarine',
        status: 'transaction.refunded',
        createdAt: 1700006100,
        request: { invoice: 'lnbc...subref', invoiceAmount: 2000 },
        response: { expectedAmount: 2000 },
      },
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 2, 'terminal rows stay visible for diagnostics');
    assert.ok(
      !txs.some((tx: any) => tx.ispaid === false && !tx.failed),
      'a wallet whose only swaps are failed/refunded must report nothing pending',
    );

    // Adding one genuinely in-flight swap (funds locked on-chain, claim
    // imminent) flips the predicate back to pending. swap.created would NOT —
    // an unpaid open invoice is not pending and is dropped from history.
    (w as any)._swapHistory.push({
      id: 'rev-pending',
      type: 'reverse',
      status: 'transaction.mempool',
      createdAt: 1700006200,
      request: { invoice: 'lnbc...revpending', invoiceAmount: 3000 },
      response: { invoice: 'lnbc...revpending', onchainAmount: 3000 },
    });
    assert.ok(
      w.getTransactions().some((tx: any) => tx.ispaid === false && !tx.failed),
      'an in-flight swap must register as pending',
    );
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
    // No invoice payload → TransactionListItem keeps refills on the on-chain
    // TransactionStatus detail (the counterpart to the enrichment assertions above).
    assert.strictEqual(txs[0].payment_request, undefined);
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
    assert.strictEqual(txs[0].payment_request, undefined);
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

  it('does not list a refill as both settled "Refill" and "Pending refill" when the feeds overlap', () => {
    // During the settlement transition the boarding UTXO can still be in
    // getBoardingUtxos() for a beat after the settled history entry appears.
    // The settled "Refill" (pass 1) must win; the pending row for the same
    // boarding txid is suppressed so the refill is never double-listed.
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'dup', commitmentTxid: '', arkTxid: '' },
        type: 'RECEIVED',
        settled: true,
        amount: 100000,
        createdAt: 1700009000_000,
      },
    ];
    (w as any)._boardingUtxos = [{ txid: 'dup', vout: 0, value: 100000, status: { block_time: 1700009000 } }];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'only the settled refill row survives');
    assert.strictEqual(txs[0].txid, 'boarding-dup');
    assert.strictEqual(txs[0].description, 'Refill');
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

  it('enriches the Ark-history leg of a settled swap in place (one row, not two)', () => {
    // A reverse swap that settled — Boltz claimed 1000 sat into our wallet.
    // The SDK history also contains the matching RECEIVED entry; the swap must
    // enrich that single native row, not add a second `swap-` row beside it.
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
        createdAt: 1700010120_000, // 2 min after swap.createdAt → inside match window
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'one row, not two');
    assert.strictEqual(txs[0].txid, 'ark-rev1-arkleg', 'the native leg is enriched, not a swap- row');
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].payment_preimage, 'ee'.repeat(32));
  });

  it('does not dedupe a native Ark transfer against a pending reverse swap', () => {
    // Fix 1: pending swaps don't yet have an Ark-side leg in
    // _transactionsHistory, so recording a fingerprint for them would hide
    // unrelated same-amount native transfers in the ±30-min window.
    (w as any)._swapHistory = [
      {
        id: 'rev-pending-coalesce',
        type: 'reverse',
        // In-flight (claimable) so the row stays visible; it is still unsettled,
        // so no dedup fingerprint is recorded for it.
        status: 'transaction.mempool',
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

  it('drops an unmatched settled swap and keeps the unrelated native row unenriched', () => {
    // The settled swap's on-chain amount (1000) matches no native leg (2222), so
    // it enriches nothing and emits no row — a settlement is represented by its
    // leg, never by a parallel `swap-` row. The unrelated 2222 native row stays,
    // unenriched. (In production a settled swap's leg is present; a mismatch this
    // total only happens with corrupt/synthetic data.)
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
        amount: 2222, // different amount → not a match
        createdAt: 1700011000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'no swap- row for an unmatched settled swap');
    assert.strictEqual(txs[0].txid, 'ark-native');
    assert.ok(!txs[0].ispaid, 'the unrelated native row is not enriched');
  });

  it.each(['invoice.expired', 'swap.expired'])('hides unpaid-and-dead reverse-swap invoices (%s)', status => {
    // Unpaid reverse swaps with no payment in flight are dropped regardless of
    // the BOLT11 expiry clock — the SDK status alone (not isReverseClaimableStatus)
    // tells us no funds are locked on-chain, so there is nothing to surface.
    (w as any)._swapHistory = [
      {
        id: 'rev-dead',
        type: 'reverse',
        status,
        createdAt: EXPIRED_INVOICE_TIMESTAMP,
        request: { invoice: EXPIRED_INVOICE },
        response: { invoice: EXPIRED_INVOICE, onchainAmount: 667 },
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), [], 'unpaid reverse invoice with no funds in flight is hidden');
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

  it('returns mixed (enriched swap leg + boarding) rows in a single list', () => {
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
      // The settled reverse swap's native RECEIVED leg (enriched in place)…
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'paid-leg' },
        type: 'RECEIVED',
        settled: true,
        amount: 1000,
        createdAt: 1700000000_000,
      },
      // …and a separate completed refill.
      {
        key: { boardingTxid: 'refilled', commitmentTxid: '', arkTxid: '' },
        type: 'RECEIVED',
        settled: true,
        amount: 3000,
        createdAt: 1700002000_000,
      },
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 3, 'enriched LN leg + pending refill + settled refill');
    const byId = Object.fromEntries(txs.map((t: any) => [t.txid, t]));
    assert.ok(byId['ark-paid-leg']?.ispaid, 'the settled swap enriched its native leg');
    assert.strictEqual(byId['boarding-utxo-mixboard:0']?.description, 'Pending refill');
    assert.strictEqual(byId['boarding-refilled']?.description, 'Refill');
  });

  it('does not duplicate a refill as a Lightning row when a same-amount settled swap exists', () => {
    // Regression for the reported bug: one on-chain refill showed twice — once
    // as "Refill" and once as a phantom "Lightning" row of the same amount. A
    // real refill is a boarding entry (it produces no native leg), so a settled
    // swap that matches no native leg must NOT emit a `swap-` row. The refill
    // shows exactly once.
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'refill-tx', commitmentTxid: '', arkTxid: '' },
        type: 'RECEIVED',
        settled: true,
        amount: 84960,
        createdAt: 1700000000_000,
      },
    ];
    (w as any)._swapHistory = [
      {
        id: 'phantom',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700000000,
        preimage: 'dd'.repeat(32),
        request: { invoice: 'lnbc...phantom' },
        response: { invoice: 'lnbc...phantom', onchainAmount: 84960 },
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'exactly one row for the refill — no phantom Lightning');
    assert.strictEqual(txs[0].txid, 'boarding-refill-tx');
    assert.strictEqual(txs[0].description, 'Refill');
  });

  it('matches each settled swap to a distinct native leg (consume-once)', () => {
    (w as any)._swapHistory = [
      {
        id: 'a',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700000000,
        preimage: '11'.repeat(32),
        request: { invoice: 'lnbc...a' },
        response: { invoice: 'lnbc...a', onchainAmount: 1000 },
      },
      {
        id: 'b',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: 1700000000,
        preimage: '22'.repeat(32),
        request: { invoice: 'lnbc...b' },
        response: { invoice: 'lnbc...b', onchainAmount: 1000 },
      },
    ];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'leg1' },
        type: 'RECEIVED',
        settled: true,
        amount: 1000,
        createdAt: 1700000000_000,
      },
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'leg2' },
        type: 'RECEIVED',
        settled: true,
        amount: 1000,
        createdAt: 1700000000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 2, 'two legs, two enriched rows — neither swap double-claims a leg');
    assert.ok(
      txs.every((t: any) => t.ispaid),
      'both legs enriched',
    );
    assert.deepStrictEqual(txs.map((t: any) => t.txid).sort(), ['ark-leg1', 'ark-leg2']);
  });

  it('exposes open unpaid invoices only when includeUnpaidInvoices is set (registry path)', () => {
    (w as any)._swapHistory = [
      {
        id: 'open',
        type: 'reverse',
        status: 'swap.created',
        createdAt: 1700000000,
        request: { invoice: 'lnbc...open', invoiceAmount: 100000 },
        response: { invoice: 'lnbc...open', onchainAmount: 100000 },
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), [], 'hidden from the history list');
    const reg = w.getTransactions(true);
    assert.strictEqual(reg.length, 1, 'visible to getUserInvoices/isInvoiceGeneratedByWallet');
    assert.strictEqual(reg[0].txid, 'swap-open');
  });

  it('shows native legs as-is on a restored wallet with empty swap history', () => {
    // After restore, _swapHistory is empty; native legs must still appear (the
    // display layer labels them Lightning), not vanish.
    (w as any)._swapHistory = [];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'restored-rx' },
        type: 'RECEIVED',
        settled: true,
        amount: 5000,
        createdAt: 1700000000_000,
      },
    ];
    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].txid, 'ark-restored-rx');
    assert.ok(!txs[0].ispaid, 'no swap to enrich it; shown as a plain native leg');
  });
});

describe('LightningArkWallet — Realm schema integration', () => {
  it('combines Ark + Boltz schemas into a single open() schema list', () => {
    // Opening a per-wallet Realm against [...ArkRealmSchemas, ...BoltzRealmSchemas]
    // is the integration that lets the SDK and Boltz repositories share one
    // encrypted file. Pin both halves so a partial drop doesn't silently lose
    // one repository's data.
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
    // The constructor installs both runtime SDK fields as non-enumerable so
    // saveToDisk can't try to serialise a half-built SDK graph through
    // JSON.stringify, and the wallet stays initialised across saves.
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._wallet = { fake: 'wallet' };
    (w as any)._arkadeSwaps = { fake: 'swaps' };
    // A session that already warmed fees: the flag must NOT be persisted, or a
    // restored wallet would skip the per-session Boltz fee refresh and pin a
    // stale pay-screen estimate across restarts.
    (w as any)._feesLoaded = true;

    // Touch the namespace cache so we can assert it stays non-enumerable too.
    w.getNamespace();

    const cloned = Object.assign({}, w) as unknown as Record<string, unknown>;
    assert.ok(!('_wallet' in cloned), '_wallet must not be enumerable');
    assert.ok(!('_arkadeSwaps' in cloned), '_arkadeSwaps must not be enumerable');
    assert.ok(!('_namespaceCache' in cloned), '_namespaceCache must not be enumerable');
    assert.ok(!('_feesLoaded' in cloned), '_feesLoaded must not be enumerable (runtime-only, not persisted)');

    // The values are still present on the instance itself.
    assert.deepStrictEqual((w as any)._wallet, { fake: 'wallet' });
    assert.deepStrictEqual((w as any)._arkadeSwaps, { fake: 'swaps' });
    assert.strictEqual((w as any)._feesLoaded, true);
  });

  it('a fromJson-restored wallet comes back with _feesLoaded false so it refetches fees', () => {
    // New-build restart: a wallet saved this session with warmed fees (and
    // truthy persisted limits) must restore cold. Otherwise ensureLightningFeesLoaded()
    // short-circuits on the persisted `true` and the pay screen shows a stale
    // estimate forever. getSubmarineFeeEstimate() must report undefined until a
    // fresh fetch flips the flag.
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._feesLoaded = true;
    (w as any)._submarineFeePercentage = 0.25;
    (w as any)._submarineMinerFees = 99;
    (w as any)._limitMin = 1000;
    (w as any)._limitMax = 1_000_000;
    assert.strictEqual(w.getSubmarineFeeEstimate(10_000), 124, 'live session reports the warmed estimate');

    const json = JSON.stringify({ ...Object.assign({}, w), type: (w as any).type });
    const restored = LightningArkWallet.fromJson(json) as unknown as LightningArkWallet;

    assert.strictEqual((restored as any)._feesLoaded, false, 'restored flag must be cold to force a refresh');
    assert.strictEqual(restored.getSubmarineFeeEstimate(10_000), undefined, 'no estimate until fees are refetched this session');
  });

  it('getNamespace requires a secret', () => {
    const w = new LightningArkWallet();
    assert.throws(() => w.getNamespace(), /No secret provided/);
  });

  it('getNamespace memoizes per secret and self-invalidates on secret change', () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);

    const first = w.getNamespace();
    assert.strictEqual(w.getNamespace(), first, 'second call must return cached value');

    // Spy on the hash function to confirm we don't recompute on cache hits.
    let hashCalls = 0;
    const originalHashIt = (w as any).hashIt;
    (w as any).hashIt = (s: string) => {
      hashCalls += 1;
      return originalHashIt.call(w, s);
    };
    w.getNamespace();
    assert.strictEqual(hashCalls, 0, 'cached path must skip hashIt');

    // A different secret must produce a different namespace (cache invalidates).
    w.setSecret('arkade://legal winner thank year wave sausage worth useful legal winner thank yellow');
    const second = w.getNamespace();
    assert.notStrictEqual(second, first, 'namespace must change when secret changes');
    assert.strictEqual(hashCalls, 1, 'cache miss must recompute exactly once');
  });

  it('exposes module-private caches via __testing__ for tests only', () => {
    // These caches are exposed for the deletion-vs-init race test. Pin the
    // shape so a future refactor doesn't silently drop the test surface.
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

  it('recognizes a freshly-created (unpaid) reverse invoice as ours but keeps it out of the history list', () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._swapHistory = [
      {
        id: 'fresh',
        type: 'reverse',
        status: 'swap.created',
        createdAt: 1700000000,
        request: { invoice: 'lnbc100u1p50528cpp5...fresh', invoiceAmount: 100 },
        response: { invoice: 'lnbc100u1p50528cpp5...fresh' },
      },
    ];
    // Registry view (includeUnpaidInvoices=true) sees the open invoice...
    assert.ok(w.isInvoiceGeneratedByWallet('lnbc100u1p50528cpp5...fresh'));
    // ...but the displayed history list still hides the unpaid, not-in-flight row.
    assert.strictEqual(w.getTransactions().length, 0);
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
    // _fetchLightningFeesAndLimits seeds these from Boltz; bypass by setting
    // them directly so the assertion guards inside addInvoice / payInvoice
    // pass.
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
    const arkAddress = 'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t5z8sz5n95k570z5r004szc9h2q3qprkzdd5zveujdpx24srcrqg8hf6j4v';

    await w.payInvoice(arkAddress, 12_345);

    assert.strictEqual(fakeWallet.sendBitcoin.mock.calls.length, 1);
    assert.deepStrictEqual(fakeWallet.sendBitcoin.mock.calls[0][0], {
      address: arkAddress,
      amount: 12_345,
    });
    assert.strictEqual(fakeArkadeSwaps.sendLightningPayment.mock.calls.length, 0, 'Lightning swap must not run for native Ark transfers');
  });
});

describe('LightningArkWallet — fetchBalance (headline excludes boarding)', () => {
  // Bypass init() by injecting a fake SDK wallet. The headline balance must be
  // offchain spendable + recoverable only (SDK `total` minus `boarding.total`):
  //   - a pending/unconfirmed refill must NOT inflate the balance, and
  //   - during settlement the SDK transiently reports BOTH the boarding UTXO and
  //     the new preconfirmed VTXO, so counting `total` would double-count it.
  let w: LightningArkWallet;

  const makeBalance = (over: Record<string, any> = {}) => ({
    boarding: { confirmed: 0, unconfirmed: 0, total: 0 },
    settled: 0,
    preconfirmed: 0,
    available: 0,
    recoverable: 0,
    total: 0,
    assets: [],
    ...over,
  });

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  it('excludes confirmed and unconfirmed boarding from the headline balance', async () => {
    const balance = makeBalance({
      boarding: { confirmed: 50_000, unconfirmed: 20_000, total: 70_000 },
      settled: 100_000,
      available: 100_000,
      recoverable: 5_000,
      total: 175_000, // available + recoverable + boarding.total
    });
    (w as any)._wallet = {
      getBalance: jest.fn().mockResolvedValue(balance),
      getBoardingUtxos: jest.fn().mockResolvedValue([]),
    };

    await w.fetchBalance();

    // available (100_000) + recoverable (5_000); boarding (70_000) is excluded.
    assert.strictEqual(w.balance, 105_000);
  });

  it('does not double-count a refill mid-settlement (boarding UTXO + new VTXO both present)', async () => {
    // The boarding UTXO (40_000) is still reported as confirmed boarding while
    // the freshly-settled VTXO already shows up as preconfirmed. SDK `total`
    // would be 80_000; the headline must stay 40_000 (the VTXO, counted once).
    const balance = makeBalance({
      boarding: { confirmed: 40_000, unconfirmed: 0, total: 40_000 },
      preconfirmed: 40_000,
      available: 40_000,
      total: 80_000,
    });
    (w as any)._wallet = {
      getBalance: jest.fn().mockResolvedValue(balance),
      getBoardingUtxos: jest.fn().mockResolvedValue([]),
    };

    await w.fetchBalance();

    assert.strictEqual(w.balance, 40_000);
  });
});

describe('LightningArkWallet — submarine fee estimate (Lightning pay side)', () => {
  let w: LightningArkWallet;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  it('returns undefined before fees are loaded so the screen hides the line', () => {
    assert.strictEqual(w.getSubmarineFeeEstimate(10_000), undefined);
  });

  it('computes ceil(amount * percentage / 100) + minerFees once loaded', () => {
    (w as any)._feesLoaded = true;
    (w as any)._submarineFeePercentage = 0.1; // 0.1%
    (w as any)._submarineMinerFees = 121;
    // 10_000 * 0.1 / 100 = 10 → + 121 flat miner fee = 131
    assert.strictEqual(w.getSubmarineFeeEstimate(10_000), 131);
  });

  it('rounds the percentage component up (matches the reverse-side ceil convention)', () => {
    (w as any)._feesLoaded = true;
    (w as any)._submarineFeePercentage = 0.1;
    (w as any)._submarineMinerFees = 0;
    // 1234 * 0.1 / 100 = 1.234 → ceil = 2
    assert.strictEqual(w.getSubmarineFeeEstimate(1234), 2);
  });
});

describe('LightningArkWallet — ensureLightningFeesLoaded warms a restored wallet', () => {
  // Regression for the silent-stuck-state bug: a wallet restored via fromJson
  // can carry truthy _limitMin/_limitMax (serialized last session) while the
  // submarine fields + _feesLoaded come back cold (an older build serialized
  // the wallet before those fields existed). init() gates its fee fetch on
  // falsy limits, so it short-circuits and never refreshes — leaving the pay
  // screen's estimate undefined forever. ensureLightningFeesLoaded() must fetch
  // explicitly. This test fails against an `await this.init()`-only version.
  let w: LightningArkWallet;
  const fakeArkadeSwaps: { getFees: jest.Mock; getLimits: jest.Mock } = {
    getFees: jest.fn(),
    getLimits: jest.fn(),
  };

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    fakeArkadeSwaps.getFees.mockReset().mockResolvedValue({
      reverse: { percentage: 0.5, minerFees: { lockup: 0, claim: 0 } },
      submarine: { percentage: 0.25, minerFees: 99 },
    });
    fakeArkadeSwaps.getLimits.mockReset().mockResolvedValue({ min: 1000, max: 1_000_000 });
    // _wallet + _arkadeSwaps present → init() short-circuits offline (no Realm,
    // no network). Limits truthy, fees cold.
    (w as any)._wallet = {};
    (w as any)._arkadeSwaps = fakeArkadeSwaps;
    (w as any)._limitMin = 1000;
    (w as any)._limitMax = 1_000_000;
    (w as any)._feesLoaded = false;
  });

  it('fetches fees explicitly even though init() short-circuits on truthy limits', async () => {
    assert.strictEqual(w.getSubmarineFeeEstimate(10_000), undefined, 'cold before warm-up');

    await w.ensureLightningFeesLoaded();

    assert.strictEqual(fakeArkadeSwaps.getFees.mock.calls.length, 1, 'must fetch fees despite truthy limits');
    assert.strictEqual((w as any)._feesLoaded, true);
    assert.strictEqual((w as any)._submarineFeePercentage, 0.25);
    assert.strictEqual((w as any)._submarineMinerFees, 99);
    // 10_000 * 0.25 / 100 = 25 → + 99 = 124
    assert.strictEqual(w.getSubmarineFeeEstimate(10_000), 124);
  });

  it('is a no-op once fees are already loaded', async () => {
    (w as any)._feesLoaded = true;
    await w.ensureLightningFeesLoaded();
    assert.strictEqual(fakeArkadeSwaps.getFees.mock.calls.length, 0, 'no fetch when already warm');
  });
});

describe('LightningArkWallet — per-swap claim/refund + restore', () => {
  // Like the addInvoice/payInvoice block, we bypass init() and inject the SDK
  // runtime objects. These tests assert the wiring (delegation + post-action
  // refresh + concurrent-call coalescing), not SDK network behavior.
  let w: LightningArkWallet;
  const fakeArkadeSwaps: {
    claimVHTLC: jest.Mock;
    refundVHTLC: jest.Mock;
    restoreSwaps: jest.Mock;
    getSwapHistory: jest.Mock;
  } = {
    claimVHTLC: jest.fn(),
    refundVHTLC: jest.fn(),
    restoreSwaps: jest.fn(),
    getSwapHistory: jest.fn(),
  };

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    fakeArkadeSwaps.claimVHTLC.mockReset().mockResolvedValue(undefined);
    fakeArkadeSwaps.refundVHTLC.mockReset().mockResolvedValue({ swept: 0, skipped: 0 });
    fakeArkadeSwaps.restoreSwaps.mockReset().mockResolvedValue({ chainSwaps: [], reverseSwaps: [], submarineSwaps: [] });
    fakeArkadeSwaps.getSwapHistory.mockReset().mockResolvedValue([]);
    // presence is enough; refresh helpers are stubbed below
    (w as any)._wallet = {};
    (w as any)._arkadeSwaps = fakeArkadeSwaps;
    jest.spyOn(w, 'fetchTransactions').mockResolvedValue();
    jest.spyOn(w, 'fetchBalance').mockResolvedValue();
  });

  it('getSwapById returns the matching swap, undefined for unknown id', () => {
    (w as any)._swapHistory = [
      { id: 'swap-A', type: 'reverse' },
      { id: 'swap-B', type: 'submarine' },
    ];
    assert.deepStrictEqual(w.getSwapById('swap-A'), { id: 'swap-A', type: 'reverse' });
    assert.deepStrictEqual(w.getSwapById('swap-B'), { id: 'swap-B', type: 'submarine' });
    assert.strictEqual(w.getSwapById('nope'), undefined);
  });

  it('isSwapClaimable / isSwapRefundable use the SDK status predicates', () => {
    // The SDK predicates branch on swap.type + status. Use real swap shapes
    // with the right status (per node_modules/@arkade-os/boltz-swap status
    // tables) to verify the wiring without re-stubbing the predicates.
    const claimableReverse: any = { id: 'r1', type: 'reverse', status: 'transaction.confirmed' };
    const refundableSubmarine: any = { id: 's1', type: 'submarine', status: 'swap.expired' };
    const settledReverse: any = { id: 'r2', type: 'reverse', status: 'invoice.settled' };

    assert.strictEqual(w.isSwapClaimable(claimableReverse), true);
    assert.strictEqual(w.isSwapClaimable(refundableSubmarine), false);
    assert.strictEqual(w.isSwapClaimable(settledReverse), false);

    assert.strictEqual(w.isSwapRefundable(refundableSubmarine), true);
    assert.strictEqual(w.isSwapRefundable(claimableReverse), false);
    assert.strictEqual(w.isSwapRefundable(settledReverse), false);
  });

  it('refundSwap delegates to ArkadeSwaps.refundVHTLC and forwards the SubmarineRefundOutcome', async () => {
    fakeArkadeSwaps.refundVHTLC.mockResolvedValue({ swept: 1, skipped: 0 });
    const swap: any = { id: 's1', type: 'submarine', status: 'swap.expired' };

    const outcome = await w.refundSwap(swap);

    assert.deepStrictEqual(outcome, { swept: 1, skipped: 0 });
    assert.strictEqual(fakeArkadeSwaps.refundVHTLC.mock.calls.length, 1);
    assert.strictEqual(fakeArkadeSwaps.refundVHTLC.mock.calls[0][0], swap);
    // @ts-expect-error spy
    assert.strictEqual(w.fetchTransactions.mock.calls.length, 1);
    // @ts-expect-error spy
    assert.strictEqual(w.fetchBalance.mock.calls.length, 1);
  });

  it('refundSwap with swept=0 still resolves and reports the deferred outcome', async () => {
    fakeArkadeSwaps.refundVHTLC.mockResolvedValue({ swept: 0, skipped: 2 });
    const swap: any = { id: 's2', type: 'submarine', status: 'swap.expired' };

    const outcome = await w.refundSwap(swap);
    assert.deepStrictEqual(outcome, { swept: 0, skipped: 2 });
  });

  it('restoreSwaps delegates to ArkadeSwaps.restoreSwaps and refreshes the local swap history', async () => {
    fakeArkadeSwaps.getSwapHistory.mockResolvedValue([{ id: 'restored', type: 'reverse' }]);

    await w.restoreSwaps();

    assert.strictEqual(fakeArkadeSwaps.restoreSwaps.mock.calls.length, 1);
    assert.strictEqual(fakeArkadeSwaps.getSwapHistory.mock.calls.length, 1);
    assert.deepStrictEqual((w as any)._swapHistory, [{ id: 'restored', type: 'reverse' }]);
  });

  it('restoreSwaps coalesces concurrent calls into a single in-flight SDK request', async () => {
    let resolveRestore!: () => void;
    fakeArkadeSwaps.restoreSwaps.mockImplementation(
      () =>
        new Promise<{ chainSwaps: any[]; reverseSwaps: any[]; submarineSwaps: any[] }>(resolve => {
          resolveRestore = () => resolve({ chainSwaps: [], reverseSwaps: [], submarineSwaps: [] });
        }),
    );

    const a = w.restoreSwaps();
    const b = w.restoreSwaps();
    const c = w.restoreSwaps();
    resolveRestore();
    await Promise.all([a, b, c]);

    // Three callers, one underlying SDK request.
    assert.strictEqual(fakeArkadeSwaps.restoreSwaps.mock.calls.length, 1);
    assert.strictEqual(fakeArkadeSwaps.getSwapHistory.mock.calls.length, 1);
  });

  it('restoreSwaps clears the in-flight entry on rejection so the next call can retry', async () => {
    fakeArkadeSwaps.restoreSwaps.mockRejectedValueOnce(new Error('boom'));
    await assert.rejects(() => w.restoreSwaps(), /boom/);

    // Next call should issue a fresh SDK request, not surface the cached rejection.
    fakeArkadeSwaps.restoreSwaps.mockResolvedValueOnce({ chainSwaps: [], reverseSwaps: [], submarineSwaps: [] });
    await w.restoreSwaps();
    assert.strictEqual(fakeArkadeSwaps.restoreSwaps.mock.calls.length, 2);
  });
});
