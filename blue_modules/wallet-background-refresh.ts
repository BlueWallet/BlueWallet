import { BlueApp as BlueAppClass } from '../class/blue-app';

const BlueApp = BlueAppClass.getInstance();

export const refreshWalletBalancesIfStorageIsUnencrypted = async (): Promise<void> => {
  const storageIsEncrypted = await BlueApp.storageIsEncrypted();
  if (storageIsEncrypted) {
    return;
  }

  // Guard against overwriting on-disk wallets with an empty list.
  // In a headless background run wallets may not have been loaded into memory
  // yet; persisting without loading would erase all stored wallets.
  if (BlueApp.getWallets().length === 0) {
    await BlueApp.loadFromDisk();
  }
  if (BlueApp.getWallets().length === 0) {
    return;
  }

  await BlueApp.fetchWalletBalances();
  await BlueApp.saveToDisk();
};