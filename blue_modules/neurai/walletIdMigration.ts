/**
 * Moves per-wallet references from legacy wallet IDs to the current ones.
 *
 * Testnet software wallets and hardware wallets changed ID (see
 * `AbstractNeuraiWallet.getID` and `NeuraiHardwareWallet.getID`); mainnet
 * software wallets kept theirs. References written by older versions under a
 * legacy ID are renamed once to the wallet's current ID:
 *
 * - When the legacy ID is still the ID of another loaded wallet (the same
 *   words on mainnet), the reference stays with that mainnet wallet. The
 *   exception is the C7 transaction tags: C7 exists only on testnet, so tags
 *   under a shared ID belong to the testnet wallet.
 * - When two loaded wallets shared a legacy ID (two devices on one path), the
 *   first in storage order takes the references: it was the one on screen.
 * - A reference that already exists under the current ID is never replaced,
 *   and the legacy copy is left in place. Running the migration again is a
 *   no-op, so it runs after every complete load instead of tracking a marker.
 *
 * Only AsyncStorage keys move; wallet records and secrets are not touched.
 * `USE_BBQR_WALLET_IDS` is left out on purpose: only `addAndSaveWallet` wrote
 * it, and no Neurai flow ever called that.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PRIVACY_TX_TAGS_PREFIX } from './privacy/txTags';

export interface MigratableWallet {
  getID(): string;
  getLegacyID(): string;
}

/** Keys shaped `<prefix><walletID>` or `<prefix><walletID>|<suffix>`. */
export const WALLET_KEY_PREFIXES = ['depin_revealed_', 'depin_pool_seen_', 'depin_unread_', 'depin_read_', PRIVACY_TX_TAGS_PREFIX] as const;
/** Keys whose value is one wallet ID. */
export const WALLET_VALUE_KEYS = ['HomeSelectedWalletID', 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY'] as const;

const ID_LENGTH = 64;
const HEX_ID = /^[0-9a-f]{64}$/;

type Move = { to: string; shared: boolean };

function planMoves(wallets: readonly MigratableWallet[]): Map<string, Move> {
  const current = new Set(wallets.map(wallet => wallet.getID()));
  const moves = new Map<string, Move>();
  for (const wallet of wallets) {
    const from = wallet.getLegacyID();
    const to = wallet.getID();
    if (from === to || moves.has(from)) continue;
    moves.set(from, { to, shared: current.has(from) });
  }
  return moves;
}

function splitWalletKey(key: string): { prefix: string; id: string; suffix: string } | null {
  for (const prefix of WALLET_KEY_PREFIXES) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const id = rest.slice(0, ID_LENGTH);
    const suffix = rest.slice(ID_LENGTH);
    if (HEX_ID.test(id) && (suffix === '' || suffix.startsWith('|'))) return { prefix, id, suffix };
  }
  return null;
}

/** @returns the number of references moved. */
export async function migrateWalletReferences(wallets: readonly MigratableWallet[]): Promise<number> {
  const moves = planMoves(wallets);
  if (moves.size === 0) return 0;

  const keys = new Set(await AsyncStorage.getAllKeys());
  const renames: Array<[string, string]> = [];
  for (const key of keys) {
    const parts = splitWalletKey(key);
    const move = parts && moves.get(parts.id);
    if (!parts || !move) continue;
    if (move.shared && parts.prefix !== PRIVACY_TX_TAGS_PREFIX) continue;
    const target = parts.prefix + move.to + parts.suffix;
    if (!keys.has(target)) renames.push([key, target]);
  }

  let moved = 0;
  if (renames.length) {
    const values = await AsyncStorage.multiGet(renames.map(([from]) => from));
    const byKey = new Map(values);
    const writes = renames
      .filter(([from]) => byKey.get(from) != null)
      .map(([from, to]) => [to, byKey.get(from) as string] as [string, string]);
    // Write the new keys before removing the old ones: an interruption leaves
    // a duplicate, never a loss, and the next run skips what already moved.
    if (writes.length) await AsyncStorage.multiSet(writes);
    await AsyncStorage.multiRemove(renames.filter(([from]) => byKey.get(from) != null).map(([from]) => from));
    moved += writes.length;
  }

  for (const key of WALLET_VALUE_KEYS) {
    const value = await AsyncStorage.getItem(key);
    const move = value ? moves.get(value) : undefined;
    if (move && !move.shared) {
      await AsyncStorage.setItem(key, move.to);
      moved++;
    }
  }
  return moved;
}
