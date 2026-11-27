/**
 * React hook that manages the lifecycle of a NeuraiHW (ESP32) USB connection.
 *
 * Orchestrates: device discovery → USB permission → open transport → expose a
 * connected `NeuraiESP32` instance. All device commands (`getInfo`,
 * `getAddress`, `signTransaction`, …) are called on `device` once `status` is
 * `"connected"`.
 *
 * Android only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { acquireLink, currentLink, releaseLink, type LinkHolder } from './sharedLink';
import { createNeuraiESP32OverUsb, type NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';
import { createUsbSerialDriver, ensureUsbPermission, isUsbSupported, listNeuraiHwDevices } from './usbSerialDriver';

export type NeuraiHwStatus = 'unsupported' | 'idle' | 'connecting' | 'connected' | 'error';

export interface UseNeuraiHwDevice {
  status: NeuraiHwStatus;
  error: string | null;
  /** The connected device, available while `status === 'connected'`. */
  device: NeuraiESP32 | null;
  /** Discover, request permission, and open the first available NeuraiHW. */
  connect: () => Promise<NeuraiESP32 | null>;
  /** Close the connection and reset state. */
  disconnect: () => Promise<void>;
}

export interface UseNeuraiHwDeviceOptions {
  /**
   * Leave the USB link open when this hook unmounts. Off by default: a signing
   * or pairing screen is done with the device when it goes away. The DePIN chat
   * opts in, because its screen mounts and unmounts as the user navigates and
   * reconnecting each time would mean another permission prompt and another
   * on-device approval. The caller then owns closing it (`disconnect`).
   */
  keepAliveOnUnmount?: boolean;
}

/** The DePIN chat keeps the link across navigation; it is the only screen that does. */
const KEPT_ALIVE_HOLDER = 'kept-alive';

export function useNeuraiHwDevice(options: UseNeuraiHwDeviceOptions = {}): UseNeuraiHwDevice {
  const { keepAliveOnUnmount = false } = options;
  const supported = isUsbSupported();
  const [status, setStatus] = useState<NeuraiHwStatus>(supported ? 'idle' : 'unsupported');
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<NeuraiESP32 | null>(null);
  const mounted = useRef(true);
  // Who holds the shared link (see sharedLink.ts). A screen that keeps the link
  // across unmounts uses one stable key, so remounting does not add holders
  // that nothing would ever release.
  const holder = useRef<LinkHolder>(keepAliveOnUnmount ? KEPT_ALIVE_HOLDER : Symbol('neurai-hw-screen'));

  useEffect(() => {
    mounted.current = true;
    const me = holder.current;
    return () => {
      mounted.current = false;
      if (keepAliveOnUnmount) return; // the caller keeps the link and closes it itself
      // Closes the port only if no other screen still holds the link.
      releaseLink(me).catch(() => {});
    };
  }, [keepAliveOnUnmount]);

  const disconnect = useCallback(async () => {
    await releaseLink(holder.current).catch(() => {});
    if (mounted.current) {
      setDevice(null);
      setStatus(supported ? 'idle' : 'unsupported');
      setError(null);
    }
  }, [supported]);

  const connect = useCallback(async (): Promise<NeuraiESP32 | null> => {
    if (!supported) {
      setStatus('unsupported');
      setError('USB serial is only available on Android');
      return null;
    }

    if (!currentLink()) setStatus('connecting');
    setError(null);

    try {
      const esp32 = await acquireLink(holder.current, async () => {
        const devices = await listNeuraiHwDevices();
        if (devices.length === 0) {
          throw new Error('No NeuraiHW device found. Connect it via USB-C and try again.');
        }
        const target = devices[0];
        const granted = await ensureUsbPermission(target.deviceId);
        if (!granted) {
          throw new Error('USB permission denied. Accept the Android dialog and try again.');
        }
        const opened = createNeuraiESP32OverUsb(createUsbSerialDriver(target.deviceId));
        await opened.connect();
        return opened;
      });

      if (!mounted.current) {
        if (!keepAliveOnUnmount) await releaseLink(holder.current).catch(() => {});
        return null;
      }
      setDevice(esp32);
      setStatus('connected');
      return esp32;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (mounted.current) {
        setStatus('error');
        setError(message);
      }
      return null;
    }
  }, [supported, keepAliveOnUnmount]);

  return { status, error, device, connect, disconnect };
}
