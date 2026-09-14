import NativeSpotlight from '../codegen/NativeSpotlight';

export type { Spec } from '../codegen/NativeSpotlight';

export const isSpotlightDeepLink = (url: string): boolean =>
  url.startsWith('bluewallet://wallet') || url.startsWith('bluewallet://transaction') || url.startsWith('bluewallet://contact');

export const popPendingSpotlightURL = async (): Promise<string | null> => {
  if (!NativeSpotlight || typeof NativeSpotlight.popPendingURL !== 'function') {
    console.debug('[Spotlight] Pending URL support is unavailable in this native build');
    return null;
  }
  return NativeSpotlight.popPendingURL();
};

export default NativeSpotlight;
