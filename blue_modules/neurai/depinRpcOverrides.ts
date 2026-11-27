/**
 * DePIN talks to a WSS service: the wallet's own by default, or one set for
 * DePIN alone (a DePIN node on the LAN, say) without moving the wallet off
 * its service. Legacy RPC preferences remain readable for compatibility, but
 * do not select a transport or receive traffic. Pool-key trust is keyed by the
 * effective WSS URL, never by obsolete HTTP URLs.
 *
 * A saved DePIN server that the current policy refuses (a `ws://` host outside
 * 192.168.0.x and 192.168.1.x, kept from an older version) is not replaced by
 * another node: it stays saved and shown, and DePIN sends nothing anywhere
 * until the user edits it or picks the wallet's server (second review, item 7).
 */

import DefaultPreference from 'react-native-default-preference';

import { GROUP_IO_BLUEWALLET } from '../currency';
import { CHAIN_PARAMS, chainFor, type NeuraiNetwork } from './networkConfig';
import { getWssUrlOverride, isOverridesLoaded, loadOverrides } from './backendOverrides';
import { isCleartextAllowedHost } from './localNetwork';

export interface DepinRpcConfig {
  url: string;
  username?: string;
  password?: string;
}

const KEY_BY_NETWORK: Record<NeuraiNetwork, string> = {
  mainnet: 'NEURAI_DEPIN_RPC_MAINNET',
  testnet: 'NEURAI_DEPIN_RPC_TESTNET',
};

/** Public DePIN-enabled defaults (same as the Neurai web wallet). */
export const DEFAULT_DEPIN_RPC_URL: Record<NeuraiNetwork, string> = {
  mainnet: CHAIN_PARAMS.xna.defaultWssUrl,
  testnet: CHAIN_PARAMS['xna-test'].defaultWssUrl,
};

/** A WSS service for DePIN alone, per network: wins over the wallet's when set. */
const WSS_KEY_BY_NETWORK: Record<NeuraiNetwork, string> = {
  mainnet: 'NEURAI_DEPIN_WSS_MAINNET',
  testnet: 'NEURAI_DEPIN_WSS_TESTNET',
};

/**
 * Where DePIN may talk to: any `wss://` service, or a plain `ws://` one only on
 * a host Android also lets through without TLS (`isCleartextAllowedHost`:
 * 192.168.0.x and 192.168.1.x). Unencrypted traffic never leaves the LAN.
 */
