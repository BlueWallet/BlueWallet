/**
 * Neurai Connect configuration: which relay the wallet talks to, and which
 * CAIP-2 chain identifier corresponds to a given chain.
 *
 * One relay serves both networks — the chain travels encrypted inside the
 * messages, so the relay never sees it — hence a single URL setting. The
 * override exists for development (a relay on the host machine) and for users
 * who prefer another operator; it is persisted like `backendOverrides.ts`.
 */

import DefaultPreference from 'react-native-default-preference';
import { NEURAI_CHAIN_MAINNET, NEURAI_CHAIN_TESTNET } from '@neuraiproject/neurai-connect-core';
import { GROUP_IO_BLUEWALLET } from '../../currency';
import { isTestnetChain, type NeuraiChainType, type NeuraiNetwork } from '../networkConfig';
import { sameRelay } from './relay-url';

export const DEFAULT_RELAY_URL = 'wss://relay.neurai.org/v1';
const OVERRIDE_KEY = 'NEURAI_CONNECT_RELAY_URL';

let override: string | undefined;
let loading: Promise<void> | null = null;

async function load(): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const value = (await DefaultPreference.get(OVERRIDE_KEY)) as string | null;
  // Saved before the default was recognised (below): it is not an override.
  if (typeof value === 'string' && value.length > 0 && !sameRelay(value, DEFAULT_RELAY_URL)) override = value;
}

export function loadRelayOverride(): Promise<void> {
  if (!loading) loading = load();
  return loading;
}

export function getRelayUrl(): string {
  return override ?? DEFAULT_RELAY_URL;
}

export function getRelayUrlOverride(): string | undefined {
  return override;
}

export async function setRelayUrlOverride(url: string | null): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) {
    await DefaultPreference.clear(OVERRIDE_KEY);
    override = undefined;
    return;
  }
  if (!/^wss?:\/\//.test(trimmed)) throw new Error('the relay URL must start with ws:// or wss://');
  // The default is not an override, however it arrived (typed in, or from a
  // scanned code after a move to another relay): store it as no override, so
  // the settings do not call it custom.
  if (sameRelay(trimmed, DEFAULT_RELAY_URL)) {
    await DefaultPreference.clear(OVERRIDE_KEY);
    override = undefined;
    return;
  }
  await DefaultPreference.set(OVERRIDE_KEY, trimmed);
  override = trimmed;
}

/**
 * CAIP-2 identifier of a chain. These are constants and are never derived at
 * runtime (spec/session.md section 4): if one changed, every integration of that
 * network would stop recognising the others.
 */
export function caip2ForChain(chain: NeuraiChainType): string {
  return isTestnetChain(chain) ? NEURAI_CHAIN_TESTNET : NEURAI_CHAIN_MAINNET;
}

/** The network a CAIP-2 identifier belongs to, or undefined when it is not Neurai. */
export function networkForCaip2(chainId: string): NeuraiNetwork | undefined {
  if (chainId === NEURAI_CHAIN_MAINNET) return 'mainnet';
  if (chainId === NEURAI_CHAIN_TESTNET) return 'testnet';
  return undefined;
}

export { NEURAI_CHAIN_MAINNET, NEURAI_CHAIN_TESTNET };

void loadRelayOverride();
