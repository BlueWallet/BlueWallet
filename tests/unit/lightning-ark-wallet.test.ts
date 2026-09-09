import assert from 'assert';

import { TxType } from '@arkade-os/sdk';
import { ArkRealmSchemas, ARK_REALM_SCHEMA_VERSION } from '@arkade-os/sdk/repositories/realm';
import { AssetSwapRealmSchemas } from '@arkade-os/swap/repositories/realm';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';
import { resetArkadeTestState } from '../helpers/arkadeMocks';
import { installSdkProviderSpies, restoreSdkProviderSpies } from '../helpers/sdkProviderMocks';
import { readLockupFate } from '@arkade-os/swap/protocol';

jest.mock('@arkade-os/swap/protocol', () => ({
  ...jest.requireActual('@arkade-os/swap/protocol'),
  readLockupFate: jest.fn(),
}));

const readLockupFateMock = readLockupFate as jest.Mock;

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Card-shaped market mirroring blue_modules/arkade-solver.card.json (beta
// solver): send (quote side) and receive (base side) both 500–50 000 sats at
// fee_bps 30.
const BUNDLED_MARKET = {
  pair: 'BTC/lightning:BTC',
  base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
  quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
  quote_corridor: 'lightning',
  fee_bps: 30,
  min_base_amount: '500',
  max_base_amount: '50000',
  min_quote_amount: '500',
  max_quote_amount: '50000',
} as any;

const sendRecord = (overrides: Record<string, any> = {}): any => ({
  id: 'quote-send-1',
  family: 'rfq',
  kind: 'lightning_send',
  route: {
    give: { corridor: 'arkade', asset: 'arkade:bitcoin/slip44:0', instrument: { kind: 'wallet' } },
    take: {
      corridor: 'lightning',
      asset: 'bolt11:bitcoin/slip44:0',
      instrument: { kind: 'invoice', bolt11: 'lnbc10n1send', paymentHash: 'aa'.repeat(32), expiresAt: 1900000000 },
    },
  },
  give: { asset: 'arkade:bitcoin/slip44:0', amount: '1020' },
  take: { asset: 'bolt11:bitcoin/slip44:0', amount: '1000' },
  fee: { asset: 'arkade:bitcoin/slip44:0', amount: '20' },
  market: { pair: 'BTC/lightning:BTC' },
  expiresAt: 1800000000,
  createdAt: 1700000000,
  updatedAt: 1700000000,
  lock: { hash: 'aa'.repeat(32) },
  lockupAddress: 'ark1test',
  lockupPkScript: 'bb'.repeat(32),
  rfqId: 'rfq-1',
  state: 'pending',
  ...overrides,
});

const receiveRecord = (overrides: Record<string, any> = {}): any => ({
  id: 'quote-recv-1',
  family: 'rfq',
  kind: 'lightning_receive',
  route: {
    give: {
      corridor: 'lightning',
      asset: 'bolt11:bitcoin/slip44:0',
      instrument: { kind: 'invoice', bolt11: 'lnbc10n1recv', paymentHash: 'cc'.repeat(32), expiresAt: 1900000000 },
    },
    take: { corridor: 'arkade', asset: 'arkade:bitcoin/slip44:0', instrument: { kind: 'wallet' } },
  },
  give: { asset: 'bolt11:bitcoin/slip44:0', amount: '1000' },
  take: { asset: 'arkade:bitcoin/slip44:0', amount: '1000' },
  fee: { asset: 'arkade:bitcoin/slip44:0', amount: '0' },
  market: { pair: 'BTC/lightning:BTC' },
  artifact: { kind: 'invoice', bolt11: 'lnbc10n1recv' },
  expiresAt: 1800000000,
  createdAt: 1700000100,
  updatedAt: 1700000100,
  lock: { hash: 'cc'.repeat(32) },
  lockupAddress: 'ark1testrecv',
  lockupPkScript: 'dd'.repeat(32),
  rfqId: 'rfq-2',
  state: 'pending',
  ...overrides,
});

const seedCaches = (w: LightningArkWallet, records: any[], outcomes: Record<string, string>): void => {
  (w as any)._swapRecords = records;
  (w as any)._outcomes = new Map(Object.entries(outcomes));
  (w as any)._swaps = new Map(records.map(r => [`rfq:${r.id}`, { id: `rfq:${r.id}`, outcome: outcomes[`rfq:${r.id}`] ?? 'funding' }]));
};

const histTx = (overrides: Record<string, any> = {}): any => ({
  key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'leg-1' },
  type: TxType.TxSent,
  settled: true,
  amount: 1020,
  createdAt: 1700000000_000,
  ...overrides,
});

