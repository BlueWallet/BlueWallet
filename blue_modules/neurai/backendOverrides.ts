/**
 * User overrides for the Neurai WSS backend URL, per network.
 *
 * Persisted with DefaultPreference (same namespace as the rest of the app).
 * Reads are sync against an in-memory cache populated at module init; writes
 * update both the cache and the persisted store. Existing wallets cache their
 * backend instance, so a URL change only takes effect for backends created
 * after the change — typically that means restarting the wallet flow or the
 * app.
 */

import DefaultPreference from 'react-native-default-preference';
import { GROUP_IO_BLUEWALLET } from '../currency';
import type { NeuraiNetwork } from './networkConfig';

const KEY_BY_NETWORK: Record<NeuraiNetwork, string> = {
  mainnet: 'NEURAI_WSS_MAINNET_URL',
  testnet: 'NEURAI_WSS_TESTNET_URL',
};

const cache = new Map<NeuraiNetwork, string>();
const rpcCache = new Map<NeuraiNetwork, string>();
let loaded = false;
let loading: Promise<void> | null = null;

async function load(): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  for (const network of Object.keys(KEY_BY_NETWORK) as NeuraiNetwork[]) {
    const value = (await DefaultPreference.get(KEY_BY_NETWORK[network])) as string | null;
    const rpc = await DefaultPreference.get(KEY_BY_NETWORK[network] + '_RPC');
    if (typeof rpc === 'string' && rpc.length > 0) rpcCache.set(network, rpc);
    if (typeof value === 'string' && value.length > 0) cache.set(network, value);
  }
  loaded = true;
}

/**
 * Reads the saved overrides once. A failed read is not kept: the next call
 * tries again, instead of every caller inheriting the same rejection until the
 * app restarts (H19).
 */
export function loadOverrides(): Promise<void> {
  if (!loading) {
    loading = load().catch(error => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

export function getWssUrlOverride(network: NeuraiNetwork): string | undefined {
  return cache.get(network);
}

export function isOverridesLoaded(): boolean {
  return loaded;
}

export async function setWssUrlOverride(network: NeuraiNetwork, url: string | null): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const key = KEY_BY_NETWORK[network];
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) {
    await DefaultPreference.clear(key);
    cache.delete(network);
    return;
  }
  await DefaultPreference.set(key, trimmed);
  cache.set(network, trimmed);
}

// Kick off the first read at module import. Until it resolves no wallet
// keeps a backend (AbstractNeuraiWallet.getBackend refuses), and the unlock
// waits for it, so a saved override is never bypassed by the default node.
loadOverrides().catch(() => {
  // Storage errors are non-fatal; defaults will be used.
});

/** Companion RPC is explicit; a custom WSS must never fall back to a public node. */
export function getWalletRpcUrlOverride(network: NeuraiNetwork): string | undefined {
  return rpcCache.get(network);
}
export async function setWalletRpcUrlOverride(network: NeuraiNetwork, url: string | null): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const key = KEY_BY_NETWORK[network] + '_RPC';
  const text = (url ?? '').trim();
  if (text) {
    await DefaultPreference.set(key, text);
    rpcCache.set(network, text);
  } else {
    await DefaultPreference.clear(key);
    rpcCache.delete(network);
  }
}
