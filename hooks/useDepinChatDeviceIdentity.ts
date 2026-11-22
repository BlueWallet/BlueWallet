import { useCallback, useEffect, useRef, useState } from 'react';

import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';

import { deviceDepinChatIdentity, type DepinChatIdentity, type DepinChatNetwork } from '../blue_modules/neurai/depinChatIdentity';
import { forgetDeviceSession } from '../blue_modules/neurai/depinDevice';
import { CHAIN_PARAMS } from '../blue_modules/neurai/networkConfig';
import { useNeuraiHwDevice } from '../blue_modules/neurai-hw/useNeuraiHwDevice';
import { withDevice } from '../blue_modules/neurai-hw/deviceQueue';

export type DepinDeviceIdentityPhase = 'idle' | 'connecting' | 'revealing' | 'ready' | 'error';

/**
 * The revealed identity and its live connection, kept at module scope so that
 * navigating out of the DePIN section and back does not mean pressing "connect
 * device" again — remounting the screen would otherwise start from scratch,
 * costing a USB permission prompt and a physical "REVEAL IDENTITY?" approval
 * for something the owner already authorized. Cleared by `reset()` and whenever
 * the device stops answering.
 */
const liveDevice: { current: { device: NeuraiESP32; identity: DepinChatIdentity } | null } = { current: null };

export interface UseDepinChatDeviceIdentityResult {
  /** The device-backed identity once revealed, else null. */
  identity: DepinChatIdentity | null;
  phase: DepinDeviceIdentityPhase;
  error: string | null;
  /** The live device, kept connected: the chat signs and opens through it. */
  device: NeuraiESP32 | null;
  /** Connect to the device and reveal its DePIN identity (one on-device approval). */
  reveal: () => Promise<void>;
  /** Drop the identity + connection (e.g. leaving the chat). */
  reset: () => Promise<void>;
}

/**
 * Device-backed DePIN chat identity for hardware wallets. Instead of deriving
 * the account-100 identity from a mnemonic (which a hardware wallet never
 * exposes — the cause of the infinite chat spinner), it asks the connected
 * NeuraiHW device for it via `getDepinIdentity()`.
 *
 * Requires firmware with DePIN RPC 6 / format 3 (`getDepinSupport`) and the
 * device unlocked (PIN entered on-device). The connection is held open: the
 * chat signs requests and opens messages on this same device.
 */
export function useDepinChatDeviceIdentity(params: { enabled: boolean; network: DepinChatNetwork }): UseDepinChatDeviceIdentityResult {
  const { enabled, network } = params;
  // The chat screen mounts/unmounts with navigation; keep the link across that.
  const hw = useNeuraiHwDevice({ keepAliveOnUnmount: true });
  const [identity, setIdentity] = useState<DepinChatIdentity | null>(() => liveDevice.current?.identity ?? null);
  const [phase, setPhase] = useState<DepinDeviceIdentityPhase>(() => (liveDevice.current ? 'ready' : 'idle'));
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<NeuraiESP32 | null>(liveDevice.current?.device ?? null);

  const reset = useCallback(async () => {
    forgetDeviceSession(deviceRef.current);
    deviceRef.current = null;
    liveDevice.current = null;
    setIdentity(null);
    setPhase('idle');
    setError(null);
    await hw.disconnect().catch(() => {});
  }, [hw]);

  const reveal = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setPhase('connecting');
    try {
      const device = await hw.connect();
      if (!device) throw new Error(hw.error || 'Could not connect to the device');
      deviceRef.current = device;

      // Feature-detect: old firmware has no DePIN identity support.
      const { capabilities = [] } = await withDevice(() => device.ping());
      if (!capabilities.includes('depin_identity')) {
        throw new Error('This firmware does not support DePIN chat — please update it');
      }
      // The chat needs DePIN RPC 6 with format-3 envelopes on the device.
      try {
        await withDevice(() => device.getDepinSupport());
      } catch {
        throw new Error('This firmware does not support DePIN messaging RPC 6 (format 3) — please update it');
      }

      setPhase('revealing');
      const res = await withDevice(() => device.getDepinIdentity()); // device prompts "REVEAL IDENTITY?"
      // The device signs for its own chain: refuse a mainnet device on a testnet wallet and vice versa.
      const chain = CHAIN_PARAMS[network];
      const deviceNetwork = res.network === 'xna' ? 'mainnet' : res.network === 'xna-test' ? 'testnet' : null;
      if (deviceNetwork && deviceNetwork !== chain.network) {
        throw new Error(`The device is set up for ${deviceNetwork}, but this wallet is on ${chain.network}`);
      }
      if (chain.expectedGenesisHash && res.genesis && res.genesis !== chain.expectedGenesisHash) {
        throw new Error('The device firmware is built for another chain (genesis mismatch) — please update it');
      }
      const built = deviceDepinChatIdentity({
        network,
        address: res.address,
        publicKey: res.pubkey,
        path: res.path,
      });
      liveDevice.current = { device, identity: built };
      setIdentity(built);
      setPhase('ready');
    } catch (e: any) {
      forgetDeviceSession(deviceRef.current);
      deviceRef.current = null;
      liveDevice.current = null;
      await hw.disconnect().catch(() => {});
      setIdentity(null);
      setError(String(e?.message ?? e ?? 'Failed to read the device DePIN identity'));
      setPhase('error');
    }
  }, [enabled, hw, network]);

  // Viewing another wallet only means this screen has nothing to show — it does
  // not mean the owner is done with the device. Drop the local state but keep
  // the link and the revealed identity cached, so coming back does not ask for
  // the USB permission and another on-device approval. `reset()` stays for the
  // explicit cases (device lost, user disconnects).
  useEffect(() => {
    if (!enabled) {
      setIdentity(null);
      setPhase('idle');
      setError(null);
      return;
    }
    // Enabled again with a link we still own: restore rather than re-ask.
    if (liveDevice.current) {
      deviceRef.current = liveDevice.current.device;
      setIdentity(liveDevice.current.identity);
      setPhase('ready');
    }
  }, [enabled]);

  // A restored connection may be stale (device unplugged while we were away).
  // Confirm it answers before presenting the chat as ready; otherwise fall back
  // to the connect button instead of failing on the first chat command.
  useEffect(() => {
    if (!enabled || !liveDevice.current || phase !== 'ready') return;
    let cancelled = false;
    const restored = liveDevice.current.device;
    (async () => {
      try {
        await withDevice(() => restored.ping());
      } catch {
        if (cancelled) return;
        liveDevice.current = null;
        deviceRef.current = null;
        setIdentity(null);
        setPhase('idle');
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per mount: a live device only needs re-checking after a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { identity, phase, error, device: deviceRef.current, reveal, reset };
}

export default useDepinChatDeviceIdentity;