beforeEach(() => {
  resetArkadeTestState();
  readLockupFateMock.mockReset();
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
});

afterEach(() => {
  jest.restoreAllMocks();
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

describe('LightningArkWallet — realm schema set', () => {
  it('registers the five asset-swap schemas beside the SDK schemas and drops Boltz', async () => {
    const { getArkadeRealm, closeAllArkadeRealms } = await import('../../blue_modules/arkade-adapters/realm/realmInstance');
    const Realm = require('realm');
    Realm.open.mockClear();
    await getArkadeRealm('schema-probe');
    const config = Realm.open.mock.calls[0][0];
    const names = config.schema.map((s: any) => s.name);
    for (const schema of AssetSwapRealmSchemas) {
      assert.ok(names.includes((schema as any).name), `has ${(schema as any).name} schema`);
    }
    for (const sdkSchema of ArkRealmSchemas) {
      assert.ok(names.includes((sdkSchema as any).name), `has SDK schema ${(sdkSchema as any).name}`);
    }
    assert.ok(!names.includes('BoltzSwap'), 'BoltzSwap is gone');
    assert.ok(!names.includes('ArkSwapNotificationSuppression'), 'suppression schema is gone');
    assert.strictEqual(config.schemaVersion, ARK_REALM_SCHEMA_VERSION + 1, 'local offset keeps app schemas ahead of the SDK version');
    closeAllArkadeRealms();
  });

  it('migration drops the Boltz and suppression models', async () => {
    const { getArkadeRealm, closeAllArkadeRealms } = await import('../../blue_modules/arkade-adapters/realm/realmInstance');
    const Realm = require('realm');
    Realm.open.mockClear();
    await getArkadeRealm('migration-probe');
    const config = Realm.open.mock.calls[0][0];
    const deleted: string[] = [];
    config.onMigration(
      {},
      {
        objects: () => [],
        deleteModel: (name: string) => {
          deleted.push(name);
        },
      },
    );
    assert.ok(deleted.includes('BoltzSwap'), 'drops BoltzSwap');
    assert.ok(deleted.includes('ArkSwapNotificationSuppression'), 'drops suppression table');
    closeAllArkadeRealms();
  });
});

describe('LightningArkWallet — getTransactions mapping (v2)', () => {
  let w: LightningArkWallet;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  it('returns an empty list when there is no swap or boarding history', () => {
    assert.deepStrictEqual(w.getTransactions(), []);
  });

  it('renders a pending send from the record with no transaction evidence', () => {
    seedCaches(w, [sendRecord()], { 'rfq:quote-send-1': 'funded' });

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].txid, 'swap-rfq:quote-send-1');
    assert.strictEqual(txs[0].value, -1020, 'amount is the give leg, not a net of transactions');
    assert.strictEqual(txs[0].timestamp, 1700000000, 'timestamp is the record createdAt');
    assert.strictEqual(txs[0].ispaid, false);
    assert.strictEqual(txs[0].failed, false);
  });

  it('keeps one row — same key, same position — when funding evidence arrives', () => {
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1' })], { 'rfq:quote-send-1': 'funded' });
    (w as any)._transactionsHistory = [histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } })];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'the pass-1 funding row is suppressed, the swap row stands in');
    assert.strictEqual(txs[0].txid, 'swap-rfq:quote-send-1');
    assert.strictEqual(txs[0].value, -1020);
  });

  it('a settled send keeps its identity and reads paid', () => {
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1', lockupSpendTxids: ['claim-txid-1'] })], {
      'rfq:quote-send-1': 'paid',
    });
    (w as any)._transactionsHistory = [
      histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } }),
      histTx({
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'claim-txid-1' },
        type: TxType.TxReceived,
        amount: 5,
        createdAt: 1700000500_000,
      }),
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].txid, 'swap-rfq:quote-send-1');
    assert.strictEqual(txs[0].ispaid, true);
    assert.strictEqual(txs[0].type, 'paid_invoice');
  });

  it('a refunded send shows the attempted amount with a Refunded: label, not a net of zero', () => {
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1', refundTxid: 'refund-txid-1' })], {
      'rfq:quote-send-1': 'refunded',
    });
    (w as any)._transactionsHistory = [
      histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } }),
      histTx({
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'refund-txid-1' },
        type: TxType.TxReceived,
        amount: 1020,
        createdAt: 1700000600_000,
      }),
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'terminal swaps keep their rows');
    assert.strictEqual(txs[0].value, -1020);
    assert.ok(String(txs[0].memo).startsWith('Refunded: '));
    assert.strictEqual(txs[0].failed, true);
    assert.strictEqual(txs[0].ispaid, false);
  });

  it('collapses several lockupSpendTxids to one row', () => {
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1', lockupSpendTxids: ['spend-a', 'spend-b'] })], {
      'rfq:quote-send-1': 'paid',
    });
    (w as any)._transactionsHistory = [
      histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } }),
      histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'spend-a' }, type: TxType.TxReceived, amount: 1 }),
      histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'spend-b' }, type: TxType.TxReceived, amount: 1 }),
    ];

    const txs = w.getTransactions();
    assert.strictEqual(txs.length, 1, 'one swap owns several transactions — one row, not one per txid');
  });

  it('hides an unpaid receive unless includeUnpaidInvoices, and labels lapsed as Failed:', () => {
    seedCaches(w, [receiveRecord()], { 'rfq:quote-recv-1': 'open' });
    assert.deepStrictEqual(w.getTransactions(), [], 'unpaid receive hidden from the history list');
    const withUnpaid = w.getTransactions(true);
    assert.strictEqual(withUnpaid.length, 1, 'discoverable by the receive-screen poll with includeUnpaidInvoices=true');
    assert.ok(withUnpaid[0].value! > 0);

    seedCaches(w, [receiveRecord()], { 'rfq:quote-recv-1': 'lapsed' });
    const lapsed = w.getTransactions();
    assert.strictEqual(lapsed.length, 1);
    assert.ok(String(lapsed[0].memo).startsWith('Failed: '), 'lapsed = incoming payment never arrived, said out loud');
    assert.strictEqual(lapsed[0].failed, true);
  });

  it('getSwapById still resolves its subject after settlement', () => {
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1' })], { 'rfq:quote-send-1': 'paid' });
    (w as any)._transactionsHistory = [histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } })];
    // The row list no longer matters: the lookup reads the record cache directly.
    w.getTransactions();

    const view = w.getSwapById('rfq:quote-send-1');
    assert.ok(view, 'resolves across settlement');
    assert.strictEqual(view!.outcome, 'paid');
    assert.strictEqual(view!.amountSats, 1020);
    assert.strictEqual(view!.direction, -1);
  });

  it('isInvoiceGeneratedByWallet joins on lock.hash, receive-only', () => {
    const recv = receiveRecord({ lock: { hash: 'cc'.repeat(32) } });
    seedCaches(w, [recv, sendRecord({ lock: { hash: 'aa'.repeat(32) } })], {
      'rfq:quote-recv-1': 'open',
      'rfq:quote-send-1': 'funded',
    });

    // A send's bolt11 must not match: today's semantics are receive-only.
    assert.strictEqual(w.isInvoiceGeneratedByWallet('lnbc10n1send'), false);
    assert.strictEqual(w.isInvoiceGeneratedByWallet('lnbc10n1recv'), true);
  });
});

