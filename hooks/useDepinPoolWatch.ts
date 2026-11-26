/**
 * Background "new messages" indicator for the DePIN chat.
 *
 * Polls a verified RPC 6 bootstrap and reads its signed admission high water:
 * it needs no identity, no session and no device, so the check never asks the
 * owner to approve anything and never touches the hardware wallet. One small
 * request every 15 seconds is enough to notice that the channel moved; the actual
 * decryption still happens only when the
 * user opens the chat.
 *
 * The wallet list renders one card per wallet and they all watch the same node,
 * so the fetch is shared per network and only the comparison is per wallet —
 * ten cards still make one request.
 *
 * The marker means "the channel has new traffic" — whether a given message is
 * addressed to this wallet can only be known by decrypting it. It also stays on
 * while the chat counted messages the user has not opened yet (a private
 * message that came in while another conversation was on screen).
 */
import { getVerifiedPool, summarizeVerifiedPool } from '../blue_modules/neurai/depinPool';
import { getDepinRpcConfig } from '../blue_modules/neurai/depinRpcOverrides';
import { useCallback, useEffect, useState } from 'react';

import { getDepinRpcBackend, loadDepinRpcOverrides, type NeuraiNetwork } from '../blue_modules/neurai';
import {
  getSeenSignature,
  getUnreadCounts,
  getUnreadTotal,
  isMeaningfulSignature,
  loadSeenSignature,
  loadUnreadCounts,
  poolSignature,
  subscribePoolSeen,
} from '../blue_modules/neurai/depinPoolSeen';

/**
 * A few hundred bytes per check, shared across every card on the same network
 * and never touching the device, so this can be brisk enough to feel live.
 * Polling is the stopgap: once the node offers a WSS feed this whole hook
 * becomes a subscription and the interval disappears.
 */
const POOL_WATCH_INTERVAL_MS = 15_000;

/** Latest pool state per network, shared by every card watching that node. */
const latest = new Map<NeuraiNetwork, { signature: string; at: number }>();
const inFlight = new Map<NeuraiNetwork, Promise<void>>();
const watchers = new Set<() => void>();

async function refreshLatest(network: NeuraiNetwork): Promise<void> {
  const cached = latest.get(network);
  if (cached && Date.now() - cached.at < POOL_WATCH_INTERVAL_MS - 1_000) return;
  const pending = inFlight.get(network);
  if (pending) return pending;

  const request = (async () => {
    try {
      await loadDepinRpcOverrides();
      const backend = getDepinRpcBackend(network);
      const pool = await getVerifiedPool({
        call: (method, params) => backend.rpc(method, params),
        network,
        url: getDepinRpcConfig(network).url,
        persistPin: false,
      });
      const stats = summarizeVerifiedPool(pool);
      latest.set(network, { signature: poolSignature(stats), at: Date.now() });
      watchers.forEach(notify => notify());
    } catch {
      // Node unreachable: keep the previous state rather than clearing markers.
    }
  })().finally(() => inFlight.delete(network));

  inFlight.set(network, request);
  return request;
}

export function useDepinPoolWatch(params: { enabled: boolean; network: NeuraiNetwork; walletID: string }): {
  hasNewMessages: boolean;
  /** Unread messages per token, as the chat last counted them. */
  unreadCounts: Record<string, number>;
} {
  const { enabled, network, walletID } = params;
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const evaluate = useCallback(() => {
    setUnreadCounts(getUnreadCounts(walletID));
    const pending = getUnreadTotal(walletID) > 0;
    const current = latest.get(network)?.signature;
    if (!current || !isMeaningfulSignature(current)) {
      setHasNewMessages(pending);
      return;
    }
    const seen = getSeenSignature(walletID);
    // Nothing seen yet: treat the current state as the baseline rather than
    // greeting a first-time user with a permanent marker.
    setHasNewMessages(pending || (seen != null && seen !== current));
  }, [network, walletID]);

  useEffect(() => {
    if (!enabled) {
      setHasNewMessages(false);
      setUnreadCounts({});
      return;
    }
    let cancelled = false;

    const tick = () => {
      refreshLatest(network).then(() => {
        if (!cancelled) evaluate();
      });
    };

    (async () => {
      await Promise.all([loadSeenSignature(walletID), loadUnreadCounts(walletID)]);
      if (cancelled) return;
      evaluate();
      tick();
    })();

    const interval = setInterval(tick, POOL_WATCH_INTERVAL_MS);
    watchers.add(evaluate);
    // Reading the chat updates the stored signature — reflect it immediately
    // instead of waiting out the next tick.
    const unsubscribe = subscribePoolSeen(evaluate);
    return () => {
      cancelled = true;
      clearInterval(interval);
      watchers.delete(evaluate);
      unsubscribe();
    };
  }, [enabled, network, walletID, evaluate]);

  return { hasNewMessages, unreadCounts };
}

export default useDepinPoolWatch;
