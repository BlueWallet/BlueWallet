/**
 * Which DePIN messages the user has already seen, per wallet and token.
 *
 * A conversation's messages are read when it is on screen. Without a record of
 * that, every restart decrypts the channel again and counts every old private
 * message as new, and a message that arrived while another conversation was
 * open is forgotten when the channel is left. This keeps the hashes of the
 * messages that were on screen, so a count of unread messages means what it
 * says across restarts.
 *
 * Only message hashes are stored, never text or senders: plaintext chat stays
 * in memory. The pool drops messages after a few hours, so the list only needs
 * to cover what the pool can still return; it is capped and the oldest marks go
 * first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'depin_read_';
/** Far more than a pool returns within a message lifetime. */
const MAX_MARKS = 3000;
const SAVE_DELAY_MS = 1_000;

const marks = new Map<string, Set<string>>();
/** Channels whose stored marks have been merged into `marks`. */
const loaded = new Set<string>();
const loading = new Map<string, Promise<Set<string>>>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

const channelKey = (walletID: string, token: string) => `${walletID}|${token.replace(/^&/, '').toUpperCase()}`;

/** The channel's set, the same object for its whole life: callers may hold on to it. */
const setFor = (key: string): Set<string> => {
  let set = marks.get(key);
  if (!set) {
    set = new Set();
    marks.set(key, set);
  }
  return set;
};

const loadKey = (key: string): Promise<Set<string>> => {
  if (loaded.has(key)) return Promise.resolve(setFor(key));
  const pending = loading.get(key);
  if (pending) return pending;
  const request = (async () => {
    let stored: string[] = [];
    try {
      const raw = await AsyncStorage.getItem(KEY_PREFIX + key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) stored = parsed.filter(item => typeof item === 'string');
    } catch {
      // Unreadable marks only cost a few messages shown as new once.
    }
    // Stored marks go first (they are older); marks added meanwhile stay.
    const set = setFor(key);
    const added = Array.from(set);
    set.clear();
    for (const hash of [...stored, ...added]) set.add(hash);
    loaded.add(key);
    return set;
  })().finally(() => loading.delete(key));
  loading.set(key, request);
  return request;
};

/** The read marks of a channel, loaded from storage the first time. */
export function loadReadMarks(walletID: string, token: string): Promise<Set<string>> {
  return loadKey(channelKey(walletID, token));
}

/** Records these messages as seen. Returns true when at least one was new. */
export function markMessagesRead(walletID: string, token: string, hashes: string[]): boolean {
  if (hashes.length === 0) return false;
  const key = channelKey(walletID, token);
  const set = setFor(key);
  let added = false;
  for (const hash of hashes) {
    if (hash && !set.has(hash)) {
      set.add(hash);
      added = true;
    }
  }
  if (!added) return false;
  const previous = saveTimers.get(key);
  if (previous) clearTimeout(previous);
  saveTimers.set(
    key,
    setTimeout(() => {
      saveTimers.delete(key);
      // Never write before the stored marks are merged: that would drop them.
      loadKey(key)
        .then(current => {
          // A Set keeps insertion order: the first entries are the oldest marks.
          const excess = current.size - MAX_MARKS;
          if (excess > 0) {
            let index = 0;
            for (const hash of current) {
              if (index++ >= excess) break;
              current.delete(hash);
            }
          }
          return AsyncStorage.setItem(KEY_PREFIX + key, JSON.stringify(Array.from(current)));
        })
        .catch(() => {});
    }, SAVE_DELAY_MS),
  );
  return true;
}