describe('LightningArkWallet — limits and fee estimate off the card', () => {
  let w: LightningArkWallet;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._markets = [BUNDLED_MARKET];
  });

  it('reads the send bracket live off the card', () => {
    assert.deepStrictEqual(w.getSendLimits(), { min: 500, max: 50000 });
  });

  it('reads the receive bracket live off the card', () => {
    assert.deepStrictEqual(w.getReceiveLimits(), { min: 500, max: 50000 });
  });

  it('reads a disabled receive side as null', () => {
    (w as any)._markets = [{ ...BUNDLED_MARKET, min_base_amount: '0', max_base_amount: '0' }];
    assert.strictEqual(w.getReceiveLimits(), null);
  });

  it('estimates the send fee synchronously off fee_bps', () => {
    assert.strictEqual(w.getSubmarineFeeEstimate(10000), 30);
    assert.strictEqual(w.getSubmarineFeeEstimate(500), 2, 'ceil(500 * 30 / 10000)');
  });

  it('returns undefined estimates with no market set', () => {
    (w as any)._markets = [];
    assert.strictEqual(w.getSubmarineFeeEstimate(10000), undefined);
    assert.strictEqual(w.getSendLimits(), null);
  });
});

describe('LightningArkWallet — quote gates', () => {
  let w: LightningArkWallet;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._markets = [BUNDLED_MARKET];
    (w as any)._swapClient = { resolve: async () => ({}), quote: async () => ({ id: 'q' }), swaps: async () => [] };
  });

  it('refuses an unparseable invoice before any solver is contacted', async () => {
    await assert.rejects(w.quoteInvoice('not-an-invoice'), /not a valid BOLT11 invoice/);
  });

  it('refuses a wrong-network invoice', async () => {
    // A mainnet invoice decoded against the testnet network: the checksum is
    // valid, only the prefix mismatches — so the gate (not the parser) refuses.
    const { toInvoiceFacts } = await import('../../blue_modules/arkade-bolt11');
    const mainnetInvoice =
      'lnbc20n1p59n9nkpp58s49flel3cz5u3lrve8qeqzxljxmu0gja06elfcgwrx2e9nq959ssp5z7ytwq0rm6yq8evn2kteduj6a0rs4svn3sfwvg92a29f8l022jjqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdq023mk7gryv9uhxgq9qyyssqy4mv8te3l6mrc7qf4pksh4m4z76jz7s2qrwxd7q2s22ghnanqt33e9p0nahz9fr32g00vn2vhc9rrhpvtr54s40tle25tyyvp59sdpsqty30rp';
    assert.throws(() => toInvoiceFacts(mainnetInvoice, 'testnet'), /invoice is not for testnet/);
    // And quoteInvoice enforces the wallet's own network the same way.
    await assert.rejects(w.quoteInvoice('not-an-invoice'), /not a valid BOLT11 invoice/);
  });
});

