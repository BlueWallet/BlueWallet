/**
 * H21 · Neurai Connect storage tells "absent" from "unreadable" and keeps its
 * index complete, so a relay change can never strand sessions it failed to see.
 */
const store = new Map<string, string>();
const faults: { get?: Error; set?: Error; remove?: Error } = {};
const missing = () => Object.assign(new Error('key has not been set'), { code: '404' });

jest.mock('react-native-secure-key-store', () => ({
  __esModule: true,
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x' },
  default: {
    get: jest.fn(async (key: string) => {
      if (faults.get) throw faults.get;
      if (!store.has(key)) throw missing();
      return store.get(key);
    }),
    set: jest.fn(async (key: string, value: string) => {
      if (faults.set) throw faults.set;
      store.set(key, value);
    }),
    remove: jest.fn(async (key: string) => {
      if (faults.remove) throw faults.remove;
      store.delete(key);
    }),
  },
}));

// eslint-disable-next-line import/first
import { RecordStore } from '@neuraiproject/neurai-connect-core';

// eslint-disable-next-line import/first
import {
  ConnectStorageCorruptError,
  ConnectStorageUnavailableError,
  SecureConnectStorage,
  resetConnectStorageCacheForTests,
} from '../../blue_modules/neurai/connect/storage';

const INDEX = 'NEURAI_CONNECT___index__';

beforeEach(() => {
  store.clear();
  delete faults.get;
  delete faults.set;
  delete faults.remove;
  resetConnectStorageCacheForTests();
});

describe('H21 · Connect secure storage', () => {
  it('reads a missing key as absent', async () => {
    expect(await new SecureConnectStorage().get('sessions')).toBeUndefined();
    expect(await new SecureConnectStorage().keys()).toEqual([]);
  });

  it('throws when the store cannot be read, instead of reporting no sessions', async () => {
    store.set('NEURAI_CONNECT_sessions', JSON.stringify([{ topic: 't1' }]));
    faults.get = new Error('Keystore operation failed');
    const storage = new SecureConnectStorage();
    await expect(storage.get('sessions')).rejects.toThrow(ConnectStorageUnavailableError);
    // The SDK record store, used to count sessions before a relay change, must fail too.
    await expect(new RecordStore<{ topic: string }>(storage, 'sessions').load()).rejects.toThrow();
  });

  it('throws on a damaged entry or index', async () => {
    store.set('NEURAI_CONNECT_sessions', '{oops');
    await expect(new SecureConnectStorage().get('sessions')).rejects.toThrow(ConnectStorageCorruptError);
    store.set(INDEX, '{oops');
    await expect(new SecureConnectStorage().keys()).rejects.toThrow(ConnectStorageCorruptError);
  });

  it('keeps every key when several instances write at the same time', async () => {
    store.set(INDEX, JSON.stringify(['old']));
    const [a, b, c] = [new SecureConnectStorage(), new SecureConnectStorage(), new SecureConnectStorage()];
    await Promise.all([a.set('k1', 1), b.set('k2', 2), c.set('k3', 3), a.set('k4', 4)]);
    expect(JSON.parse(store.get(INDEX)!).sort()).toEqual(['k1', 'k2', 'k3', 'k4', 'old']);
  });

  it('indexes a key before writing its secret, and recovers from a failed index write', async () => {
    const storage = new SecureConnectStorage();
    faults.set = new Error('disk full');
    await expect(storage.set('relay_key', 'secret')).rejects.toThrow();
    expect(store.has('NEURAI_CONNECT_relay_key')).toBe(false); // no secret outside the index
    delete faults.set;
    await storage.set('relay_key', 'secret');
    expect(JSON.parse(store.get(INDEX)!)).toEqual(['relay_key']);
  });

  it('keeps a key whose removal failed, so clearing can be finished later', async () => {
    const storage = new SecureConnectStorage();
    await storage.set('s1', 1);
    await storage.set('s2', 2);
    faults.remove = new Error('Keystore operation failed');
    await expect(storage.clear()).rejects.toThrow();
    expect((await storage.keys()).sort()).toEqual(['s1', 's2']);
    delete faults.remove;
    await storage.clear();
    expect(await storage.keys()).toEqual([]);
    expect(store.has('NEURAI_CONNECT_s1')).toBe(false);
  });
});

describe('Connect storage · concurrent set and clear (review 8)', () => {
  it.each(['set first', 'clear first'])('leaves no value outside the index (%s)', async order => {
    const storage = new SecureConnectStorage();
    await storage.set('session', { topic: 'old' });
    const ops =
      order === 'set first'
        ? [storage.set('new_session', { topic: 'new' }), new SecureConnectStorage().clear()]
        : [new SecureConnectStorage().clear(), storage.set('new_session', { topic: 'new' })];
    await Promise.all(ops);

    const indexed = new Set(await storage.keys());
    for (const key of store.keys()) {
      if (key === INDEX) continue;
      expect(indexed.has(key.replace('NEURAI_CONNECT_', ''))).toBe(true);
    }
  });
});

describe('Connect history · unreadable store (review 9)', () => {
  it('does not overwrite the stored history after a failed read', async () => {
    let history!: typeof import('../../blue_modules/neurai/connect/history');
    jest.isolateModules(() => {
      history = require('../../blue_modules/neurai/connect/history');
    });
    const old = { kind: 'login', at: 1, url: 'https://old.example', pairingTopic: 'p-old' };
    store.set('NEURAI_CONNECT_history', JSON.stringify([old]));
    store.set(INDEX, JSON.stringify(['history']));

    faults.get = new Error('Keystore operation failed');
    await expect(history.connectHistory()).rejects.toThrow('not readable'); // a fresh module copy: match by message
    await expect(
      history.recordConnectHistory([{ kind: 'login', at: 2, url: 'https://new.example', pairingTopic: 'p-new' } as never]),
    ).rejects.toThrow();
    expect(JSON.parse(store.get('NEURAI_CONNECT_history')!)).toEqual([old]);

    delete faults.get;
    await history.recordConnectHistory([{ kind: 'login', at: 2, url: 'https://new.example', pairingTopic: 'p-new' } as never]);
    expect(JSON.parse(store.get('NEURAI_CONNECT_history')!).map((e: { url: string }) => e.url)).toEqual([
      'https://new.example',
      'https://old.example',
    ]);
  });
});
