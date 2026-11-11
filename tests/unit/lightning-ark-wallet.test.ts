import assert from 'assert';

import { ArkAddress, TxType } from '@arkade-os/sdk';
import bolt11 from 'bolt11';
import { sha256 } from '@noble/hashes/sha256';
import { ArkRealmSchemas, ARK_REALM_SCHEMA_VERSION } from '@arkade-os/sdk/repositories/realm';
import { AssetSwapRealmSchemas } from '@arkade-os/swap/repositories/realm';
import { SwapPaymentFailedError, UnsupportedRoute } from '@arkade-os/swap';

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

const seedCaches = (w: LightningArkWallet, records: any[], outcomes: Record<string, string>): void => {
  (w as any)._swapRecords = records;
  (w as any)._outcomes = new Map(Object.entries(outcomes));
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

  it('getSwapById still resolves its subject after settlement', () => {
    seedCaches(w, [sendRecord({ fundingTxid: 'funding-txid-1' })], { 'rfq:quote-send-1': 'paid' });
    (w as any)._transactionsHistory = [histTx({ key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'funding-txid-1' } })];
    // The row list no longer matters: the lookup reads the record cache directly.
    w.getTransactions();

    const view = w.getSwapById('rfq:quote-send-1');
    assert.ok(view, 'resolves across settlement');
    assert.strictEqual(view!.outcome, 'paid');
    assert.strictEqual(view!.amountSats, 1020);
  });

  it('never reads a send swap invoice as one this wallet generated', () => {
    seedCaches(w, [sendRecord()], { 'rfq:quote-send-1': 'funded' });
    assert.strictEqual(w.isInvoiceGeneratedByWallet('lnbc10n1send'), false);
  });
});

const marketLeg = (asset: string, min: bigint, max: bigint) => ({ asset, decimals: 8, limits: { min, max } });
const lightningMarket = (min: bigint, max: bigint) => ({
  legs: [marketLeg('arkade:bitcoin/slip44:0', 1n, 9n), marketLeg('bolt11:bitcoin/slip44:0', min, max)],
});

describe('LightningArkWallet — send limits', () => {
  it('spans the Lightning legs of the solvers markets and ignores other corridors', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._swapClient = {
      markets: async () => [
        lightningMarket(500n, 50000n),
        lightningMarket(300n, 20000n),
        { legs: [marketLeg('arkade:bitcoin/slip44:0', 1n, 9n), marketLeg('onchain:bitcoin/slip44:0', 10n, 99999999n)] },
      ],
    };
    assert.deepStrictEqual(await w.getSendLimits(), { min: 300, max: 50000 });
  });
});

describe('LightningArkWallet — quoting a BOLT11', () => {
  let w: LightningArkWallet;
  const INVOICE = bolt11.sign(
    bolt11.encode({
      network: { bech32: 'bc', pubKeyHash: 0, scriptHash: 5, validWitnessVersions: [0, 1] },
      satoshis: 1000,
      timestamp: Math.floor(Date.now() / 1000),
      tags: [
        { tagName: 'payment_hash', data: 'cd'.repeat(32) },
        { tagName: 'expire_time', data: 3600 },
      ],
    }),
    '11'.repeat(32),
  ).paymentRequest!;

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._wallet = {};
  });

  it('names the solvers bounds when the amount is outside them', async () => {
    (w as any)._swapClient = {
      swaps: async () => [],
      quote: async () => {
        throw new UnsupportedRoute('no eligible market');
      },
      markets: async () => [lightningMarket(5000n, 50000n)],
    };
    await assert.rejects(w.quoteSend(INVOICE), /Minimum you can send is 5000 sat/);
  });

  it('refuses to quote an invoice a live swap is already paying', async () => {
    const quote = jest.fn();
    (w as any)._swapClient = {
      swaps: async () => [
        { id: 'rfq:q', outcome: 'funded', route: { take: { instrument: { kind: 'invoice', bolt11: INVOICE.toUpperCase() } } } },
      ],
      quote,
    };
    await assert.rejects(w.quoteSend(INVOICE), /already has a live swap \(rfq:q\)/);
    assert.strictEqual(quote.mock.calls.length, 0);
  });
});

