import { xnaToSats } from '../blue_modules/neurai/amounts';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';

import type { NeuraiBackend, NeuraiNetwork } from '../blue_modules/neurai';
import type { DepinChatIdentity } from '../blue_modules/neurai/depinChatIdentity';
import type { AbstractNeuraiWallet } from '../class/wallets/abstract-neurai-wallet';
import presentAlert from '../components/Alert';
import { BURN_ADDRESS, REVEAL_AMOUNT_XNA, REVEAL_RETRY_MS } from '../components/depinChat/constants';
import loc from '../loc';
import type { DepinRpc } from './useDepinChatSetup';

interface UseDepinChatRevealParams {
  getBackend: () => NeuraiBackend;
  identity: DepinChatIdentity | null;
  network: NeuraiNetwork;
  rpc: DepinRpc | null;
  wallet: Pick<AbstractNeuraiWallet, 'buildDepinPubkeyRevealTransaction'> | null;
  /** Connected device — required to sign the reveal burn for a device-backed identity. */
  device?: NeuraiESP32 | null;
}

/** Broadcasts the pubkey-reveal burn and guards against duplicate submissions. */
const useDepinChatReveal = ({ getBackend, identity, network, rpc, wallet, device = null }: UseDepinChatRevealParams) => {
  const [revealing, setRevealing] = useState(false);
  const [revealPending, setRevealPending] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  const reveal = useCallback(async () => {
    if (!wallet || !identity || revealing || !rpc) return;
    if (identity.deviceBacked && !device) {
      presentAlert({ message: loc.depin.device_connect_hint });
      return;
    }
    setRevealing(true);
    try {
      const backend = getBackend();
      const utxos = await backend.getUtxos([identity.address]);
      const { signedHex } = await wallet.buildDepinPubkeyRevealTransaction({
        depinAddress: identity.address,
        depinWif: identity.wif,
        utxos,
        burnAddress: BURN_ADDRESS[network],
        amountSats: xnaToSats(String(REVEAL_AMOUNT_XNA)),
        device,
      });
      await backend.broadcast(signedHex);
      setRevealPending(true);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => setRevealPending(false), REVEAL_RETRY_MS);
      presentAlert({ message: loc.depin.reveal_waiting });
    } catch (error: any) {
      const message = String(error?.message ?? error);
      console.warn('useDepinChatReveal: reveal failed:', message);
      const isFundsError = /insufficient|funds|cover/i.test(message);
      presentAlert({
        // Keep the node's or device's reason: "try again" alone hides a failure that retrying cannot fix.
        message: isFundsError
          ? loc.formatString(loc.depin.reveal_need_funds, { amount: REVEAL_AMOUNT_XNA, ticker: 'XNA' })
          : `${loc.depin.reveal_failed}\n\n${message}`,
      });
    } finally {
      setRevealing(false);
    }
  }, [getBackend, identity, network, revealing, rpc, wallet, device]);

  return { reveal, revealPending, revealing };
};

export default useDepinChatReveal;