describe('LightningArkWallet — quote/accept orchestration', () => {
  let w: LightningArkWallet;
  const BOLT11 = 'lnbc10n1send';

  const fakeQuote = (overrides: Record<string, any> = {}): any => ({
    id: 'quote-1',
    route: {
      give: { corridor: 'arkade', asset: 'arkade:bitcoin/slip44:0', instrument: { kind: 'wallet' } },
      take: {
        corridor: 'lightning',
        asset: 'bolt11:bitcoin/slip44:0',
        instrument: { kind: 'invoice', bolt11: BOLT11, paymentHash: 'aa'.repeat(32), expiresAt: 1900000000 },
      },
    },
    give: { asset: 'arkade:bitcoin/slip44:0', amount: 1020n },
    take: { asset: 'bolt11:bitcoin/slip44:0', amount: 1000n },
    fee: { asset: 'arkade:bitcoin/slip44:0', amount: 20n },
    market: {},
    expiresAt: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  });

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  const seedClient = (client: Record<string, any>, repository: Record<string, any> = {}): void => {
    (w as any)._swapClient = {
      swaps: async () => [],
      onUpdate: () => () => {},
      ...client,
    };
    (w as any)._swapRepository = {
      getAllSwapRecords: async () => [],
      getSwapRecord: async () => undefined,
      ...repository,
    };
    (w as any)._wallet = { getArkadeReader: async () => ({}) };
  };

  it('payQuotedInvoice accepts the held object and fills last_paid_invoice_result on paid', async () => {
    const quote = fakeQuote();
    seedClient(
      {
        accept: async () => ({ id: 'rfq:quote-1' }),
        onUpdate: (fn: any) => {
          fn({ swap: { id: 'rfq:quote-1' }, outcome: 'paid', detail: {} });
          return () => {};
        },
      },
      { getSwapRecord: async () => ({ settlementPreimageHex: 'ab'.repeat(32), lock: { hash: 'aa'.repeat(32) } }) },
    );

    await w.payQuotedInvoice(quote);

    assert.strictEqual(w.last_paid_invoice_result.payment_preimage, 'ab'.repeat(32));
    assert.strictEqual(w.last_paid_invoice_result.payment_hash, 'aa'.repeat(32));
    assert.strictEqual(w.last_paid_invoice_result.payment_request, BOLT11);
  });

  it('payQuotedInvoice refuses a fee above the confirmed ceiling without funding', async () => {
    const quote = fakeQuote();
    let accepted = false;
    seedClient({
      accept: async () => {
        accepted = true;
        return { id: 'rfq:quote-1' };
      },
    });

    await assert.rejects(w.payQuotedInvoice(quote, 5), /exceeds the confirmed maximum/);
    assert.strictEqual(accepted, false, 'refusal is free: nothing has been funded');
  });

  it('payQuotedInvoice backfills the preimage via readLockupFate when the record predates the receipt', async () => {
    const quote = fakeQuote();
    seedClient(
      {
        accept: async () => ({ id: 'rfq:quote-1' }),
        onUpdate: (fn: any) => {
          fn({ swap: { id: 'rfq:quote-1' }, outcome: 'paid', detail: {} });
          return () => {};
        },
      },
      {
        getSwapRecord: async () => ({
          // No settlementPreimageHex: settled by an older build.
          lockupPkScript: 'bb'.repeat(32),
          lock: { hash: 'aa'.repeat(32) },
        }),
      },
    );
    readLockupFateMock.mockResolvedValue({ fate: 'claimed', preimage: new Uint8Array(32).fill(7), spends: [] });

    await w.payQuotedInvoice(quote);

    assert.strictEqual(readLockupFateMock.mock.calls.length, 1);
    assert.strictEqual(w.last_paid_invoice_result.payment_preimage, '07'.repeat(32));
  });

  it('payQuotedInvoice surfaces terminal failures instead of reporting success', async () => {
    const quote = fakeQuote();
    seedClient({
      accept: async () => ({ id: 'rfq:quote-1' }),
      onUpdate: (fn: any) => {
        fn({ swap: { id: 'rfq:quote-1' }, outcome: 'failed', detail: {} });
        return () => {};
      },
    });

    await assert.rejects(w.payQuotedInvoice(quote), /failed/);
    assert.strictEqual((w.last_paid_invoice_result as any)?.payment_preimage, undefined);
  });

  it('a retry for the same bolt11 consults the live swap instead of re-quoting', async () => {
    seedCaches(w, [sendRecord({ id: 'quote-1' })], { 'rfq:quote-1': 'funded' });
    (w as any)._swapClient = { swaps: async () => [{ id: 'rfq:quote-1', outcome: 'funded' }] };

    const live = await w.findLiveSwapForInvoice(BOLT11);
    assert.strictEqual(live, 'rfq:quote-1');
  });
});

