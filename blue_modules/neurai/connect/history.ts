/**
 * What this wallet approved on Neurai Connect, newest first: every login and
 * every session, with the site, the address it answered with and when.
 *
 * The SDK keeps none of this once it is over. A session is dropped when it
 * expires (seven days, spec/session.md section 2) or is revoked, and a login
 * leaves nothing behind at all: spec/auth.md treats the approval as a login
 * only, so the wallet forgets its pairing right away (client.ts). Without this
 * record the user could not see where they signed in. It lives in the same
 * secure store as the rest of Connect, never in AsyncStorage: the list of
 * sites someone uses is private.
 */

import { SecureConnectStorage } from './storage';

export type ConnectHistoryKind = 'login' | 'session';

export interface ConnectHistoryEntry {
  kind: ConnectHistoryKind;
  /** When it was approved, ms since epoch. */
  at: number;
  /** True when `at` was rebuilt from an older pairing: the time it was scanned, give or take minutes. */
  approximate?: boolean;
  name: string;
  url: string;
  icons?: string[];
  /** The address the wallet answered with, when known. */
  address?: string;
  /** Pairing it came through, so the same approval is never written twice. */
  pairingTopic?: string;
}

/** What a site says about itself (the SDK's `AppMetadata`, as far as the history needs it). */
export interface ConnectSiteMetadata {
  name?: string;
  url?: string;
  icons?: string[];
}

const KEY = 'history';
/** Enough to look back, small enough for one keystore entry. */
export const CONNECT_HISTORY_LIMIT = 200;

const storage = new SecureConnectStorage();
let cache: ConnectHistoryEntry[] | null = null;
// Writes are read-modify-write on one key: run them one after another.
let writing: Promise<unknown> = Promise.resolve();

function isEntry(value: unknown): value is ConnectHistoryEntry {
  const v = value as ConnectHistoryEntry;
  return !!v && (v.kind === 'login' || v.kind === 'session') && typeof v.at === 'number' && typeof v.url === 'string';
}

/**
 * The history, newest first. A read that fails rejects and is not cached: an
 * empty list here would be written back by the next entry and erase the
 * stored history (review 9). Only a missing key is an empty history.
 */
export async function connectHistory(): Promise<ConnectHistoryEntry[]> {
  if (cache) return cache;
  const stored = await storage.get<unknown>(KEY);
  cache = Array.isArray(stored) ? stored.filter(isEntry) : [];
  return cache;
}

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = writing.then(task, task);
  writing = run.catch(() => undefined);
  return run;
}

/** Adds entries, skipping any whose pairing is already there, and keeps the newest ones. */
export function recordConnectHistory(entries: ConnectHistoryEntry[]): Promise<void> {
  return serialized(async () => {
    if (entries.length === 0) return;
    const current = await connectHistory();
    const seen = new Set(current.map(entry => entry.pairingTopic).filter(Boolean));
    const fresh = entries.filter(entry => !entry.pairingTopic || !seen.has(entry.pairingTopic));
    if (fresh.length === 0) return;
    const next = [...fresh, ...current].sort((a, b) => b.at - a.at).slice(0, CONNECT_HISTORY_LIMIT);
    await storage.set(KEY, next);
    cache = next;
  });
}

export function clearConnectHistory(): Promise<void> {
  return serialized(async () => {
    await storage.delete(KEY);
    cache = [];
  });
}

/** The site part of an entry, from what the site sent and, for a login, the domain it signs for. */
export function historySite(
  metadata: ConnectSiteMetadata | undefined,
  domain?: string,
): Pick<ConnectHistoryEntry, 'name' | 'url' | 'icons'> {
  return {
    name: metadata?.name ?? '',
    url: metadata?.url || domain || '',
    icons: metadata?.icons,
  };
}
