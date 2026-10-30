/**
 * Unit tests for the BlueElectrum connection lifecycle / state machine.
 *
 * Exercises the bits that have no isolated coverage today: coalescing of
 * concurrent `ensureConnected()` callers, the generation counter that lets
 * `forceDisconnect()`/`setDisabled()` abort an in-flight connect, ping flips,
 * and the swap-check that guards against a stale client clobbering newer state.
 */

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { Alert } from 'react-native';
import { runAfterAlertDismissed } from '../../components/Alert';

// Jest hoists these above the import above. The factories close over `globalThis`
// so the test body can swap implementations per-test without re-mocking.
jest.mock('electrum-client', () => {
  return jest.fn().mockImplementation(() => (globalThis as any).__createNextFakeClient());
});

jest.mock('../../components/Alert', () => {
  const actual = jest.requireActual('../../components/Alert');
  return {
    ...actual,
    __esModule: true,
    default: async (...args: unknown[]) => {
      await (globalThis as any).__alertPresentationGate;
      return actual.default(...args);
    },
  };
});

type FakeClient = {
  initElectrumDeferred: Deferred<[string, string]>;
  headersDeferred: Deferred<{ height: number }>;
  pingDeferred: Deferred<unknown> | null;
  pingShouldReject: boolean;
  closed: boolean;
  onError?: (e: { message: string }) => void;
  host: string;
  port: number;
  initElectrum: jest.Mock;
  blockchainHeaders_subscribe: jest.Mock;
  blockchainScripthash_getHistory: jest.Mock;
  blockchainScripthash_getHistoryBatch: jest.Mock;
  blockchainScripthash_getBalance: jest.Mock;
  blockchainScripthash_getBalanceBatch: jest.Mock;
  blockchainScripthash_listunspent: jest.Mock;
  blockchainScripthash_listunspentBatch: jest.Mock;
  blockchainTransaction_getBatch: jest.Mock;
  blockchainTransaction_get: jest.Mock;
  server_ping: jest.Mock;
  close: jest.Mock;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolveOuter!: (v: T) => void;
  let rejectOuter!: (e: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolveOuter = resolve;
    rejectOuter = reject;
  });
  return { promise, resolve: resolveOuter, reject: rejectOuter };
}

function makeFakeClient(host = 'fake.host', port = 50002): FakeClient {
  const fc: Partial<FakeClient> = {
    initElectrumDeferred: deferred<[string, string]>(),
    headersDeferred: deferred<{ height: number }>(),
    pingDeferred: null,
    pingShouldReject: false,
    closed: false,
    host,
    port,
  };
  fc.initElectrum = jest.fn(() => fc.initElectrumDeferred!.promise);
  fc.blockchainHeaders_subscribe = jest.fn(() => fc.headersDeferred!.promise);
  fc.blockchainScripthash_getHistory = jest.fn();
  fc.blockchainScripthash_getHistoryBatch = jest.fn();
  fc.blockchainScripthash_getBalance = jest.fn();
  fc.blockchainScripthash_getBalanceBatch = jest.fn();
  fc.blockchainScripthash_listunspent = jest.fn();
  fc.blockchainScripthash_listunspentBatch = jest.fn();
  fc.blockchainTransaction_getBatch = jest.fn();
  fc.blockchainTransaction_get = jest.fn();
  fc.server_ping = jest.fn(() => {
    fc.pingDeferred = deferred<unknown>();
    if (fc.pingShouldReject) {
      fc.pingDeferred.reject(new Error('ping failed'));
    } else {
      fc.pingDeferred.resolve(undefined);
    }
    return fc.pingDeferred.promise;
  });
  fc.close = jest.fn(() => {
    fc.closed = true;
  });
  return fc as FakeClient;
}

