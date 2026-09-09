/**
 * Wallet-side market discovery for the v2 swap client.
 *
 * The client resolves and quotes against ONE filtered market set, and the
 * limits UI reads the same set — two readers, free to disagree, unless one
 * filtered set feeds both. So this module owns the registry fetch, the
 * supersession rule, the refresh cadence and the stale fallback, and hands
 * the client an injected `discovery.snapshot`.
 *
 * Supersession policy (per solver `discovery_pubkey`):
 * - registry read SUCCEEDED and lists a card from the bundled solver →
 *   drop the bundled card entirely. The registry is authoritative for that
 *   solver, retirement included;
 * - registry read SUCCEEDED and does not list that solver → keep the
 *   bundled card (solver not yet published — today's actual state);
 * - registry read FAILED → keep serving the last authoritative snapshot
 *   (degraded); do not overwrite the cache with a bundled-only set and do
 *   not let it suppress the next refresh.
 *
 * The last rule exists because the SDK's own path does the opposite: a valid
 * local card is itself an ok source, so a bundled-only result reads as live,
 * overwrites the persisted cache and suppresses refetching for a full TTL.
 */

import { discover, type DiscoveredMarket, type LocalCardInput } from '@arkade-os/solver-discovery';

import bundledCard from './arkade-solver.card.json';
import type { AssetSwapRepository } from '@arkade-os/swap';

export type { DiscoveredMarket };

export const MARKETS_CACHE_TTL_MS = 60 * 60 * 1000;

export const SOLVER_REGISTRY_URL = 'https://arkade-os.github.io/solver-registry/bitcoin.json';

/** The solver pinned by the bundled card — supersession is keyed on this. */
export const BUNDLED_SOLVER_PUBKEY: string = (bundledCard as { discovery_pubkey: string }).discovery_pubkey;

/**
 * Solver cards shipped with the build: the cold-start and offline bootstrap.
 * Once the registry lists the solver, the bundled card's remaining job is
 * cold start and offline — the registry is the distribution mechanism.
 */
export const BUNDLED_CARDS: LocalCardInput[] = [{ card: bundledCard as LocalCardInput['card'], network: 'bitcoin' }];

export interface DiscoveryOptions {
  network?: string;
  registryUrl?: string | null;
  localCards?: LocalCardInput[];
}

/**
 * Which registry to ask and which cards ship with the build. The client
 * itself takes an injected snapshot (see `snapshotForClient`), so this is
 * the input to `discoverMarkets()` below — one definition feeds the client
 * and the limits UI alike.
 */
export const discoveryOptions = (network: string = 'bitcoin'): DiscoveryOptions => {
  if (network !== 'bitcoin') return { network, registryUrl: undefined, localCards: [] };
  return { network: 'bitcoin', registryUrl: SOLVER_REGISTRY_URL, localCards: [...BUNDLED_CARDS] };
};

// Last authoritative (registry-backed) answer, in process. The repository
// cache persists it across launches; this keeps serving it within a session
// while the registry is unreachable without another repo read.
let lastAuthoritative: { markets: DiscoveredMarket[]; fetchedAt: number } | null = null;

const isBundled = (m: DiscoveredMarket): boolean => (m as { discovery_pubkey?: string }).discovery_pubkey === BUNDLED_SOLVER_PUBKEY;

export interface DiscoverMarketsInput {
  repository?: AssetSwapRepository;
  network?: string;
  registryUrl?: string | null;
  localCards?: LocalCardInput[];
  fetchImpl?: typeof fetch;
  /** `false` forces a refetch past a fresh cache. Default true. */
  useCache?: boolean;
  now?: number;
}

/** Registry cards carrying the bundled solver's pubkey (any field shape). */
function sameSolver(m: DiscoveredMarket): boolean {
  return (m as { discovery_pubkey?: string }).discovery_pubkey === BUNDLED_SOLVER_PUBKEY;
}

async function discoverLocalOnly(localCards: LocalCardInput[], network: string, fetchImpl?: typeof fetch): Promise<DiscoveredMarket[]> {
  try {
    const discovered = await discover({
      registries: [],
      localCards,
      network: network as any,
      ...(fetchImpl ? { fetchImpl: fetchImpl as any } : {}),
    });
    return discovered.markets;
  } catch {
    return [];
  }
}

