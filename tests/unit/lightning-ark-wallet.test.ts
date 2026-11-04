import assert from 'assert';

import { ArkRealmSchemas, ARK_REALM_SCHEMA_VERSION } from '@arkade-os/sdk/repositories/realm';

import { LightningArkWallet, __testing__ as walletTesting } from '../../class/wallets/lightning-ark-wallet.ts';
import * as strandedSends from '../../blue_modules/arkade-stranded-sends';
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

  it('returns an empty list when there is no history', () => {
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
});

describe('LightningArkWallet — Realm schema integration', () => {
  it('opens the Ark schemas', () => {
    const arkNames = ArkRealmSchemas.map((s: any) => s.name);

    assert.ok(arkNames.includes('ArkVtxo'), 'Ark schema list missing ArkVtxo');
    assert.ok(arkNames.includes('ArkUtxo'), 'Ark schema list missing ArkUtxo');
    assert.ok(arkNames.includes('ArkContract'), 'Ark schema list missing ArkContract');
    assert.ok(arkNames.includes('ArkWalletState'), 'Ark schema list missing ArkWalletState');
    assert.ok(arkNames.includes('ArkTransaction'), 'Ark schema list missing ArkTransaction');

    assert.strictEqual(typeof ARK_REALM_SCHEMA_VERSION, 'number');
    assert.ok(ARK_REALM_SCHEMA_VERSION >= 1, 'schemaVersion must be a positive integer');
  });
});

describe('LightningArkWallet — serialization', () => {
  it('saveToDisk-style Object.assign({}, wallet) skips the runtime SDK wallet', () => {
    // The constructor installs the runtime SDK field as non-enumerable so
    // saveToDisk can't try to serialise a half-built SDK graph through
    // JSON.stringify, and the wallet stays initialised across saves.
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._wallet = { fake: 'wallet' };

    // Touch the namespace cache so we can assert it stays non-enumerable too.
    w.getNamespace();

    const cloned = Object.assign({}, w) as unknown as Record<string, unknown>;
    assert.ok(!('_wallet' in cloned), '_wallet must not be enumerable');
    assert.ok(!('_namespaceCache' in cloned), '_namespaceCache must not be enumerable');

    // The value is still present on the instance itself.
    assert.deepStrictEqual((w as any)._wallet, { fake: 'wallet' });
  });

  it('drops legacy Boltz keys from a wallet restored from an old blob', () => {
    const blob = {
      type: LightningArkWallet.type,
      secret: 'arkade://' + TEST_MNEMONIC,
      _swapHistory: [{ id: 'old' }],
      _limitMin: 333,
      _limitMax: 1000000,
      _feePercentage: 0.5,
      _submarineFeePercentage: 0.1,
      _submarineMinerFees: 21,
      _feesLoaded: true,
    };
    const restored = LightningArkWallet.fromJson(JSON.stringify(blob)) as unknown as LightningArkWallet;

    restored.prepareForSerialization();

    const saved = JSON.parse(JSON.stringify(Object.assign({}, restored)));
    for (const key of Object.keys(blob).filter(k => k.startsWith('_'))) {
      assert.ok(!(key in saved), `${key} must not be saved again`);
    }
    assert.strictEqual(saved.secret, blob.secret, 'the secret survives');
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
    assert.ok('initInFlight' in walletTesting);
    assert.ok('boardingLock' in walletTesting);
  });
});

describe('LightningArkWallet — generate', () => {
  it('refuses init without a secret', async () => {
    const w = new LightningArkWallet();
    await assert.rejects(() => (w as any).getArkAddress(), /No secret provided/);
  });
});

