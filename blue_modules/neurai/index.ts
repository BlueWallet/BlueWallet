/**
 * Public surface of the Neurai network layer.
 *
 * Pick a backend with `createBackend(config)`. Default is WSS; RPC remains
 * available for explicitly injected local/test backends. ElectrumX is a stub today and will throw
 * on every call other than `ping()`.
 */

import { AddressDelta, BackendConfig, FeeEstimate, MempoolEntry, NeuraiBackend, NeuraiUtxo } from './NeuraiBackend';
import { CHAIN_PARAMS, NeuraiChainType, NeuraiNetwork, WalletKind, chainFor } from './networkConfig';
import { ElectrumXBackend } from './ElectrumXBackend';
import { RpcBackend } from './RpcBackend';
import { WssBackend } from './WssBackend';
import { getWssUrlOverride } from './backendOverrides';
import {
  DepinServerSuspendedError,
  getDepinRpcConfig,
  getDepinSuspension,
  getDepinWssOverride,
  type DepinSuspension,
} from './depinRpcOverrides';

export * from './networkConfig';
export * from './NeuraiBackend';
export { WssBackend } from './WssBackend';
export { RpcBackend } from './RpcBackend';
export { ElectrumXBackend } from './ElectrumXBackend';
export { loadOverrides, getWssUrlOverride, setWssUrlOverride, isOverridesLoaded } from './backendOverrides';
export {
  loadDepinRpcOverrides,
  getDepinRpcConfig,
  getDepinRpcOverride,
  getDepinWssOverride,
  getDepinSuspension,
  getIncompatibleDepinServer,
  DepinServerSuspendedError,
  type DepinSuspension,
  isAllowedDepinServerUrl,
  setDepinRpcConfig,
  setDepinWssOverride,
  isDepinRpcOverridesLoaded,
  DEFAULT_DEPIN_RPC_URL,
  type DepinRpcConfig,
} from './depinRpcOverrides';

/**
 * Temporary kill-switch: while the Neurai mainnet wallet-services WSS
 * deployment is not yet live, mainnet wallets must not try to talk to it —
 * otherwise every balance/history refresh throws and pollutes the UI.
 * Flip to `false` once `wallet-main-wss.neurai.org` is up.
 */
const MAINNET_BACKEND_DISABLED = false;

/** Inert backend: returns empty data, no network calls, no errors. Used to
 * neuter mainnet wallets while the mainnet WSS service is not yet deployed. */
class DisabledBackend implements NeuraiBackend {
  readonly kind = 'wss' as const;
  readonly chain: NeuraiChainType;
  constructor(chain: NeuraiChainType) {
    this.chain = chain;
  }

  async rpc<T = unknown>(): Promise<T> {
    throw new Error(`Neurai ${this.chain} backend is temporarily disabled (mainnet WSS not deployed)`);
  }

  async getTipHeight(): Promise<number> {
    return 0;
  }

  async getBalance(): Promise<bigint> {
    return 0n;
  }

  async getAddressHistory(): Promise<AddressDelta[]> {
    return [];
  }

  async getUtxos(): Promise<NeuraiUtxo[]> {
    return [];
  }

  async getMempool(): Promise<MempoolEntry[]> {
    return [];
  }

  async broadcast(): Promise<string> {
    throw new Error(`Neurai ${this.chain} backend is temporarily disabled (mainnet WSS not deployed)`);
  }

  async estimateFee(targetBlocks: number): Promise<FeeEstimate> {
    return { targetBlocks, feeRateXnaPerKb: 0 };
  }

  async getBlockTimes(): Promise<Record<number, number>> {
    return {};
  }

  async ping(): Promise<boolean> {
    return false;
  }
}

export function createBackend(config: BackendConfig): NeuraiBackend {
  switch (config.kind) {
    case 'wss':
      return new WssBackend(config);
    case 'rpc':
      return new RpcBackend(config);
    case 'electrumx':
      return new ElectrumXBackend(config);
  }
}

