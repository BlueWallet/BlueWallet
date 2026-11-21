/** Dedicated account-100 chat identity: Legacy m/44 or strict ECDSA m/84.
 * Keys and addresses follow the selected wallet family. PQ messaging and the
 * separate ESP32 protocol migration remain deferred.
 */

import { getAddressByPath, getCoinType, getHDKey } from '@neuraiproject/neurai-key';

import { requireLegacyKeyNetwork, ecdsaKeyNetworkFor } from './keyNetwork';
import type { NeuraiChainType } from './networkConfig';

/** Neurai networks that support the dedicated DePIN chat identity. */
export type DepinChatNetwork = Extract<NeuraiChainType, 'xna' | 'xna-test' | 'xna-ecdsa' | 'xna-ecdsa-test'>;

export interface DepinChatIdentity {
  /** DePIN chat address: Legacy Base58 or strict ECDSA `nq1r…` / `tnq1r…`. */
  address: string;
  /**
   * Private key in WIF format (used to sign/decrypt DePIN messages locally).
   * **Empty for device-backed identities** (hardware wallets never expose it):
   * RPC 6 signing/decryption requires the deferred hardware update. Gate local-crypto paths
   * on a truthy `wif` (or on `!deviceBacked`).
   */
  wif: string;
  /** Compressed public key, 66 hex chars (33 bytes, `02`/`03` prefix). */
  publicKey: string;
  /** Full derivation path, e.g. `m/44'/1900'/100'/0/0`. */
  path: string;
  coinType: number;
  account: number;
  index: number;
  /**
   * True when this identity comes from a hardware device (no local `wif`);
   * signing/decryption must be routed to the device. Absent/false = mnemonic.
   */
  deviceBacked?: boolean;
}

/**
 * Type guard for Legacy and strict ECDSA chat networks.
 * Returns false for PQ chains (`xna-pq` / `xna-pq-test`).
 */
export function isDepinChatSupportedNetwork(network: string): network is DepinChatNetwork {
  return ['xna', 'xna-test', 'xna-ecdsa', 'xna-ecdsa-test'].includes(network);
}

/** Normalize any pubkey hex to compressed form (33 bytes / 66 hex chars). */
function compressPubKeyHex(pubKeyHex: string): string {
  const hex = (pubKeyHex ?? '').trim().toLowerCase().replace(/^0x/, '');
  if (hex.length === 66 && (hex.startsWith('02') || hex.startsWith('03'))) {
    return hex;
  }

  // Uncompressed: 65 bytes => 130 hex chars, starts with 04.
  if (hex.length === 130 && hex.startsWith('04')) {
    const xHex = hex.slice(2, 66);
    const yHex = hex.slice(66, 130);
    const yLastByte = parseInt(yHex.slice(-2), 16);
    const prefix = yLastByte % 2 === 0 ? '02' : '03';
    return `${prefix}${xHex}`;
  }

  // Other formats: return as-is and let the caller validate.
  return hex;
}

function deriveDepinChatIdentityUncached(params: {
  network: DepinChatNetwork;
  mnemonic: string;
  passphrase?: string;
  account?: number;
  index?: number;
}): DepinChatIdentity {
  const account = params.account ?? 100;
  const index = params.index ?? 0;

  const mnemonic = (params.mnemonic ?? '').trim();
  if (!mnemonic) {
    throw new Error('Missing mnemonic');
  }

  const passphrase = params.passphrase ?? '';

  // neurai-key 5 names the 4.x Legacy derivation `xna-legacy[-test]`.
  const keyNetwork = ecdsaKeyNetworkFor(params.network) ?? requireLegacyKeyNetwork(params.network);
  const hdKey = getHDKey(keyNetwork, mnemonic, passphrase);
  const coinType = getCoinType(keyNetwork);

  const purpose = ecdsaKeyNetworkFor(params.network) ? 84 : 44;
  const path = `m/${purpose}'/${coinType}'/${account}'/0/${index}`;
  const addrObj = getAddressByPath(keyNetwork, hdKey, path);

  const wif = String(addrObj?.WIF ?? '').trim();
  const address = String(addrObj?.address ?? '').trim();
  const publicKey = compressPubKeyHex(String(addrObj?.publicKey ?? ''));

  if (!address) throw new Error('Failed to derive DePIN chat address');
  if (!wif) throw new Error('Failed to derive DePIN chat private key (WIF)');
  if (publicKey.length !== 66) throw new Error('Failed to derive compressed public key for DePIN chat identity');

  return { address, wif, publicKey, path, coinType, account, index };
}

/**
 * Derived identities for this app session. Seed-to-key derivation (PBKDF2 plus
 * the HD path, pure JS) blocks the JS thread for hundreds of milliseconds, and
 * the wallet card and the chat tab both ask for the same identity, every time
 * they mount. The mnemonic is already held in memory by the wallet object, so
 * keeping its derived key here exposes nothing new; it lives until restart.
 */
const identityCache = new Map<string, DepinChatIdentity>();

/**
 * Derive the DePIN chat identity for a supported Neurai network. Throws if the
 * derivation fails or the network is unsupported.
 */
export function deriveDepinChatIdentity(params: {
  network: DepinChatNetwork;
  mnemonic: string;
  passphrase?: string;
  account?: number;
  index?: number;
}): DepinChatIdentity {
  const key = [params.network, params.account ?? 100, params.index ?? 0, params.passphrase ?? '', (params.mnemonic ?? '').trim()].join(
    '\u0000',
  );
  const cached = identityCache.get(key);
  if (cached) return cached;
  const identity = deriveDepinChatIdentityUncached(params);
  identityCache.set(key, identity);
  return identity;
}

/**
 * Build a device-backed DePIN chat identity from a hardware device's
 * `get_depin_identity` response. There is no local `wif` — signing/decryption is
 * routed to the device. Mirrors the fields of {@link deriveDepinChatIdentity} so
 * the chat UI treats both the same, gating local crypto on the empty `wif`.
 */
export function deviceDepinChatIdentity(params: {
  network: DepinChatNetwork;
  address: string;
  publicKey: string;
  path: string;
}): DepinChatIdentity {
  const address = (params.address ?? '').trim();
  const publicKey = compressPubKeyHex(params.publicKey ?? '');
  const path = (params.path ?? '').trim();
  const coinType = getCoinType(ecdsaKeyNetworkFor(params.network) ?? requireLegacyKeyNetwork(params.network));

  if (!address) throw new Error('Device returned no DePIN chat address');
  if (publicKey.length !== 66) throw new Error('Device returned an invalid DePIN chat public key');

  // Parse account/index out of the device path (m/44'/coin'/account'/0/index)
  // so the fields match the mnemonic path; fall back to the chat defaults.
  const parts = path.split('/');
  const account = Number(String(parts[3] ?? '').replace(/'$/, '')) || 100;
  const index = Number(parts[5] ?? '') || 0;

  return { address, wif: '', publicKey, path, coinType, account, index, deviceBacked: true };
}