export function isAllowedDepinServerUrl(url: string): boolean {
  const match = /^(wss?):\/\/([^/:?#\s]+)(?::\d+)?(?:[/?#]\S*)?$/i.exec(url.trim());
  if (!match) return false;
  return match[1].toLowerCase() === 'wss' || isCleartextAllowedHost(match[2]);
}

const cache = new Map<NeuraiNetwork, DepinRpcConfig>();
const wssCache = new Map<NeuraiNetwork, string>();
/** Saved DePIN servers the current policy refuses, kept until the user decides. */
const incompatibleWss = new Map<NeuraiNetwork, string>();
let loaded = false;

export type DepinSuspension = 'not_loaded' | 'incompatible';

/** DePIN sends nothing: its settings are not read yet, or the saved server is no longer allowed. */
export class DepinServerSuspendedError extends Error {
  readonly reason: DepinSuspension;
  constructor(reason: DepinSuspension) {
    super(
      reason === 'incompatible'
        ? 'The saved DePIN server is no longer allowed: change it or choose the wallet server'
        : 'The DePIN server settings are still loading',
    );
    this.name = 'DepinServerSuspendedError';
    this.reason = reason;
  }
}
let loading: Promise<void> | null = null;

function parseConfig(raw: string | null): DepinRpcConfig | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  try {
    const obj = JSON.parse(raw) as Partial<DepinRpcConfig>;
    if (obj && typeof obj.url === 'string' && obj.url.length > 0) {
      return {
        url: obj.url,
        username: typeof obj.username === 'string' && obj.username.length > 0 ? obj.username : undefined,
        password: typeof obj.password === 'string' && obj.password.length > 0 ? obj.password : undefined,
      };
    }
  } catch {
    // Legacy/plain string value: treat it as a bare URL.
    if (/^https?:\/\//i.test(raw)) return { url: raw };
  }
  return undefined;
}

async function load(): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  for (const network of Object.keys(KEY_BY_NETWORK) as NeuraiNetwork[]) {
    const value = (await DefaultPreference.get(KEY_BY_NETWORK[network])) as string | null;
    const cfg = parseConfig(value);
    if (cfg) cache.set(network, cfg);
    const wss = (await DefaultPreference.get(WSS_KEY_BY_NETWORK[network])) as string | null;
    if (typeof wss !== 'string' || wss.trim().length === 0) continue;
    if (isAllowedDepinServerUrl(wss)) wssCache.set(network, wss);
    else incompatibleWss.set(network, wss);
  }
  loaded = true;
}

/** Like `loadOverrides`: a failed read is retried by the next call (H19). */
export function loadDepinRpcOverrides(): Promise<void> {
  if (!loading) {
    loading = Promise.all([load(), loadOverrides()])
      .then(() => undefined)
      .catch(error => {
        loading = null;
        throw error;
      });
  }
  return loading;
}

export function isDepinRpcOverridesLoaded(): boolean {
  return loaded;
}

/** User override for a network, or undefined if none set. */
export function getDepinRpcOverride(network: NeuraiNetwork): DepinRpcConfig | undefined {
  return cache.get(network);
}

/** A saved DePIN server the current policy refuses: shown to the user, never contacted. */
export function getIncompatibleDepinServer(network: NeuraiNetwork): string | undefined {
  return incompatibleWss.get(network);
}

/**
 * Why DePIN must not talk to any server on this network right now, or null.
 * Until both setting stores are read, the server the user chose is unknown.
 */
export function getDepinSuspension(network: NeuraiNetwork): DepinSuspension | null {
  if (incompatibleWss.has(network)) return 'incompatible';
  if (!loaded || !isOverridesLoaded()) return 'not_loaded';
  return null;
}

/** The WSS service set for DePIN alone on a network, or undefined: DePIN then uses the wallet's. */
export function getDepinWssOverride(network: NeuraiNetwork): string | undefined {
  return wssCache.get(network);
}

/** Sets (`wss://`, or `ws://` on the local network) or clears (null or empty) the WSS service for DePIN alone. */
export async function setDepinWssOverride(network: NeuraiNetwork, url: string | null): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const key = WSS_KEY_BY_NETWORK[network];
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) {
    await DefaultPreference.clear(key);
    wssCache.delete(network);
    incompatibleWss.delete(network);
    return;
  }
  if (!isAllowedDepinServerUrl(trimmed)) throw new Error('The DePIN server must be wss://, or ws:// on the local network');
  await DefaultPreference.set(key, trimmed);
  wssCache.set(network, trimmed);
  incompatibleWss.delete(network);
}

/**
 * Effective DePIN endpoint: the one set for DePIN, else the wallet's own WSS
 * service. A refused saved server is still the answer, so trust pins and the
 * screens name the server the user chose; `getDepinRpcBackend` contacts none.
 */
export function getDepinRpcConfig(network: NeuraiNetwork): DepinRpcConfig {
  // Old HTTP preferences remain stored for recovery but are never contacted.
  const url =
    incompatibleWss.get(network) ??
    wssCache.get(network) ??
    getWssUrlOverride(network) ??
    CHAIN_PARAMS[chainFor(network, 'legacy')].defaultWssUrl;
  return { url };
}

/** Persist (or clear, when `config` is null) the DePIN RPC config for a network. */
export async function setDepinRpcConfig(network: NeuraiNetwork, config: DepinRpcConfig | null): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const key = KEY_BY_NETWORK[network];
  const url = (config?.url ?? '').trim();
  if (url.length === 0) {
    await DefaultPreference.clear(key);
    cache.delete(network);
    return;
  }
  const normalized: DepinRpcConfig = {
    url,
    username: config?.username?.trim() || undefined,
    password: config?.password?.trim() || undefined,
  };
  await DefaultPreference.set(key, JSON.stringify(normalized));
  cache.set(network, normalized);
}

// Warm the cache at import. Until it resolves `getDepinRpcBackend` contacts no
// server; legacy HTTP settings remain stored but inactive.
loadDepinRpcOverrides().catch(() => {
  // Retried by the next caller; DePIN stays suspended meanwhile.
});
