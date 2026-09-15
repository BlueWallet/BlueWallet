import { useSyncExternalStore } from 'react';
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

type IndexingListener = () => void;
const indexingCounts = new Map<string, number>();
const indexingListeners = new Set<IndexingListener>();
const emitIndexingChange = (): void => indexingListeners.forEach(listener => listener());

export const beginSpotlightWalletIndexing = (walletIDs: string[]): (() => void) => {
  const uniqueWalletIDs = [...new Set(walletIDs)];
  if (uniqueWalletIDs.length === 0) return () => {};

  uniqueWalletIDs.forEach(walletID => indexingCounts.set(walletID, (indexingCounts.get(walletID) ?? 0) + 1));
  emitIndexingChange();

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    uniqueWalletIDs.forEach(walletID => {
      const count = indexingCounts.get(walletID) ?? 0;
      if (count <= 1) indexingCounts.delete(walletID);
      else indexingCounts.set(walletID, count - 1);
    });
    emitIndexingChange();
  };
};

const subscribeToSpotlightIndexing = (listener: IndexingListener): (() => void) => {
  indexingListeners.add(listener);
  return () => indexingListeners.delete(listener);
};

export const useIsWalletSpotlightIndexing = (walletID: string): boolean =>
  useSyncExternalStore(
    subscribeToSpotlightIndexing,
    () => (indexingCounts.get(walletID) ?? 0) > 0,
    () => false,
  );

export default NativeSpotlight;