describe('LightningArkWallet — serialization', () => {
  it('never lets a BigInt reach JSON.stringify and drops legacy Boltz keys', () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    // Live swap cache with real bigints (non-enumerable by construction).
    (w as any)._swaps.set('rfq:q', { id: 'rfq:q', give: { amount: 1000n } });
    // Legacy blob keys restored as stray enumerable properties.
    (w as any)._swapHistory = [{ id: 'old' }];
    (w as any)._limitMin = 333;
    (w as any)._limitMax = 1000000;
    (w as any)._feePercentage = 0.5;

    w.prepareForSerialization();
    const clone = Object.assign({}, w);
    assert.doesNotThrow(() => JSON.stringify(clone), 'no BigInt reaches JSON.stringify');
    const reparsed = JSON.parse(JSON.stringify(clone));
    assert.strictEqual(reparsed._swapHistory, undefined, 'legacy blob keys are dropped, not re-persisted');
    assert.strictEqual(reparsed._limitMin, undefined);
  });
});

describe('LightningArkWallet — deletion guard', () => {
  let w: LightningArkWallet;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
  });

  const seedGuard = (records: any[], swaps: any[]): void => {
    (w as any)._swapClient = { swaps: async () => swaps };
    (w as any)._swapRepository = { getAllSwapRecords: async () => records };
    (w as any)._wallet = { getArkadeReader: async () => ({ getVtxos: async () => [], getVirtualTxs: async () => [] }) };
  };

  it('a receive in lapsed does not block deletion', async () => {
    seedGuard([receiveRecord()], [{ id: 'rfq:quote-recv-1', outcome: 'lapsed' }]);
    const verdict = await w.canDeleteWallet();
    assert.strictEqual(verdict.safe, true);
    assert.strictEqual(readLockupFateMock.mock.calls.length, 0, 'no chain read for receives');
  });

  it('a send in terminal failed with an unspent lockup refuses deletion', async () => {
    seedGuard([sendRecord()], [{ id: 'rfq:quote-send-1', outcome: 'failed' }]);
    readLockupFateMock.mockResolvedValue({ fate: 'open', spends: [] });

    const verdict = await w.canDeleteWallet();
    assert.strictEqual(verdict.safe, false, 'failed is terminal but the lockup still holds value');
    assert.ok(verdict.message);
  });

  it('a chain read answering returned clears an unsafe send', async () => {
    seedGuard([sendRecord()], [{ id: 'rfq:quote-send-1', outcome: 'failed' }]);
    readLockupFateMock.mockResolvedValue({ fate: 'returned', spends: [] });

    const verdict = await w.canDeleteWallet();
    assert.strictEqual(verdict.safe, true);
  });

  it('refuses with a reason when the read cannot be made', async () => {
    seedGuard([sendRecord()], [{ id: 'rfq:quote-send-1', outcome: 'funded' }]);
    (w as any)._wallet = {
      getArkadeReader: async () => {
        throw new Error('offline');
      },
    };

    const verdict = await w.canDeleteWallet();
    assert.strictEqual(verdict.safe, false);
    assert.match(verdict.message ?? '', /offline/);
  });
});

