import NativeSharedImageModule from '../codegen/NativeSharedImageModule';

export type PendingSharedQRCode = { value: string } | null;

export const isSharedImageWakeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol.toLowerCase() === 'bluewallet:' && parsed.hostname.toLowerCase() === 'shared-image';
  } catch {
    return false;
  }
};

export const popPendingSharedQRCode = async (): Promise<PendingSharedQRCode> => {
  return NativeSharedImageModule.popPendingImage();
};

export const forwardPendingSharedQRCode = (pending: PendingSharedQRCode, handler: (decodedContent: string) => void): boolean => {
  if (!pending) return false;
  handler(pending.value);
  return true;
};