describe('LightningArkWallet — sending a quote', () => {
  let w: LightningArkWallet;
  const settling = (settled: () => Promise<unknown>): any => ({
    railId: 'lightning',
    amount: 1000,
    fee: 20,
    total: 1020,
    send: async () => ({ settled }),
  });
  const paid = async () => ({ railId: 'lightning', swapId: 'rfq:quote-send-1' });

  beforeEach(() => {
    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    (w as any)._wallet = { getArkadeReader: async () => ({}) };
    (w as any)._swapClient = { swaps: async () => [] };
  });

  const seedRecord = (record: unknown): void => {
    (w as any)._swapRepository = { getSwapRecordsPage: async () => ({ items: [] }), getSwapRecord: async () => record };
  };

  it('records the preimage, payment hash and invoice of a settled Lightning payment', async () => {
    seedRecord(sendRecord({ settlementPreimageHex: 'ab'.repeat(32) }));
    await w.sendQuote(settling(paid));
    assert.strictEqual(w.last_paid_invoice_result?.payment_preimage, 'ab'.repeat(32));
    assert.strictEqual(w.last_paid_invoice_result?.payment_hash, 'aa'.repeat(32));
    assert.strictEqual(w.last_paid_invoice_result?.payment_request, 'lnbc10n1send');
  });

  it('backfills the preimage via readLockupFate when the record predates the receipt', async () => {
    seedRecord(sendRecord());
    readLockupFateMock.mockResolvedValue({ fate: 'claimed', preimage: new Uint8Array(32).fill(7), spends: [] });
    await w.sendQuote(settling(paid));
    assert.strictEqual(readLockupFateMock.mock.calls.length, 1);
    assert.strictEqual(w.last_paid_invoice_result?.payment_preimage, '07'.repeat(32));
  });

  it('reports a swap that ended without paying instead of success', async () => {
    seedRecord(undefined);
    const refunded = new SwapPaymentFailedError('lightning', 'refunded', { id: 'rfq:quote-send-1' } as any);
    await assert.rejects(
      w.sendQuote(
        settling(async () => {
          throw refunded;
        }),
      ),
      /Lightning payment was refunded/,
    );
    assert.strictEqual((w.last_paid_invoice_result as any)?.payment_preimage, undefined);
  });
});

describe('LightningArkWallet — serialization', () => {
  it('never lets a BigInt reach JSON.stringify and drops legacy Boltz keys', () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    // Live swap cache with real bigints (non-enumerable by construction).
    (w as any)._swapClient = { held: { id: 'rfq:q', give: { amount: 1000n } } };
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
    (w as any)._swapRepository = { getSwapRecordsPage: async () => ({ items: records }) };
    (w as any)._wallet = { getArkadeReader: async () => ({ getVtxos: async () => [], getVirtualTxs: async () => [] }) };
  };

  it('refuses deletion when the swap records cannot be read, unless forced', async () => {
    seedGuard([], []);
    (w as any)._swapRepository = {
      getSwapRecordsPage: async () => {
        throw new Error('realm closed');
      },
    };
    assert.strictEqual((await w.canDeleteWallet()).safe, false);
    assert.strictEqual((await w.canDeleteWallet(true)).safe, true);
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
    (w as any)._swapRepository = { getSwapRecordsPage: async () => ({ items: [] }) };
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
    (w as any)._swapRepository = { getSwapRecordsPage: async () => ({ items: [] }) };
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
    assert.deepStrictEqual(await w.getSendLimits(), { min: 500, max: 100000 });
    const regtestInvoice = bolt11.sign(
      bolt11.encode({
        network: { bech32: 'bcrt', pubKeyHash: 111, scriptHash: 196, validWitnessVersions: [0, 1] },
        satoshis: 1000,
        timestamp: Math.floor(Date.now() / 1000),
        tags: [
          { tagName: 'payment_hash', data: 'cd'.repeat(32) },
          { tagName: 'expire_time', data: 3600 },
        ],
      }),
      '11'.repeat(32),
    ).paymentRequest!;
    await assert.rejects(w.quoteSend(regtestInvoice), /regtest invoice and the wallet is on bitcoin/);

    // Offline, the SDK's wallet.dispose() drains its background loops on
    // timers, so the fake clock must advance for onDelete() to settle.
    const deletion = { done: false };
    const deleting = w.onDelete().finally(() => {
      deletion.done = true;
    });
    for (let i = 0; i < 100 && !deletion.done; i++) await jest.advanceTimersByTimeAsync(250);
    await deleting;
  });
});

