/**
 * Live status of the Neurai service of each network, for the settings header:
 * the tip height the service reports and the round trip of one `ping`.
 *
 * Each check opens its own connection and closes it afterwards, so it never
 * disturbs the connection the wallets use. Results are kept for a short while,
 * so going back and forth between settings screens does not check again.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { createDefaultBackend, loadOverrides, NeuraiNetwork } from '../blue_modules/neurai';

export type BackendStatus = { state: 'checking' } | { state: 'ok'; ms: number; height: number } | { state: 'fail' };

export type BackendStatuses = Record<NeuraiNetwork, BackendStatus>;

const NETWORKS: NeuraiNetwork[] = ['mainnet', 'testnet'];
const FRESH_MS = 30_000;
const TIMEOUT_MS = 10_000;

let cache: { at: number; statuses: BackendStatuses } | null = null;

const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

async function check(network: NeuraiNetwork): Promise<BackendStatus> {
  const backend = createDefaultBackend(network, 'legacy');
  try {
    // The first call connects and reads the tip from the handshake; the ping
    // after it measures the round trip alone.
    const height = await withTimeout(backend.getTipHeight());
    const started = Date.now();
    const pong = await withTimeout(backend.ping());
    if (!pong) return { state: 'fail' };
    return { state: 'ok', ms: Date.now() - started, height };
  } catch {
    return { state: 'fail' };
  } finally {
    (backend as { disconnect?: () => void }).disconnect?.();
  }
}

const CHECKING: BackendStatuses = { mainnet: { state: 'checking' }, testnet: { state: 'checking' } };

export interface BackendStatusDetails {
  statuses: BackendStatuses;
  /** When the shown result was measured (ms since epoch); null while the first check runs. */
  checkedAt: number | null;
  /** Checks again now, even if the last result is still fresh. */
  recheck: () => void;
}

export function useBackendStatusDetails(): BackendStatusDetails {
  const [statuses, setStatuses] = useState<BackendStatuses>(() => cache?.statuses ?? CHECKING);
  const [checkedAt, setCheckedAt] = useState<number | null>(() => cache?.at ?? null);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (force: boolean) => {
    if (running.current) return;
    if (!force && cache && Date.now() - cache.at < FRESH_MS) {
      setStatuses(cache.statuses);
      setCheckedAt(cache.at);
      return;
    }
    running.current = true;
    setStatuses(CHECKING);
    try {
      await loadOverrides();
      const results = await Promise.all(NETWORKS.map(check));
      const next: BackendStatuses = { mainnet: results[0], testnet: results[1] };
      cache = { at: Date.now(), statuses: next };
      if (mounted.current) {
        setStatuses(next);
        setCheckedAt(cache.at);
      }
    } finally {
      running.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run(false);
    }, [run]),
  );

  const recheck = useCallback(() => {
    run(true);
  }, [run]);

  return { statuses, checkedAt, recheck };
}

export function useBackendStatus(): BackendStatuses {
  return useBackendStatusDetails().statuses;
}

export default useBackendStatus;
