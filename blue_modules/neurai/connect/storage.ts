/**
 * Storage adapter for the Neurai Connect SDK.
 *
 * Everything the SDK persists is secret material: the symmetric key of every
 * pairing and session, the relay client key, and the list of topics we listen
 * on. It therefore lives in `RNSecureKeyStore` with
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, the same store the wallets use, and never in
 * AsyncStorage.
 *
 * `RNSecureKeyStore` cannot enumerate keys, so the adapter keeps its own index
 * entry; that is enough for the SDK, which only reads and writes a handful of
 * fixed keys.
 *
 * Failures are not absences (H21). A missing key reads as `undefined`; a store
 * that cannot be read, or an entry that does not parse, throws. The SDK's
 * record store would otherwise load "no sessions" and let a relay change
 * strand sessions that still exist.
 */

import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import type { KeyValueStorage } from '@neuraiproject/neurai-connect-core';

import { isMissingKeyError } from '../../../class/storage-errors';

const PREFIX = 'NEURAI_CONNECT_';
const INDEX_KEY = `${PREFIX}__index__`;

const options = { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** The secure store could not be read or written; what it holds is unknown. */
export class ConnectStorageUnavailableError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Neurai Connect storage is not readable (${key}): ${(cause as Error)?.message ?? cause}`);
    this.name = 'ConnectStorageUnavailableError';
  }
}

/** An entry exists but does not parse. */
export class ConnectStorageCorruptError extends Error {
  constructor(key: string) {
    super(`Neurai Connect storage entry is damaged (${key})`);
    this.name = 'ConnectStorageCorruptError';
  }
}

async function readRaw(key: string): Promise<string | undefined> {
  try {
    const raw = await RNSecureKeyStore.get(key);
    return typeof raw === 'string' ? raw : undefined;
  } catch (error) {
    if (isMissingKeyError(error)) return undefined;
    throw new ConnectStorageUnavailableError(key, error);
  }
}

/**
 * The index is one entry shared by every instance (the client, the identity
 * registry and the history each create one), so its cache and its write queue
 * are shared too: separate copies would overwrite each other's keys.
 */
const shared: { index: Promise<Set<string>> | null; writes: Promise<unknown> } = { index: null, writes: Promise.resolve() };

/** Test hook: forget the cached index. */
export function resetConnectStorageCacheForTests(): void {
  shared.index = null;
  shared.writes = Promise.resolve();
}

export class SecureConnectStorage implements KeyValueStorage {
  private loadIndex(): Promise<Set<string>> {
    if (!shared.index) {
      const loading = (async () => {
        const raw = await readRaw(INDEX_KEY);
        if (raw === undefined) return new Set<string>();
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new ConnectStorageCorruptError(INDEX_KEY);
        }
        if (!Array.isArray(parsed)) throw new ConnectStorageCorruptError(INDEX_KEY);
        return new Set(parsed.filter((k): k is string => typeof k === 'string'));
      })();
      shared.index = loading;
      // A failed read is not cached: the next call tries again.
      loading.catch(() => {
        if (shared.index === loading) shared.index = null;
      });
    }
    return shared.index;
  }

  /**
   * Every mutation (index and value together) runs as one turn of a queue
   * shared by all instances. Serializing only the index let a `set` write its
   * value after a concurrent `clear` had removed the key from the index,
   * leaving a secret nothing would ever delete (review 8).
   */
  private mutate<T>(job: () => Promise<T>): Promise<T> {
    const run = shared.writes.then(job, job);
    shared.writes = run.catch(() => undefined);
    return run;
  }

  /** Writes the index; must run inside `mutate`. */
  private async saveIndex(index: Set<string>): Promise<void> {
    try {
      await RNSecureKeyStore.set(INDEX_KEY, JSON.stringify([...index]), options);
    } catch (error) {
      // The cached index already holds the change the disk did not get:
      // drop it, so the next call reads what is really stored.
      shared.index = null;
      throw new ConnectStorageUnavailableError(INDEX_KEY, error);
    }
  }

  /** Removes one value and its index entry; must run inside `mutate`. A failed removal keeps the key indexed. */
  private async removeOne(index: Set<string>, key: string): Promise<void> {
    try {
      await RNSecureKeyStore.remove(PREFIX + key);
    } catch (error) {
      if (!isMissingKeyError(error)) throw new ConnectStorageUnavailableError(key, error);
    }
    if (index.delete(key)) await this.saveIndex(index);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await readRaw(PREFIX + key);
    if (raw === undefined) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new ConnectStorageCorruptError(key);
    }
  }

  /** The key is indexed before its value is written, so a secret is never left outside the index. */
  set<T>(key: string, value: T): Promise<void> {
    return this.mutate(async () => {
      const index = await this.loadIndex();
      if (!index.has(key)) {
        index.add(key);
        await this.saveIndex(index);
      }
      await RNSecureKeyStore.set(PREFIX + key, JSON.stringify(value), options);
    });
  }

  delete(key: string): Promise<void> {
    return this.mutate(async () => this.removeOne(await this.loadIndex(), key));
  }

  async keys(prefix?: string): Promise<string[]> {
    const all = [...(await this.loadIndex())];
    return prefix === undefined ? all : all.filter(k => k.startsWith(prefix));
  }

  /**
   * Wipes every Neurai Connect entry. Used by "log out everywhere". Entries
   * that could not be removed stay indexed and the call rejects, so a retry
   * finishes the job instead of forgetting secrets it never deleted. Runs as
   * one turn of the queue, without calling the queued `delete`.
   */
  clear(): Promise<void> {
    return this.mutate(async () => {
      const index = await this.loadIndex();
      const failed: unknown[] = [];
      for (const key of [...index]) {
        try {
          await this.removeOne(index, key);
        } catch (error) {
          failed.push(error);
        }
      }
      if (failed.length) throw failed[0];
    });
  }
}