async function degradedFallback(
  readCache: () => Promise<{ markets: DiscoveredMarket[]; fetchedAt: number } | undefined>,
  localCards: LocalCardInput[],
  network: string,
  fetchImpl?: typeof fetch,
): Promise<DiscoveredMarket[]> {
  const fallback = lastAuthoritative ?? (await readCache());
  if (fallback) {
    lastAuthoritative = fallback;
    return fallback.markets;
  }
  return discoverLocalOnly(localCards, network, fetchImpl);
}

/**
 * The filtered market set: runs discovery, applies the supersession rule,
 * maintains the TTL cache and the degraded-source rule.
 */
export const discoverMarkets = async (input: DiscoverMarketsInput = {}): Promise<DiscoveredMarket[]> => {
  const {
    repository,
    network = 'bitcoin',
    registryUrl = SOLVER_REGISTRY_URL,
    localCards = [...BUNDLED_CARDS],
    fetchImpl,
    useCache = true,
    now = Date.now(),
  } = input;

  const cacheKey = { network, registry: registryUrl ?? '' };

  const readCache = async (): Promise<{ markets: DiscoveredMarket[]; fetchedAt: number } | undefined> => {
    if (!repository || !registryUrl) return undefined;
    try {
      return await repository.getCachedMarkets(cacheKey.network, cacheKey.registry);
    } catch {
      return undefined;
    }
  };

  const writeCache = async (markets: DiscoveredMarket[], fetchedAt: number): Promise<void> => {
    if (!repository || !registryUrl) return;
    try {
      await repository.saveCachedMarkets(cacheKey.network, cacheKey.registry, { markets, fetchedAt });
    } catch (e: any) {
      console.log('[arkade-markets] saveCachedMarkets failed:', e?.message ?? e);
    }
  };

  if (useCache) {
    const cached = await readCache();
    if (cached && now - cached.fetchedAt < MARKETS_CACHE_TTL_MS) {
      lastAuthoritative = { markets: cached.markets, fetchedAt: cached.fetchedAt };
      return cached.markets;
    }
    if (cached) lastAuthoritative = { markets: cached.markets, fetchedAt: cached.fetchedAt };
  }

  // No registry configured (non-bitcoin network): bundled/local cards only.
  if (!registryUrl) return discoverLocalOnly(localCards, network, fetchImpl);

  let result: { markets: DiscoveredMarket[]; sources: { sourceType: string; ok: boolean }[] };
  try {
    const discovered = await discover({
      registries: [registryUrl],
      localCards,
      network: network as any,
      ...(fetchImpl ? { fetchImpl: fetchImpl as any } : {}),
    });
    result = { markets: discovered.markets, sources: discovered.sources };
  } catch (e: any) {
    console.log('[arkade-markets] registry discovery failed:', e?.message ?? e);
    return degradedFallback(readCache, localCards, network, fetchImpl);
  }

  const registryOk = result.sources.some(s => s.sourceType === 'registry' && s.ok);
  const registryListsBundledSolver = result.markets.some(m => !isBundled(m) && sameSolver(m));

  // Supersession: the registry is authoritative for its solver.
  let filtered = result.markets;
  if (registryOk && registryListsBundledSolver) {
    filtered = result.markets.filter(m => !isBundled(m));
  }

  if (!registryOk) {
    // Degraded: a result whose only ok source is local must not overwrite
    // the last authoritative answer nor suppress the next refresh.
    const fallback = lastAuthoritative ?? (await readCache());
    if (fallback) {
      lastAuthoritative = fallback;
      return fallback.markets;
    }
    // No authoritative answer yet (today's actual state): the bundled card
    // is the bootstrap. Serve it, but do not stamp it as authoritative.
    return filtered;
  }

  lastAuthoritative = { markets: filtered, fetchedAt: now };
  await writeCache(filtered, now);
  return filtered;
};

/**
 * The client's discovery input: one filtered set, injected as a snapshot so
 * supersession re-runs on every refresh and the UI and the quote path agree.
 */
export const snapshotForClient = (markets: DiscoveredMarket[]): { snapshot: DiscoveredMarket[] } => ({ snapshot: markets });

/** Test-only reset of the in-process authoritative snapshot. */
export const __testing__ = {
  reset: (): void => {
    lastAuthoritative = null;
  },
};