describe('LightningArkWallet LNURL receive', () => {
  const ARK_ADDRESS = new ArkAddress(new Uint8Array(32).fill(2), new Uint8Array(32).fill(3), 'ark').encode();
  const BOARDING_ADDRESS = 'bc1pboardingaddress';
  const DOMAIN = 'lnurl.arkade.sh';
  const PREIMAGE = 'ab'.repeat(32);
  const named = (username: string, extra: Record<string, unknown> = {}) => ({
    username,
    handle: username,
    lightningAddress: `${username}@${DOMAIN}`,
    domain: DOMAIN,
    status: 'active',
    nameless: false,
    sessionLnurl: null,
    ...extra,
  });
  const makeInvoice = (timestamp = Math.floor(Date.now() / 1000)) =>
    bolt11.sign(
      bolt11.encode({
        network: { bech32: 'bc', pubKeyHash: 0, scriptHash: 5, validWitnessVersions: [0, 1] },
        satoshis: 1000,
        timestamp,
        tags: [
          { tagName: 'payment_hash', data: Buffer.from(sha256(Buffer.from(PREIMAGE, 'hex'))).toString('hex') },
          { tagName: 'description', data: 'lnurl' },
          { tagName: 'expire_time', data: 600 },
        ],
      }),
      '11'.repeat(32),
    ).paymentRequest!;

  const originalFetch = global.fetch;
  let w: LightningArkWallet;
  let send: jest.Mock;
  let server: {
    addresses: any[];
    paymentOptions: any[] | undefined;
    invoice: string;
    destination: string | undefined;
    verify: Record<string, unknown>;
    down: boolean;
    calls: { method: string; url: string; body?: any }[];
  };

  const payRequest = () => ({
    tag: 'payRequest',
    callback: 'https://lnurl.arkade.sh/lnurl/session-id/callback',
    minSendable: 1000,
    maxSendable: 100000000,
    metadata: '[["text/plain","lnurl"]]',
    commentAllowed: 10,
    paymentOptions: server.paymentOptions,
  });

  beforeEach(() => {
    server = {
      addresses: [],
      paymentOptions: [
        { id: 'arkade', type: 'arkade', minSendable: 1000, maxSendable: 200000000 },
        { id: 'offline-swap', type: 'lightning', minSendable: 500000, maxSendable: 50000000 },
      ],
      invoice: makeInvoice(),
      destination: undefined,
      verify: { status: 'OK', settled: false, preimage: null },
      down: false,
      calls: [],
    };
    global.fetch = jest.fn(async (input: any, init: any) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      server.calls.push({ method, url, body: init?.body && JSON.parse(init.body) });
      if (server.down) throw new TypeError('Network request failed');
      const { pathname } = new URL(url);
      let body: unknown;
      if (pathname === '/lnurl/address' && method === 'GET') body = server.addresses;
      else if (pathname === '/lnurl/address') body = named('merry-comet');
      else if (pathname.endsWith('/arkade')) body = {};
      else if (method === 'PATCH') body = named('quiet-marlin', { sessionLnurl: `https://${DOMAIN}/lnurl/sid` });
      else if (pathname.endsWith('/callback')) {
        body = server.destination
          ? { paymentOption: 'arkade', paymentDestination: server.destination }
          : { pr: server.invoice, routes: [], verify: 'https://lnurl.arkade.sh/verify/1' };
      } else if (pathname === '/verify/1') body = { ...server.verify, pr: server.invoice };
      else body = payRequest();
      return new Response(JSON.stringify(body), { status: 200 });
    }) as any;

    w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    send = jest.fn(async () => 'txid');
    (w as any)._wallet = {
      identity: w._getIdentity(),
      getAddress: async () => ARK_ADDRESS,
      getBoardingAddress: async () => BOARDING_ADDRESS,
      send,
    };
    jest.spyOn(w, 'fetchTransactions').mockResolvedValue(undefined as any);
  });

  const claimPublicKey = async () => Buffer.from(await w._getIdentity().compressedPublicKey()).toString('hex');
  const claims = () => server.calls.filter(c => c.method === 'POST' && c.url.endsWith('/lnurl/address'));
  const binds = () => server.calls.filter(c => c.url.endsWith('/arkade'));

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('claims a server-named address bound to the Arkade and boarding addresses once, and asks for the Lightning rail', async () => {
    const first = await w.addInvoice(1000, 'coffee');
    await w.addInvoice(1000, 'tea');

    assert.strictEqual(first, server.invoice);
    assert.strictEqual(await w.getLightningAddress(), `merry-comet@${DOMAIN}`);
    assert.strictEqual(claims().length, 1);
    assert.strictEqual(claims()[0].body.nameless, undefined);
    assert.strictEqual(claims()[0].body.username, undefined);
    assert.strictEqual(binds().length, 1);
    assert.ok(binds()[0].url.endsWith('/lnurl/address/merry-comet/arkade'));
    assert.strictEqual(binds()[0].body.arkadeAddress, ARK_ADDRESS);
    assert.strictEqual(binds()[0].body.boardingAddress, BOARDING_ADDRESS);
    const callback = server.calls.find(c => c.url.includes('/callback'));
    assert.ok(callback?.url.includes('paymentOption=offline-swap'));
    assert.ok(callback?.url.includes('amount=1000000'));
  });

  it('adopts the address it already owns, re-binding it when the boarding address moved', async () => {
    const bound = { arkadeAddress: ARK_ADDRESS, claimPublicKey: await claimPublicKey(), createdAt: 0 };
    server.addresses = [named('merry-comet', { ...bound, boardingAddress: 'bc1pold' })];

    assert.strictEqual(await w.getLightningAddress(), `merry-comet@${DOMAIN}`);
    assert.strictEqual(claims().length, 0);
    assert.strictEqual(binds().length, 1);
    assert.strictEqual(binds()[0].body.boardingAddress, BOARDING_ADDRESS);
  });

  it('names a nameless receiver from an earlier build in place instead of claiming another', async () => {
    server.addresses = [
      { ...named('sid', { username: null, lightningAddress: null, nameless: true }), sessionLnurl: `https://${DOMAIN}/lnurl/sid` },
    ];

    assert.strictEqual(await w.getLightningAddress(), `quiet-marlin@${DOMAIN}`);
    assert.strictEqual(claims().length, 0);
    const upgrade = server.calls.find(c => c.method === 'PATCH');
    assert.ok(upgrade?.url.includes('/lnurl/address/sid'));
    assert.deepStrictEqual(upgrade?.body, {});
  });

  it('claims once when the receive screen asks for the address and the limits together', async () => {
    await Promise.all([w.getLightningAddress(), w.getReceiveLimits()]);
    assert.strictEqual(claims().length, 1);
  });

  it('re-binds the address when the Arkade address rotates mid-session', async () => {
    assert.strictEqual(await w.getLightningAddress(), `merry-comet@${DOMAIN}`);
    const bound = { arkadeAddress: ARK_ADDRESS, claimPublicKey: await claimPublicKey(), boardingAddress: BOARDING_ADDRESS, createdAt: 0 };
    server.addresses = [named('merry-comet', bound)];
    const rotated = new ArkAddress(new Uint8Array(32).fill(2), new Uint8Array(32).fill(4), 'ark').encode();
    (w as any)._wallet.getAddress = async () => rotated;

    assert.strictEqual(await w.getLightningAddress(), `merry-comet@${DOMAIN}`);
    assert.strictEqual(claims().length, 1);
    assert.strictEqual(binds().length, 2);
    assert.strictEqual(binds()[1].body.arkadeAddress, rotated);
  });

  it('refuses when the server offers no Lightning rail', async () => {
    server.paymentOptions = [{ id: 'arkade', type: 'arkade' }];
    await assert.rejects(() => w.addInvoice(1000, ''), /unavailable/);
    assert.strictEqual(await w.getReceiveLimits(), null);
  });

  it('retries the claim after a failure rather than caching it', async () => {
    server.down = true;
    await assert.rejects(() => w.addInvoice(1000, ''));
    assert.strictEqual(await w.getReceiveLimits(), null);

    server.down = false;
    assert.strictEqual(await w.addInvoice(1000, ''), server.invoice);
  });

  it("reads the Lightning rail's bounds in sats", async () => {
    const limits = await w.getReceiveLimits();
    assert.strictEqual(limits?.min, 500);
    assert.strictEqual(limits?.max, 50000);
  });

  it('shows the invoice to the receive poll only, and marks it paid once verify proves it', async () => {
    const invoice = await w.addInvoice(1000, 'coffee');

    let [row] = await w.getUserInvoices();
    assert.strictEqual(row.payment_request, invoice);
    assert.strictEqual(row.ispaid, false);
    assert.strictEqual(row.amt, 1000);
    assert.strictEqual(w.isInvoiceGeneratedByWallet(invoice), true);
    assert.strictEqual(w.getTransactions().length, 0, 'history shows the VTXO, not the invoice');

    // A preimage that does not hash to the invoice is not settlement.
    server.verify = { status: 'OK', settled: true, preimage: 'cd'.repeat(32) };
    [row] = await w.getUserInvoices();
    assert.strictEqual(row.ispaid, false);

    server.verify = { status: 'OK', settled: true, preimage: PREIMAGE };
    [row] = await w.getUserInvoices();
    assert.strictEqual(row.ispaid, true);
    assert.strictEqual(row.payment_preimage, PREIMAGE);

    const asked = server.calls.length;
    await w.getUserInvoices();
    assert.strictEqual(server.calls.length, asked, 'a paid invoice is not asked about again');
  });

  it('stops asking about an expired invoice', async () => {
    await w.addInvoice(1000, '');
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 601_000);

    const asked = server.calls.length;
    const [row] = await w.getUserInvoices();
    assert.strictEqual(server.calls.length, asked);
    assert.strictEqual(row.ispaid, false);
  });

  describe('sending to an LNURL over its Arkade rail', () => {
    const PAYEE = new ArkAddress(new Uint8Array(32).fill(2), new Uint8Array(32).fill(9), 'ark').encode();

    beforeEach(() => {
      (w as any)._swapClient = { swaps: async () => [] };
    });

    it('quotes the Arkade rail and sends the sats to the destination it returns', async () => {
      server.destination = PAYEE;

      const quote = await w.quoteSend('bob@example.com', { amountSat: 1000, comment: 'hi' });
      assert.strictEqual(quote.railId, 'lnurl-arkade');
      assert.strictEqual(quote.fee, 0);
      await w.sendQuote(quote);

      assert.deepStrictEqual(send.mock.calls[0][0], { address: PAYEE, amount: 1000 });
      const callback = server.calls.find(c => c.url.includes('/callback'));
      assert.ok(callback?.url.includes('paymentOption=arkade'));
      assert.ok(callback?.url.includes('comment=hi'));
    });

    it('refuses to quote without a usable Arkade rail', async () => {
      server.destination = PAYEE;
      for (const paymentOptions of [
        [{ id: 'offline-swap', type: 'lightning' }],
        [{ id: 'arkade', type: 'arkade', available: false }],
        [{ id: 'arkade', type: 'arkade', minSendable: 5000000, maxSendable: 6000000 }],
        undefined,
      ]) {
        server.paymentOptions = paymentOptions;
        await assert.rejects(w.quoteSend('bob@example.com', { amountSat: 1000 }));
      }
      assert.strictEqual(send.mock.calls.length, 0);
    });

    it('refuses a destination on another operator or a malformed one', async () => {
      for (const destination of [
        new ArkAddress(new Uint8Array(32).fill(7), new Uint8Array(32).fill(9), 'ark').encode(),
        'bc1qnotanarkaddress',
      ]) {
        server.destination = destination;
        await assert.rejects(w.quoteSend('bob@example.com', { amountSat: 1000 }));
      }
      assert.strictEqual(send.mock.calls.length, 0);
    });

    it('refuses when the payee cannot be reached', async () => {
      server.down = true;
      await assert.rejects(w.quoteSend('bob@example.com', { amountSat: 1000 }));
      assert.strictEqual(send.mock.calls.length, 0);
    });

    it('rejects a failed send instead of reporting success', async () => {
      server.destination = PAYEE;
      send.mockRejectedValueOnce(new Error('insufficient funds'));
      const quote = await w.quoteSend('bob@example.com', { amountSat: 1000 });
      await assert.rejects(w.sendQuote(quote), /insufficient funds/);
    });
  });

  it('keeps LNURL state out of the serialized wallet', async () => {
    await w.addInvoice(1000, '');
    const json = JSON.parse(JSON.stringify(w));
    assert.strictEqual('_lnurlInvoices' in json, false);
    assert.strictEqual('_lnurlReceiver' in json, false);
  });
});
