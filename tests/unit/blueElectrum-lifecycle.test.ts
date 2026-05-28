/**
 * Unit tests for the BlueElectrum connection lifecycle / state machine.
 *
 * Exercises the bits that have no isolated coverage today: coalescing of
 * concurrent `ensureConnected()` callers, the generation counter that lets
 * `forceDisconnect()`/`setDisabled()` abort an in-flight connect, ping flips,
 * and the swap-check that guards against a stale client clobbering newer state.
 */

import * as BlueElectrum from '../../blue_modules/BlueElectrum';

// Jest hoists these above the import above. The factories close over `globalThis`
// so the test body can swap implementations per-test without re-mocking.
jest.mock('electrum-client', () => {
  return jest.fn().mockImplementation(() => (globalThis as any).__createNextFakeClient());
});

jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: (...args: unknown[]) => (globalThis as any).__presentAlertSpy?.(...args),
}));

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
(globalThis as any).__createNextFakeClient = () => {
  const c = makeFakeClient();
  created.push(c);
  return c;
};

const presentAlertMock = jest.fn();
(globalThis as any).__presentAlertSpy = presentAlertMock;

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function flush(times = 4) {
  for (let i = 0; i < times; i++) await tick();
}

function resolveLastConnect() {
  const c = created[created.length - 1];
  c.initElectrumDeferred.resolve(['Fulcrum 1.10.0', '1.4']);
  c.headersDeferred.resolve({ height: 1000 });
}

describe('BlueElectrum lifecycle', () => {
  beforeEach(async () => {
    BlueElectrum.forceDisconnect();
    await BlueElectrum.setDisabled(false);
    created.length = 0;
    presentAlertMock.mockClear();
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
});
