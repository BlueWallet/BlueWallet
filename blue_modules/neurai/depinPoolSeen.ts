/**
 * Tracks how much of a DePIN channel the user has already seen, so the wallet
 * can show a "new activity" marker without decrypting anything.
 *
 * A verified RPC 6 bootstrap exposes the stream and admission high water in
 * its signed public body. The background check requires no user key or device.
 * The marker advances after the chat finishes scanning its receive pages.
 *
 * What it cannot tell is whether the new traffic is addressed to *you*: only
 * decryption answers that, and that is exactly the work we are avoiding here.
 * The marker therefore means "this channel has new messages", which may include
 * messages you will not be able to read.
 *
 * The signature is stored per wallet, not per node: two wallets can watch the
 * same channel, and reading it in one must not silence the marker in the other.
 * A wallet id is available without touching the device, which a DePIN address
 * is not on a hardware wallet.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'depin_pool_seen_';

type Listener = () => void;
const listeners = new Set<Listener>();
/** In-memory mirror so reads are synchronous after the first hydration. */
const seen = new Map<string, string>();

/** Stream/high-water/revision marker; retain the old form for stored legacy state. */
export const poolSignature = (
  stats:
    | {
        total_messages?: unknown;
        newest_message?: unknown;
        admission_sequence?: unknown;
        stream_id?: unknown;
        membership_revision?: unknown;
      }
    | null
    | undefined,
): string =>
  stats?.admission_sequence !== undefined
    ? `v5|${String(stats.stream_id)}|${String(stats.admission_sequence)}|${String(stats.membership_revision)}`
    : `${String(stats?.total_messages ?? '')}|${String(stats?.newest_message ?? '')}`;

/** An empty pool answer carries no information — do not treat it as a state. */
export const isMeaningfulSignature = (signature: string): boolean => signature !== '|' && !signature.startsWith('||');

export async function loadSeenSignature(walletID: string): Promise<string | null> {
  if (seen.has(walletID)) return seen.get(walletID) ?? null;
  try {
    const stored = await AsyncStorage.getItem(KEY_PREFIX + walletID);
    if (stored) seen.set(walletID, stored);
    return stored;
  } catch {
    return null;
  }
}

export function getSeenSignature(walletID: string): string | null {
  return seen.get(walletID) ?? null;
}

/** Record the channel as read up to this pool state and wake any watcher. */
export function markPoolSeen(walletID: string, signature: string): void {
  if (!walletID || !isMeaningfulSignature(signature) || seen.get(walletID) === signature) return;
  seen.set(walletID, signature);
  AsyncStorage.setItem(KEY_PREFIX + walletID, signature).catch(() => {});
  listeners.forEach(listener => listener());
}

export function subscribePoolSeen(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/*
 * Unread messages per wallet and token. The pool marker above clears as soon as
 * the chat has read the channel, even when what arrived was a private message
 * for a conversation that is not open. These counts keep the wallet's DePIN
 * marker on until the conversations holding them have been opened.
 */
const UNREAD_PREFIX = 'depin_unread_';
const unread = new Map<string, Record<string, number>>();

export async function loadUnreadCounts(walletID: string): Promise<Record<string, number>> {
  const known = unread.get(walletID);
  if (known) return known;
  let counts: Record<string, number> = {};
  try {
    const raw = await AsyncStorage.getItem(UNREAD_PREFIX + walletID);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') counts = parsed;
  } catch {
    // Nothing stored: no marker until the chat counts again.
  }
  if (!unread.has(walletID)) unread.set(walletID, counts);
  return unread.get(walletID) ?? counts;
}

/** Unread messages of each token of a wallet, as last counted by the chat. */
export function getUnreadCounts(walletID: string): Record<string, number> {
  return unread.get(walletID) ?? {};
}

export function getUnreadTotal(walletID: string): number {
  return Object.values(getUnreadCounts(walletID)).reduce((sum, count) => sum + (Number(count) || 0), 0);
}

/** The chat counted the unread messages of a token: store them and wake any watcher. */
export function setUnreadCount(walletID: string, token: string, count: number): void {
  if (!walletID || !token) return;
  const current = unread.get(walletID) ?? {};
  if ((current[token] ?? 0) === count) return;
  const next = { ...current };
  if (count > 0) next[token] = count;
  else delete next[token];
  unread.set(walletID, next);
  AsyncStorage.setItem(UNREAD_PREFIX + walletID, JSON.stringify(next)).catch(() => {});
  listeners.forEach(listener => listener());
}