const created: FakeClient[] = [];
let rejectConnections = false;
(globalThis as any).__createNextFakeClient = () => {
  const c = makeFakeClient();
  if (rejectConnections) c.initElectrum.mockRejectedValue(new Error('connection failed'));
  created.push(c);
  return c;
};

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function flush(times = 4) {
  for (let i = 0; i < times; i++) await tick();
}

function resolveLastConnect(serverName = 'Fulcrum 1.10.0') {
  const c = created[created.length - 1];
  c.initElectrumDeferred.resolve([serverName, '1.4']);
  c.headersDeferred.resolve({ height: 1000 });
}

describe('BlueElectrum lifecycle', () => {
  beforeEach(async () => {
    BlueElectrum.forceDisconnect();
    await BlueElectrum.setDisabled(false);
    created.length = 0;
    rejectConnections = false;
    (globalThis as any).__alertPresentationGate = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('coalescing', () => {
    it('two concurrent ensureConnected() share one in-flight attempt', async () => {
      const p1 = BlueElectrum.ensureConnected();
      const p2 = BlueElectrum.ensureConnected();

      await flush();
      expect(created.length).toBe(1);

      resolveLastConnect();
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe(true);
      expect(r2).toBe(true);
      expect(BlueElectrum.getConnectionState()).toBe('connected');
      expect(created.length).toBe(1);
    });
  });

  describe('failure alert presentation', () => {
    it('does not resolve callers until the async failure alert has been presented', async () => {
      jest.useFakeTimers();
      rejectConnections = true;
      const presentationGate = deferred<void>();
      (globalThis as any).__alertPresentationGate = presentationGate.promise;
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const afterDismiss = jest.fn();

      const connection = BlueElectrum.ensureConnected({
        showAlertOnFailure: true,
      });
      let resolved = false;
      const handoff = connection.then(result => {
        resolved = true;
        expect(runAfterAlertDismissed(afterDismiss)).toBe(true);
        return result;
      });
      await jest.advanceTimersByTimeAsync(2_000);

      expect(alertSpy).not.toHaveBeenCalled();
      expect(resolved).toBe(false);

      presentationGate.resolve();
      await expect(handoff).resolves.toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(afterDismiss).not.toHaveBeenCalled();
      await alertSpy.mock.calls[0][2]?.[2].onPress?.();
      await jest.advanceTimersByTimeAsync(500);
      expect(afterDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('forceDisconnect during in-flight connect', () => {
    it('aborts cleanly; state ends "disconnected" even if the socket resolves later', async () => {
      const p = BlueElectrum.ensureConnected();
      await flush();
      expect(created.length).toBe(1);
      expect(BlueElectrum.getConnectionState()).toBe('connecting');

      BlueElectrum.forceDisconnect();
      // Late resolve from the doomed attempt must not flip state back to 'connected'.
      resolveLastConnect();

      const result = await p;
      expect(result).toBe(false);
      expect(BlueElectrum.getConnectionState()).toBe('disconnected');
    });
  });

  describe('setDisabled(true) during in-flight connect', () => {
    it('bumps generation, tears down the socket, leaves state "disabled"', async () => {
      const p = BlueElectrum.ensureConnected();
      await flush();
      expect(created.length).toBe(1);
      expect(BlueElectrum.getConnectionState()).toBe('connecting');

      await BlueElectrum.setDisabled(true);
      // Late resolve from the doomed attempt must not flip state back to 'connected'.
      resolveLastConnect();

      const result = await p;
      expect(result).toBe(false);
      expect(BlueElectrum.getConnectionState()).toBe('disabled');
      expect(created[0].close).toHaveBeenCalled();
    });
  });

  describe('ping fast-path', () => {
    it('successful ping on existing client returns true without a new connect', async () => {
      // First, establish a connection.
      const connectPromise = BlueElectrum.ensureConnected();
      await flush();
      resolveLastConnect();
      await connectPromise;
      expect(BlueElectrum.getConnectionState()).toBe('connected');

      // Now ensureConnected() should ping the existing client, not construct another.
      const second = await BlueElectrum.ensureConnected();
      expect(second).toBe(true);
      expect(created.length).toBe(1);
      expect(created[0].server_ping).toHaveBeenCalled();
    });

    it('ping() on a connected client flipping to reject moves state to "disconnected"', async () => {
      const connectPromise = BlueElectrum.ensureConnected();
      await flush();
      resolveLastConnect();
      await connectPromise;
      expect(BlueElectrum.getConnectionState()).toBe('connected');

      created[0].pingShouldReject = true;
      const ok = await BlueElectrum.ping();

      expect(ok).toBe(false);
      expect(BlueElectrum.getConnectionState()).toBe('disconnected');
    });
  });

  describe('subscribeConnectionState', () => {
    it('notifies on transitions and stops after unsubscribe', async () => {
      const seen: string[] = [];
      const unsub = BlueElectrum.subscribeConnectionState(s => seen.push(s));

      const p = BlueElectrum.ensureConnected();
      await flush();
      expect(seen).toContain('connecting');

      resolveLastConnect();
      await p;
      expect(seen).toContain('connected');

      unsub();
      BlueElectrum.forceDisconnect();
      // After unsubscribe, the 'disconnected' transition should not be recorded.
      expect(seen[seen.length - 1]).toBe('connected');
    });
  });

  describe('isConnected / getConnectionState agree with the machine', () => {
    it('both reflect the current state', async () => {
      expect(BlueElectrum.isConnected()).toBe(false);
      expect(BlueElectrum.getConnectionState()).toBe('disconnected');

      const p = BlueElectrum.ensureConnected();
      await flush();
      resolveLastConnect();
      await p;

      expect(BlueElectrum.isConnected()).toBe(true);
      expect(BlueElectrum.getConnectionState()).toBe('connected');
    });
  });

  describe('getConfirmedBlockHeight', () => {
    const TEST_ADDRESS = 'bc1qe7q08prc2spln2l7qdvvlcgqxm9za9z7mjnpzc';
    const TX_HASH = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    async function connectAtTip(height: number) {
      const connectPromise = BlueElectrum.ensureConnected();
      await flush();
      const client = created[created.length - 1];
      client.initElectrumDeferred.resolve(['Fulcrum 1.10.0', '1.4']);
      client.headersDeferred.resolve({ height });
      await connectPromise;
      return client;
    }

    async function seedTxHeightCache(client: FakeClient, txHash: string, height: number) {
      client.blockchainScripthash_getHistory.mockResolvedValue([{ tx_hash: txHash, height }]);
      await BlueElectrum.getTransactionsByAddress(TEST_ADDRESS);
    }

    it('returns null for implausible height without caching', async () => {
      const client = await connectAtTip(1000);

      client.blockchainTransaction_get.mockResolvedValue({
        confirmations: 2000,
      });

      const result = await BlueElectrum.getConfirmedBlockHeight('deadbeef');
      expect(result).toBeNull();
    });

    it('returns cached height when cache is within tip', async () => {
      const client = await connectAtTip(1000);
      await seedTxHeightCache(client, TX_HASH, 995);

      const result = await BlueElectrum.getConfirmedBlockHeight(TX_HASH);
      expect(result).toEqual({ height: 995, tip: 1000 });
      expect(client.blockchainTransaction_get).not.toHaveBeenCalled();
    });

    it('refreshes tip when cached height is slightly ahead of TTL tip', async () => {
      const client = await connectAtTip(1000);
      await seedTxHeightCache(client, TX_HASH, 1001);

      client.blockchainHeaders_subscribe.mockResolvedValue({ height: 1001 });

      const result = await BlueElectrum.getConfirmedBlockHeight(TX_HASH);
      expect(result).toEqual({ height: 1001, tip: 1001 });
      expect(client.blockchainTransaction_get).not.toHaveBeenCalled();
    });

    it('discards poisoned cache and fetches height from server', async () => {
      const client = await connectAtTip(1000);
      await seedTxHeightCache(client, TX_HASH, 2000);

      client.blockchainHeaders_subscribe.mockResolvedValue({ height: 1000 });
      client.blockchainTransaction_get.mockResolvedValue({ confirmations: 5 });

      const result = await BlueElectrum.getConfirmedBlockHeight(TX_HASH);
      expect(result).toEqual({ height: 996, tip: 1000 });
      expect(client.blockchainTransaction_get).toHaveBeenCalledWith(TX_HASH, true);
    });
  });
});

describe('BlueElectrum batch limit recovery', () => {
  const addresses = ['1BitcoinEaterAddressDontSendf59kuE', '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'];
  let client: FakeClient;

  beforeEach(async () => {
    BlueElectrum.forceDisconnect();
    await BlueElectrum.setDisabled(false);
    created.length = 0;
    rejectConnections = false;
    const connection = BlueElectrum.ensureConnected();
    await flush();
    resolveLastConnect();
    await connection;
    client = created[created.length - 1];
  });

  afterEach(() => {
    BlueElectrum.forceDisconnect();
    jest.restoreAllMocks();
  });

  it('recovers balances without losing confirmed or unconfirmed amounts', async () => {
    client.blockchainScripthash_getBalanceBatch.mockRejectedValue(new Error('Batch limit exceeded'));
    client.blockchainScripthash_getBalance.mockResolvedValue({
      confirmed: 100,
      unconfirmed: -5,
    });
    await expect(BlueElectrum.multiGetBalanceByAddress(addresses)).resolves.toEqual({
      balance: 200,
      unconfirmed_balance: -10,
      addresses: Object.fromEntries(addresses.map(address => [address, { confirmed: 100, unconfirmed: -5 }])),
    });
    expect(client.blockchainScripthash_getBalanceBatch).toHaveBeenCalledTimes(1);
    expect(client.blockchainScripthash_getBalance).toHaveBeenCalledTimes(2);
  });

  it('recovers history and remembers the fallback for subsequent requests', async () => {
    client.blockchainScripthash_getHistoryBatch.mockRejectedValue(new Error('Batch limit exceeded'));
    client.blockchainScripthash_getHistory.mockImplementation(async (scripthash: string) => [{ tx_hash: scripthash, height: 100 }]);
    for (let i = 0; i < 2; i++) {
      const histories = await BlueElectrum.multiGetHistoryByAddress(addresses);
      expect(Object.keys(histories)).toEqual(addresses);
      for (const address of addresses) {
        expect(histories[address]).toEqual([
          {
            tx_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
            height: 100,
            address,
          },
        ]);
      }
    }
    expect(client.blockchainScripthash_getHistoryBatch).toHaveBeenCalledTimes(1);
    expect(client.blockchainScripthash_getHistory).toHaveBeenCalledTimes(4);
  });

  it('fetches UTXOs individually after a batch limit instead of erasing them', async () => {
    client.blockchainScripthash_listunspentBatch
      .mockImplementationOnce(async (hashes: string[]) =>
        hashes.map(param => ({ param, result: [{ tx_hash: 'ab'.repeat(32), tx_pos: 1, height: 100, value: 42 }] })),
      )
      .mockRejectedValue(new Error('Batch limit exceeded'));
    client.blockchainScripthash_listunspent.mockImplementation(async () => [
      { tx_hash: 'ab'.repeat(32), tx_pos: 1, height: 100, value: 42 },
    ]);
    const utxos = await BlueElectrum.multiGetUtxoByAddress(addresses, 1);
    for (const address of addresses) {
      expect(utxos[address]).toEqual([{ txid: 'ab'.repeat(32), vout: 1, height: 100, value: 42, address }]);
    }
    expect(client.blockchainScripthash_listunspentBatch).toHaveBeenCalledTimes(2);
    expect(client.blockchainScripthash_listunspent).toHaveBeenCalledTimes(2);
  });

  it('keeps the EPS UTXO no-op when that server lacks listunspent', async () => {
    BlueElectrum.forceDisconnect();
    const connection = BlueElectrum.ensureConnected();
    await flush();
    resolveLastConnect('ElectrumPersonalServer 0.2.4');
    await connection;
    const eps = created[created.length - 1];
    await expect(BlueElectrum.multiGetUtxoByAddress(addresses)).resolves.toEqual({});
    expect(eps.blockchainScripthash_listunspent).not.toHaveBeenCalled();
    expect(eps.blockchainScripthash_listunspentBatch).not.toHaveBeenCalled();
  });

  it.each(['history', 'balance', 'transaction'])('recovers %s singles rejected by a later batch-limit frame', async kind => {
    const limit = new Error('Batch limit exceeded');
    if (kind === 'history') {
      client.blockchainScripthash_getHistoryBatch.mockRejectedValue(limit);
      client.blockchainScripthash_getHistory.mockRejectedValueOnce(limit).mockResolvedValue([]);
      await expect(BlueElectrum.multiGetHistoryByAddress([addresses[0]])).resolves.toEqual({ [addresses[0]]: [] });
    } else if (kind === 'balance') {
      client.blockchainScripthash_getBalanceBatch.mockRejectedValue(limit);
      client.blockchainScripthash_getBalance.mockRejectedValueOnce(limit).mockResolvedValue({ confirmed: 42, unconfirmed: 0 });
      await expect(BlueElectrum.multiGetBalanceByAddress([addresses[0]])).resolves.toMatchObject({ balance: 42 });
    } else {
      const txid = 'ef'.repeat(32);
      client.blockchainTransaction_getBatch.mockRejectedValue(limit);
      client.blockchainTransaction_get.mockRejectedValueOnce(limit).mockResolvedValue('tx hex');
      await expect(BlueElectrum.multiGetTransactionByTxid([txid], false)).resolves.toEqual({ [txid]: 'tx hex' });
    }
  });

  it('bounds repeated single-request failures and does not return partial transactions', async () => {
    const txid = '12'.repeat(32);
    const limit = new Error('Batch limit exceeded');
    client.blockchainTransaction_getBatch.mockRejectedValue(limit);
    client.blockchainTransaction_get.mockRejectedValue(limit);
    await expect(BlueElectrum.multiGetTransactionByTxid([txid], false)).rejects.toBe(limit);
    expect(client.blockchainTransaction_get).toHaveBeenCalledTimes(2);
  });

  it('preserves cached transactions while retrying cache misses', async () => {
    const cachedID = 'ab'.repeat(32);
    const missingID = 'cd'.repeat(32);
    client.blockchainTransaction_getBatch.mockResolvedValue([{ param: cachedID, result: 'cached hex' }]);
    await BlueElectrum.multiGetTransactionByTxid([cachedID], false);
    client.blockchainTransaction_getBatch.mockRejectedValue(new Error('Batch limit exceeded'));
    client.blockchainTransaction_get.mockResolvedValue('uncached hex');
    await expect(BlueElectrum.multiGetTransactionByTxid([cachedID, missingID], false)).resolves.toEqual({
      [cachedID]: 'cached hex',
      [missingID]: 'uncached hex',
    });
    expect(client.blockchainTransaction_get).toHaveBeenCalledWith(missingID, false);
    expect(client.blockchainTransaction_get).toHaveBeenCalledTimes(1);
  });

  it('propagates other errors instead of changing capabilities', async () => {
    const failure = new Error('connection closed');
    client.blockchainScripthash_getBalanceBatch.mockRejectedValue(failure);
    await expect(BlueElectrum.multiGetBalanceByAddress(addresses)).rejects.toBe(failure);
    expect(client.blockchainScripthash_getBalance).not.toHaveBeenCalled();
    client.blockchainScripthash_getBalanceBatch.mockResolvedValue([]);
    await BlueElectrum.multiGetBalanceByAddress(addresses);
    expect(client.blockchainScripthash_getBalanceBatch).toHaveBeenCalledTimes(2);
  });

  it('tries batching again on a new connection', async () => {
    client.blockchainScripthash_getHistoryBatch.mockRejectedValue(new Error('Batch limit exceeded'));
    client.blockchainScripthash_getHistory.mockResolvedValue([]);
    await BlueElectrum.multiGetHistoryByAddress(addresses);
    BlueElectrum.forceDisconnect();
    const connection = BlueElectrum.ensureConnected();
    await flush();
    resolveLastConnect('ElectrumX 1.16.0');
    await connection;
    const nextClient = created[created.length - 1];
    nextClient.blockchainScripthash_getHistoryBatch.mockResolvedValue([]);
    await BlueElectrum.multiGetHistoryByAddress(addresses);
    expect(nextClient.blockchainScripthash_getHistoryBatch).toHaveBeenCalledTimes(1);
    expect(nextClient.blockchainScripthash_getHistory).not.toHaveBeenCalled();
  });
});

it('recovers parallel refreshes through real Electrum frames arriving after fallback RPCs', async () => {
  const net = jest.requireActual('net');
  const ElectrumClient = jest.requireActual('electrum-client');
  const originalFactory = (globalThis as any).__createNextFakeClient;
  let batches = 0;
  let lateFrames = 2;
  let singleRequests = 0;
  const limit = JSON.stringify({ id: null, error: { message: 'Batch limit exceeded' } }) + '\n';
  const server = net.createServer((socket: any) => {
    let buffer = '';
    socket.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      const requests = lines.filter(Boolean).map(line => JSON.parse(line));
      const singles = requests.filter(
        request => !Array.isArray(request) && request.method !== 'server.version' && request.method !== 'blockchain.headers.subscribe',
      );
      singleRequests += singles.length;
      // A later null-id error clears every callback queued by the fallback.
      if (singles.length && lateFrames > 0) {
        lateFrames--;
        socket.write(limit);
        return;
      }
      for (const request of requests) {
        if (Array.isArray(request)) {
          batches++;
          if (batches === 3) socket.write(limit);
          continue;
        }
        let result: unknown;
        switch (request.method) {
          case 'server.version':
            result = ['Fulcrum 2.1.2', '1.4'];
            break;
          case 'blockchain.headers.subscribe':
            result = { height: 1000 };
            break;
          case 'blockchain.scripthash.get_balance':
            result = { confirmed: 42, unconfirmed: 0 };
            break;
          case 'blockchain.transaction.get':
            result = 'raw tx hex';
            break;
          default:
            result = [];
        }
        socket.write(JSON.stringify({ id: request.id, result }) + '\n');
      }
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  (globalThis as any).__createNextFakeClient = () => new ElectrumClient(net, null, port, '127.0.0.1', 'tcp');
  BlueElectrum.forceDisconnect();
  try {
    await BlueElectrum.setDisabled(false);
    expect(await BlueElectrum.ensureConnected()).toBe(true);
    const address = '1BitcoinEaterAddressDontSendf59kuE';
    const txid = '34'.repeat(32);
    const [history, balance, transactions] = await Promise.all([
      BlueElectrum.multiGetHistoryByAddress([address]),
      BlueElectrum.multiGetBalanceByAddress([address]),
      BlueElectrum.multiGetTransactionByTxid([txid], false),
    ]);
    expect(history).toEqual({ [address]: [] });
    expect(balance.balance).toBe(42);
    expect(transactions).toEqual({ [txid]: 'raw tx hex' });
    expect(batches).toBe(3);
    expect(lateFrames).toBe(0);
    expect(singleRequests).toBeLessThanOrEqual(12);
  } finally {
    BlueElectrum.forceDisconnect();
    (globalThis as any).__createNextFakeClient = originalFactory;
    await new Promise<void>(resolve => server.close(resolve));
  }
}, 15000);
