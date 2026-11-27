/**
 * H30 · Characterization of the wallet's history projection, written against
 * the code before the extraction and kept unchanged after it: history items
 * become list transactions, pending sends merge with the history, and the
 * pending debit counts once. Fixed inputs and a fixed clock.
 */
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import type { Transaction } from '../../class/wallets/types';

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const NOW_MS = Date.UTC(2026, 10, 26, 12, 0, 0);
const NOW = Math.floor(NOW_MS / 1000);

const item = (over: Record<string, unknown>) => ({
  isSent: false,
  fee: '0.001',
  assets: [{ assetName: 'XNA', satoshis: 150000000n, value: '1.5' }],
  blockHeight: 100,
  transactionId: 'aa'.repeat(32),
  ...over,
});

const tx = (txid: string, value: bigint, confirmations: number, timestamp = NOW): Transaction =>
  ({
    txid,
    hash: txid,
    version: 0,
    size: 0,
    vsize: 0,
    weight: 0,
    locktime: 0,
    inputs: [],
    outputs: [],
    blockhash: '',
    confirmations,
    time: timestamp,
    blocktime: timestamp,
    timestamp,
    value,
  }) as unknown as Transaction;

/** The wallet with its internals reachable: the characterization reads the same state the class keeps. */
function wallet(): any {
  return NeuraiHDWallet.forNetwork('testnet', WORDS);
}

beforeAll(() => {
  jest.useFakeTimers({ now: NOW_MS });
});
afterAll(() => {
  jest.useRealTimers();
});

describe('H30 · history projection', () => {
  it('turns a received XNA item into a confirmed list entry', () => {
    const projected = wallet()._historyItemToTransaction(item({}), [], { 100: 1700000000 }, 105);
    expect(projected).toEqual({
      txid: 'aa'.repeat(32),
      hash: 'aa'.repeat(32),
      version: 0,
      size: 0,
      vsize: 0,
      weight: 0,
      locktime: 0,
      inputs: [],
      outputs: [],
      blockhash: '',
      confirmations: 6,
      time: 1700000000,
      blocktime: 1700000000,
      timestamp: 1700000000,
      value: 150000000n,
      assetName: undefined,
      assetAmount: undefined,
    });
  });

  it('signs sent amounts, keeps asset movements and dates mempool items now', () => {
    const sent = wallet()._historyItemToTransaction(
      item({
        isSent: true,
        blockHeight: 0,
        assets: [
          { assetName: 'XNA', satoshis: 1000n, value: '0.00001' },
          { assetName: 'TOKEN', satoshis: 100000000n, value: '-1' },
        ],
      }),
      [],
      {},
      0,
    );
    expect(sent.value).toBe(-1000n);
    expect(sent.confirmations).toBe(0);
    expect(sent.timestamp).toBe(NOW);
    expect(sent.assetName).toBe('TOKEN');
    expect(sent.assetAmount).toBe('-1');
  });

  it('uses one confirmation when the tip is unknown or behind, and the clock when the block time is missing', () => {
    const w = wallet();
    expect(w._historyItemToTransaction(item({ blockHeight: 50 }), [], {}, 0).confirmations).toBe(1);
    expect(w._historyItemToTransaction(item({ blockHeight: 50 }), [], {}, 40).confirmations).toBe(1);
    expect(w._historyItemToTransaction(item({ blockHeight: 50 }), [], {}, 40).timestamp).toBe(NOW);
    expect(w._historyItemToTransaction(item({ assets: [] }), [], {}, 0).value).toBe(0n);
  });

  it('shows pending sends first until the history has the same txid', () => {
    const w = wallet();
    w._txCache = [tx('c1', 5n, 3)];
    w.addPendingTx('p1', -10n);
    w.addPendingTx('p2', -20n);
    expect(w.getTransactions().map((t: Transaction) => t.txid)).toEqual(['p2', 'p1', 'c1']);

    w._txCache = [tx('p1', -10n, 0), tx('c1', 5n, 3)];
    expect(w.getTransactions().map((t: Transaction) => t.txid)).toEqual(['p2', 'p1', 'c1']);
    expect(w.getTransactions().filter((t: Transaction) => t.txid === 'p1')).toHaveLength(1);
  });

  it('keeps subtracting a pending send until it confirms, once, and drops it after the TTL', () => {
    const w = wallet();
    w.unconfirmed_balance = 0n;
    w._txCache = [];
    w.addPendingTx('p1', -10n);
    expect(w.getUnconfirmedBalance()).toBe(-10n);

    w.unconfirmed_balance = -10n; // the server also reports the same spend
    expect(w.getUnconfirmedBalance()).toBe(-10n);
    w.unconfirmed_balance = -25n;
    expect(w.getUnconfirmedBalance()).toBe(-25n);

    w._txCache = [tx('p1', -10n, 1)]; // confirmed: no longer pending
    w.unconfirmed_balance = 0n;
    expect(w.getUnconfirmedBalance()).toBe(0n);
    expect(w._pendingTxs).toEqual([]);

    w.addPendingTx('old', -5n);
    w._pendingTxs[0].timestamp = NOW - 25 * 60 * 60; // older than the 24 h TTL
    expect(w.getUnconfirmedBalance()).toBe(0n);
    expect(w._pendingTxs).toEqual([]);
  });

  it('records an asset send as a negative asset amount', () => {
    const w = wallet();
    w.addPendingTx('pa', -1000n, { name: 'TOKEN', amount: '2.5' });
    expect(w._pendingTxs[0]).toMatchObject({ assetName: 'TOKEN', assetAmount: '-2.5', value: -1000n, timestamp: NOW });
  });
});