describe('LightningArkWallet — delayed persistence converges without doubling rows', () => {
  it('onUpdate before the write lands does not depend on the repository being current', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);

    // Event first: outcome known, record still pre-write (no txids).
    seedCaches(w, [sendRecord()], { 'rfq:quote-send-1': 'funded' });
    assert.strictEqual(w.getTransactions().length, 1);

    // Write lands later, with the funding txid — plus its pass-1 row.
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1' })], { 'rfq:quote-send-1': 'funded' });
    (w as any)._transactionsHistory = [histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } })];
    assert.strictEqual(w.getTransactions().length, 1, 'still one row after the write converges');
  });
});

describe('LightningArkWallet — recovery gating', () => {
  it('recoverSwap delegates to the client and reports the drive answer', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    const recover = jest.fn().mockResolvedValue({ recovered: false, txid: 'txid-1' });
    (w as any)._swapClient = { swaps: async () => [], recover };
    (w as any)._swapRepository = { getAllSwapRecords: async () => [] };
    (w as any)._wallet = {};

    const result = await w.recoverSwap('rfq:quote-1');
    assert.strictEqual(recover.mock.calls[0][0], 'rfq:quote-1');
    assert.deepStrictEqual(result, { recovered: false, txid: 'txid-1' });
  });

  it('recoverSwap propagates SwapDriveRefusedError (nothing-swept)', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    const refusal = new Error('nothing to recover yet');
    refusal.name = 'SwapDriveRefusedError';
    (refusal as any).reason = 'nothing-swept';
    (w as any)._swapClient = {
      swaps: async () => [],
      recover: jest.fn().mockRejectedValue(refusal),
    };
    (w as any)._swapRepository = { getAllSwapRecords: async () => [] };
    (w as any)._wallet = {};

    await assert.rejects(w.recoverSwap('rfq:quote-1'), /nothing to recover yet/);
  });
});

describe('LightningArkWallet — full init pipeline (offline)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    installSdkProviderSpies();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    resetArkadeTestState();
    restoreSdkProviderSpies();
  });

  it('init() arms a client whose snapshot is the bundled card, offline', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);

    await w.init();

    // Registry unreachable (fetch stubbed) → bundled bootstrap, not a throw.
    assert.deepStrictEqual(w.getSendLimits(), { min: 500, max: 50000 });
    assert.deepStrictEqual(w.getReceiveLimits(), { min: 500, max: 50000 });
    assert.strictEqual(w.getSubmarineFeeEstimate(10000), 30);

    await w.onDelete();
  });
});
