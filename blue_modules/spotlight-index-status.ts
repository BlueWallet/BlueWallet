type Listener = () => void;

const indexingCounts = new Map<string, number>();
const listeners = new Set<Listener>();

const emitChange = (): void => {
  listeners.forEach(listener => listener());
};

export const beginSpotlightWalletIndexing = (walletIDs: string[]): (() => void) => {
  const uniqueWalletIDs = [...new Set(walletIDs)];
  if (uniqueWalletIDs.length === 0) return () => {};

  for (const walletID of uniqueWalletIDs) {
    indexingCounts.set(walletID, (indexingCounts.get(walletID) ?? 0) + 1);
  }
  emitChange();

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;

    for (const walletID of uniqueWalletIDs) {
      const count = indexingCounts.get(walletID) ?? 0;
      if (count <= 1) {
        indexingCounts.delete(walletID);
      } else {
        indexingCounts.set(walletID, count - 1);
      }
    }
    emitChange();
  };
};

export const subscribeToSpotlightIndexing = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isWalletSpotlightIndexing = (walletID: string): boolean => (indexingCounts.get(walletID) ?? 0) > 0;
