import NativeSharedImageModule from '../codegen/NativeSharedImageModule';
import bip21 from 'bip21';
import * as bitcoin from 'bitcoinjs-lib';

export type PendingSharedQRCode = { value?: string; values?: string[] } | null;

export const decodeQRCodeImage = async (base64Image: string): Promise<string | null> => {
  if (!NativeSharedImageModule) throw new Error('Shared image decoding is unavailable.');
  return NativeSharedImageModule.decodeImage(base64Image);
};

export const isSharedImageWakeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol.toLowerCase() === 'bluewallet:' &&
      parsed.hostname.toLowerCase() === 'shared-image' &&
      (parsed.pathname === '' || parsed.pathname === '/') &&
      parsed.search === '' &&
      parsed.hash === '' &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.port === ''
    );
  } catch {
    return false;
  }
};

export const popPendingSharedQRCode = async (): Promise<PendingSharedQRCode> => {
  if (!NativeSharedImageModule) throw new Error('Shared image decoding is unavailable.');
  return NativeSharedImageModule.popPendingImage();
};

export const pendingSharedBitcoinAddresses = (pending: PendingSharedQRCode): string[] => {
  if (!pending) return [];
  const candidates = pending.values ?? (pending.value ? [pending.value] : []);
  const addresses = candidates.flatMap(value => {
    let address = value.trim();
    try {
      address = bip21.decode(address.replace(/^bitcoin:(?:\/\/)?/i, 'bitcoin:')).address;
    } catch (_) {}
    try {
      bitcoin.address.toOutputScript(address);
      return [address];
    } catch (_) {
      return [];
    }
  });
  return [...new Set(addresses)];
};

export const forwardPendingSharedQRCode = (pending: PendingSharedQRCode, handler: (decodedContent: string) => void): boolean => {
  const value = pending?.value ?? pending?.values?.[0];
  if (!value) return false;
  handler(value);
  return true;
};

export const dispatchIncomingUrl = async (
  url: string,
  processSharedImage: () => Promise<void>,
  processDeeplink: (rawUrl: string) => void,
): Promise<'shared-image' | 'deeplink'> => {
  if (isSharedImageWakeUrl(url)) {
    await processSharedImage();
    return 'shared-image';
  }
  processDeeplink(url);
  return 'deeplink';
};
