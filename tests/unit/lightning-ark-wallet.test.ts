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

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  it('returns an empty list when there is no swap or boarding history', () => {
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('maps a paid Lightning send (transaction.claimed) as a paid_invoice with negative amount', () => {
    const swap = {
      id: 'swap-out',
      status: 'transaction.claimed',
      createdAt: 1700000000,
      preimage: 'aa'.repeat(32),
      request: { invoice: 'lnbc1234...send', invoiceAmount: 1234 },
      response: { onchainAmount: 1234 },
    } as any;
    (w as any)._swapHistory = [swap];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'paid_invoice');
    assert.strictEqual(txs[0].value, -1234);
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].timestamp, 1700000000);
    assert.strictEqual(txs[0].payment_preimage, 'aa'.repeat(32));
  });

  it('maps a settled Lightning receive (invoice.settled) as a user_invoice with positive amount', () => {
    const swap = {
      id: 'swap-in',
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
  });

  it('maps a pending invoice (swap.created) as a user_invoice with ispaid=false', () => {
    const swap = {
      id: 'swap-pending',
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

  it('hides invoice.set entries (failed-to-pay attempts) from the visible list', () => {
    (w as any)._swapHistory = [
      {
        id: 'failed',
        status: 'invoice.set',
        createdAt: 1700003000,
        request: { invoice: 'lnbc...failed', invoiceAmount: 50 },
        response: { invoice: 'lnbc...failed' },
      },
    ];

    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('maps a pending boarding UTXO as a "Pending refill" bitcoind_tx row', () => {
    (w as any)._boardingUtxos = [{ value: 50000, status: { block_time: 1700005000 } }];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'bitcoind_tx');
    assert.strictEqual(txs[0].description, 'Pending refill');
    assert.strictEqual(txs[0].value, 50000);
    assert.strictEqual(txs[0].timestamp, 1700005000);
  });

  it('falls back to "now" when the boarding UTXO has no block_time yet', () => {
    (w as any)._boardingUtxos = [{ value: 100, status: {} }];
    const before = Math.floor(Date.now() / 1000);
    const tx = w.getTransactions()[0];
    const after = Math.floor(Date.now() / 1000);
    assert.ok(tx.timestamp! >= before && tx.timestamp! <= after, 'timestamp falls within now ± 1s');
  });

  it('maps a settled boarding history record as a "Refill" bitcoind_tx row', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'abc' },
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
  });

  it('skips unsettled boarding history records (only completed refills surface)', () => {
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'pending' },
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
        key: { boardingTxid: 'sent' },
        type: 'SENT',
        settled: true,
        amount: 5000,
        createdAt: 1700007000_000,
      },
    ];
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('returns mixed swap + boarding rows in a single list', () => {
    (w as any)._swapHistory = [
      {
        id: 'paid',
        status: 'invoice.settled',
        createdAt: 1700000000,
        preimage: 'cc'.repeat(32),
        request: { invoice: 'lnbc...paid' },
        response: { invoice: 'lnbc...paid', onchainAmount: 1000 },
      },
    ];
    (w as any)._boardingUtxos = [{ value: 2000, status: { block_time: 1700001000 } }];
    (w as any)._transactionsHistory = [
      {
        key: { boardingTxid: 'refilled' },
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