describe('LightningArkWallet — payments without Lightning', () => {
  const INVOICE =
    'lnbc6670n1p5jp0p9pp5jmyumdwfejjxzwhxh7wnckeugcwcpkqtf5t6dh2fzykjjh4hkatqdq6235x2grhdaexggrs09exzmtfvscqz3txqyyzzssp5ae74xvmlk5q6vxsxe3sqm90w2x4x0ekejt7qp9ca5zzhu83ru8hq9qxpqysgql4dexpmwacw98va6v6smww69a3w6hs5ng0573v8skyhlj7lylt8r65jm5zqaa7hzx3vlrs2fr3h0rtqjw7x94xprdwqy6rr9ff5pnxsppnpr5q';
  let w: LightningArkWallet;
  const fakeWallet: { sendBitcoin: jest.Mock } = { sendBitcoin: jest.fn() };

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    fakeWallet.sendBitcoin.mockReset().mockResolvedValue(undefined);
    // Wire the wallet up as if init() had already completed.
    (w as any)._wallet = fakeWallet;
  });

  it('payInvoice routes a valid Ark address through Wallet.sendBitcoin', async () => {
    const arkAddress = 'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t5z8sz5n95k570z5r004szc9h2q3qprkzdd5zveujdpx24srcrqg8hf6j4v';

    await w.payInvoice(arkAddress, 12_345);

    assert.strictEqual(fakeWallet.sendBitcoin.mock.calls.length, 1);
    assert.deepStrictEqual(fakeWallet.sendBitcoin.mock.calls[0][0], {
      address: arkAddress,
      amount: 12_345,
    });
  });

  it('payInvoice refuses a BOLT11 invoice without spending anything', async () => {
    await assert.rejects(() => w.payInvoice(INVOICE), /Lightning is temporarily unavailable/);
    assert.strictEqual(fakeWallet.sendBitcoin.mock.calls.length, 0);
  });

  it('addInvoice refuses', async () => {
    await assert.rejects(() => w.addInvoice(), /Lightning is temporarily unavailable/);
  });

  it('has no invoices of its own', async () => {
    assert.deepStrictEqual(await w.getUserInvoices(), []);
    assert.strictEqual(w.isInvoiceGeneratedByWallet(), false);
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

describe('LightningArkWallet — _refundStrandedSends (#8804)', () => {
  // The refund itself is covered in arkade-stranded-sends.test.ts. This pins
  // the refresh that makes a refunded send show up without the user's help.
  let w: LightningArkWallet;
  const sdkWallet = {};
  const realm = {};

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._wallet = sdkWallet;
    jest.spyOn(w, 'fetchBalance').mockResolvedValue();
    jest.spyOn(w, 'fetchTransactions').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refreshes balance and transactions after a refund settles', async () => {
    jest.spyOn(strandedSends, 'refundStrandedSends').mockResolvedValue(true);

    await (w as any)._refundStrandedSends(realm, sdkWallet);

    // @ts-expect-error spy
    assert.strictEqual(w.fetchBalance.mock.calls.length, 1);
    // @ts-expect-error spy
    assert.strictEqual(w.fetchTransactions.mock.calls.length, 1);
  });

  it('skips the refresh when nothing settled', async () => {
    jest.spyOn(strandedSends, 'refundStrandedSends').mockResolvedValue(false);

    await (w as any)._refundStrandedSends(realm, sdkWallet);

    // @ts-expect-error spy
    assert.strictEqual(w.fetchBalance.mock.calls.length, 0);
    // @ts-expect-error spy
    assert.strictEqual(w.fetchTransactions.mock.calls.length, 0);
  });

  it("skips the refresh if the wallet has since been re-init'd (stale wallet ref)", async () => {
    jest.spyOn(strandedSends, 'refundStrandedSends').mockResolvedValue(true);
    (w as any)._wallet = { different: true }; // simulate onDelete/re-init happening mid-refund

    await (w as any)._refundStrandedSends(realm, sdkWallet);

    // @ts-expect-error spy
    assert.strictEqual(w.fetchBalance.mock.calls.length, 0, 'must not touch a stale instance state');
    // @ts-expect-error spy
    assert.strictEqual(w.fetchTransactions.mock.calls.length, 0, 'must not touch a stale instance state');
  });
});
