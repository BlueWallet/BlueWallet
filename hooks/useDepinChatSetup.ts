import { useCallback, useEffect, useMemo, useState } from 'react';
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
/** While the address still waits for the funds of its reveal, its balance is read again this often. */
const BALANCE_POLL_MS = 15_000;

/** Provides the RPC-backed state needed before a token conversation is opened. */
const useDepinChatSetup = ({ identity, network, supported, knownRevealed = false, paused = false }: UseDepinChatSetupParams) => {
  // Every access asks for the backend in force now: `getDepinRpcBackend` keeps
  // one connection per network and URL, and refuses while DePIN is suspended.
  // Keeping a reference here let a balance read reach the previous server
  // after the user changed it (third review).
  const getBackend = useCallback((): NeuraiBackend => getDepinRpcBackend(network), [network]);
  const rpc = useMemo<DepinRpc | null>(() => {
    if (!supported) return null;
    return async <T = unknown>(method: string, params: unknown[]): Promise<T> => {
      await loadDepinRpcOverrides();
      return getBackend().rpc<T>(method, params);
    };
  }, [getBackend, supported]);
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
  const [depinIncoming, setDepinIncoming] = useState(0);

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

  // The DePIN address's confirmed XNA, which the reveal spends, and the XNA on
  // its way to it in the mempool, which it can spend once confirmed.
  const loadBalance = useCallback(async () => {
    if (!identity) return;
    try {
      const backend = getBackend();
      const [utxos, mempool] = await Promise.all([
        backend.getUtxos([identity.address]),
        backend.getMempool([identity.address]).catch(() => []),
      ]);
      const isXna = (assetName?: string) => !assetName || assetName === 'XNA';
      const confirmed = (utxos ?? []).filter(utxo => isXna(utxo.assetName)).reduce((sum, utxo) => sum + BigInt(utxo.satoshis), 0n);
      const pending = (mempool ?? []).filter(entry => isXna(entry.assetName)).reduce((sum, entry) => sum + BigInt(entry.satoshis), 0n);
      setDepinBalance(Number(confirmed) / ONE_COIN);
      setDepinIncoming(pending > 0n ? Number(pending) / ONE_COIN : 0);
    } catch (error) {
      console.debug('DePINChat: failed to load chat address balance', error);
      setDepinBalance(null);
      setDepinIncoming(0);
    }
  }, [getBackend, identity]);

  // Until the pubkey is revealed, the balance is read when the section shows,
  // on every new block and every few seconds: the funds sent for the reveal
  // show up (from the mempool) without leaving the section and coming back.
  useEffect(() => {
    if (paused || !identity || pubkeyRevealed !== false || !rpc) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    loadBalance().then(() => {
      if (cancelled) return;
      const backend = getBackend() as { onChainTip?: (listener: (height: number) => void) => () => void };
      unsubscribe = backend.onChainTip?.(() => loadBalance());
    });
    const poll = setInterval(loadBalance, BALANCE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
      unsubscribe?.();
    };
  }, [paused, identity, pubkeyRevealed, rpc, loadBalance, getBackend]);

  return {
    chatAssets,
    depinBalance,
    depinIncoming,
    getBackend,
    loadingAssets,
    poolTrust,
    pubkeyRevealed,
    refreshServerInfo,
    rpc,
    serverInfo,
  };
};

export default useDepinChatSetup;
