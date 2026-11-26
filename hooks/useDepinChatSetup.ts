import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import {
  getDepinRpcBackend,
  getDepinRpcConfig,
  loadDepinRpcOverrides,
  type NeuraiBackend,
  type NeuraiNetwork,
} from '../blue_modules/neurai';
import { getVerifiedPool } from '../blue_modules/neurai/depinPool';
import type { DepinChatIdentity } from '../blue_modules/neurai/depinChatIdentity';
import type { DepinServerInfo } from '../components/depinChat/types';
import { ONE_COIN, PUBKEY_POLL_MS } from '../components/depinChat/constants';
import { normalizeAmount, parseRevealed } from '../components/depinChat/utils';

export type DepinRpc = <T = unknown>(method: string, params: unknown[]) => Promise<T>;

interface UseDepinChatSetupParams {
  /** Cached on-chain fact: the pubkey is already revealed, so the poll can be skipped from the first render. */
  knownRevealed?: boolean;
  identity: DepinChatIdentity | null;
  network: NeuraiNetwork;
  supported: boolean;
  /** Not on screen (another section of the home, or another screen): the tokens are not read. */
  paused?: boolean;
}

/** While the section is on screen, the tokens are read again at most this often if no block news arrive. */
const ASSETS_POLL_MS = 60_000;

/** Provides the RPC-backed state needed before a token conversation is opened. */
const useDepinChatSetup = ({ identity, network, supported, knownRevealed = false, paused = false }: UseDepinChatSetupParams) => {
  const backendRef = useRef<{ key: string; backend: NeuraiBackend } | null>(null);
  const rpc = useMemo<DepinRpc | null>(() => {
    if (!supported) return null;
    return async <T = unknown>(method: string, params: unknown[]): Promise<T> => {
      await loadDepinRpcOverrides();
      const config = getDepinRpcConfig(network);
      const key = `${config.url}|${config.username ?? ''}|${config.password ?? ''}`;
      if (!backendRef.current || backendRef.current.key !== key) {
        backendRef.current = { key, backend: getDepinRpcBackend(network) };
      }
      return backendRef.current.backend.rpc<T>(method, params);
    };
  }, [network, supported]);

  const getBackend = useCallback(() => backendRef.current?.backend ?? getDepinRpcBackend(network), [network]);
  const [chatAssets, setChatAssets] = useState<Record<string, number>>({});
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [serverInfo, setServerInfo] = useState<DepinServerInfo | null>(null);
  /**
   * How the pool key came to be trusted, for the UI to surface.
   * `firstContact` means it was accepted on trust (TOFU) and the fingerprint
   * is worth showing; `error` means nothing was verified and no pool data
   * should be displayed.
   */
  const [poolTrust, setPoolTrust] = useState<{
    firstContact: boolean;
    fingerprint: string | null;
    error: Error | null;
  }>({ firstContact: false, fingerprint: null, error: null });
  const [pubkeyRevealed, setPubkeyRevealed] = useState<boolean | null>(knownRevealed ? true : null);
  const [depinBalance, setDepinBalance] = useState<number | null>(null);

  const refreshServerInfo = useCallback(() => {
    if (!rpc) return Promise.resolve();
    // Protocol 2: `depingetmsginfo` answers `{ body, poolsig }`, and the key
    // that verifies the signature is inside the body. `getVerifiedPool` pins
    // it, so a substituted key is refused instead of silently adopted.
    //
    // On failure the state is deliberately CLEARED rather than left stale: an
    // unverified answer must not keep driving the UI.
    return getVerifiedPool({ call: rpc, network, url: getDepinRpcConfig(network).url })
      .then(pool => {
        setServerInfo(pool.info as unknown as DepinServerInfo);
        setPoolTrust({ firstContact: pool.firstContact, fingerprint: pool.fingerprint, error: null });
      })
      .catch(error => {
        console.debug('DePINChat: verified depingetmsginfo failed', error);
        setServerInfo(null);
        setPoolTrust({ firstContact: false, fingerprint: null, error: error as Error });
      });
  }, [rpc, network]);

  const loadAssets = useCallback(async () => {
    if (!rpc || !identity) return;
    setLoadingAssets(true);
    refreshServerInfo();
    try {
      const balances = (await rpc('listassetbalancesbyaddress', [identity.address])) as Record<string, unknown> | null;
      const assets: Record<string, number> = {};
      if (balances && typeof balances === 'object') {
        for (const name of Object.keys(balances)) {
          if (!name.startsWith('&')) continue;
          const amount = normalizeAmount(balances[name]);
          if (amount > 0) assets[name] = amount;
        }
      }
      setChatAssets(assets);
    } catch (error) {
      console.debug('DePINChat: listassetbalancesbyaddress failed', error);
    } finally {
      setLoadingAssets(false);
    }
  }, [identity, refreshServerInfo, rpc]);

  // The tokens are read each time the section comes on screen (it stays mounted
  // behind the home's other sections, so focus alone would read them once), and
  // again on every new block while it is there: a token just received shows up
  // once it is confirmed, without leaving and coming back.
  useEffect(() => {
    if (paused || !rpc || !identity) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      loadAssets().then(() => {
        if (cancelled) return;
        const backend = getBackend() as { onChainTip?: (listener: (height: number) => void) => () => void };
        unsubscribe = backend.onChainTip?.(() => loadAssets());
      });
    });
    const poll = setInterval(loadAssets, ASSETS_POLL_MS);
    return () => {
      cancelled = true;
      task.cancel();
      clearInterval(poll);
      unsubscribe?.();
    };
  }, [paused, rpc, identity, loadAssets, getBackend]);

  useEffect(() => {
    if (!rpc || !identity || pubkeyRevealed === true) return;
    let cancelled = false;
    const checkOnce = async () => {
      try {
        const response = await rpc('getpubkey', [identity.address]);
        if (!cancelled) setPubkeyRevealed(parseRevealed(response));
      } catch {
        if (!cancelled) setPubkeyRevealed(null);
      }
    };
    checkOnce();
    const interval = setInterval(checkOnce, PUBKEY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [identity, pubkeyRevealed, rpc]);

  useEffect(() => {
    if (!identity || pubkeyRevealed !== false || !rpc) return;
    let cancelled = false;
    (async () => {
      try {
        const utxos = await getBackend().getUtxos([identity.address]);
        const satoshis = (utxos ?? [])
          .filter(utxo => !utxo.assetName || utxo.assetName === 'XNA')
          .reduce((sum, utxo) => sum + (Number(utxo.satoshis) || 0), 0);
        if (!cancelled) setDepinBalance(satoshis / ONE_COIN);
      } catch (error) {
        console.debug('DePINChat: failed to load chat address balance', error);
        if (!cancelled) setDepinBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getBackend, identity, pubkeyRevealed, rpc]);

  return { chatAssets, depinBalance, getBackend, loadingAssets, poolTrust, pubkeyRevealed, refreshServerInfo, rpc, serverInfo };
};

export default useDepinChatSetup;