/**
 * Convenience: build the default backend straight from `(network, kind)`,
 * using neurai-wallet-services over WSS. Mainnet falls back to an inert
 * backend while the mainnet WSS service is not yet deployed (see
 * `MAINNET_BACKEND_DISABLED`).
 */
export function createDefaultBackend(network: NeuraiNetwork, kind: WalletKind): NeuraiBackend {
  const chain: NeuraiChainType = chainFor(network, kind);
  if (MAINNET_BACKEND_DISABLED && network === 'mainnet') {
    return new DisabledBackend(chain);
  }
  const params = CHAIN_PARAMS[chain];
  return createBackend({
    kind: 'wss',
    chain,
    url: getWssUrlOverride(network) ?? params.defaultWssUrl,
    authToken: params.defaultWssAuthToken,
    // Testnet was reset: a service still on the old chain must be refused,
    // not read with addresses and assets that no longer exist there.
    expectedGenesisHash: params.expectedGenesisHash,
  });
}

export function createDefaultWssBackend(network: NeuraiNetwork, kind: WalletKind): NeuraiBackend {
  return createDefaultBackend(network, kind);
}

/** A WSS backend on `url` for DePIN, with the network's chain checks. */
function createDepinWssBackend(network: NeuraiNetwork, url: string): NeuraiBackend {
  const chain: NeuraiChainType = chainFor(network, 'legacy');
  const params = CHAIN_PARAMS[chain];
  return createBackend({ kind: 'wss', chain, url, authToken: params.defaultWssAuthToken, expectedGenesisHash: params.expectedGenesisHash });
}

/**
 * Stands in for DePIN's backend while it must not talk to any server: every
 * call is refused, nothing is opened, so no other node receives the queries
 * (some carry addresses) meant for the server the user chose.
 */
class SuspendedDepinBackend implements NeuraiBackend {
  readonly kind = 'wss' as const;
  readonly chain: NeuraiChainType;
  readonly suspension: DepinSuspension;
  constructor(chain: NeuraiChainType, suspension: DepinSuspension) {
    this.chain = chain;
    this.suspension = suspension;
  }

  private refuse(): Promise<never> {
    return Promise.reject(new DepinServerSuspendedError(this.suspension));
  }

  rpc<T = unknown>(): Promise<T> {
    return this.refuse();
  }

  getTipHeight(): Promise<number> {
    return this.refuse();
  }

  getBalance(): Promise<bigint> {
    return this.refuse();
  }

  getAddressHistory(): Promise<AddressDelta[]> {
    return this.refuse();
  }

  getUtxos(): Promise<NeuraiUtxo[]> {
    return this.refuse();
  }

  getMempool(): Promise<MempoolEntry[]> {
    return this.refuse();
  }

  broadcast(): Promise<string> {
    return this.refuse();
  }

  estimateFee(): Promise<FeeEstimate> {
    return this.refuse();
  }

  getBlockTimes(): Promise<Record<number, number>> {
    return this.refuse();
  }

  async ping(): Promise<boolean> {
    return false;
  }
}

/**
 * DePIN's WSS service, with a reusable connection: the one set for DePIN alone
 * (getDepinWssOverride) or else the wallet's, checked against the same chain
 * as the wallet's. While `getDepinSuspension` gives a reason, a backend that
 * refuses every call.
 */
const depinBackends = new Map<NeuraiNetwork, { url: string; backend: NeuraiBackend }>();
export function getDepinRpcBackend(network: NeuraiNetwork): NeuraiBackend {
  const suspension = getDepinSuspension(network);
  if (suspension) return new SuspendedDepinBackend(chainFor(network, 'legacy'), suspension);
  const url = getDepinRpcConfig(network).url;
  const cached = depinBackends.get(network);
  if (cached?.url === url) return cached.backend;
  if (cached?.backend instanceof WssBackend) cached.backend.disconnect();
  const backend = getDepinWssOverride(network) ? createDepinWssBackend(network, url) : createDefaultBackend(network, 'legacy');
  depinBackends.set(network, { url, backend });
  return backend;
}
