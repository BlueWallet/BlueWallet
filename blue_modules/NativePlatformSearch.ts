import { useSyncExternalStore } from 'react';
import NativePlatformSearch from '../codegen/NativePlatformSearch';

export const isPlatformSearchDeepLink = (url: string): boolean =>
  url.startsWith('bluewallet://wallet') || url.startsWith('bluewallet://transaction') || url.startsWith('bluewallet://contact');

export const popPendingPlatformSearchURL = async (): Promise<string | null> => NativePlatformSearch?.popPendingURL?.() ?? null;

type IndexingListener = () => void;
const indexingCounts = new Map<string, number>();
const indexingListeners = new Set<IndexingListener>();
const emitIndexingChange = (): void => indexingListeners.forEach(listener => listener());

export const beginPlatformSearchWalletIndexing = (walletIDs: string[]): (() => void) => {
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

const subscribeToPlatformSearchIndexing = (listener: IndexingListener): (() => void) => {
  indexingListeners.add(listener);
  return () => indexingListeners.delete(listener);
};

export const useIsWalletPlatformSearchIndexing = (walletID: string): boolean =>
  useSyncExternalStore(
    subscribeToPlatformSearchIndexing,
    () => (indexingCounts.get(walletID) ?? 0) > 0,
    () => false,
  );

export default NativePlatformSearch;
