import { BlueApp as BlueAppClass } from '../class/blue-app';

const BlueApp = BlueAppClass.getInstance();

export const refreshWalletBalancesIfStorageIsUnencrypted = async (): Promise<void> => {
  const storageIsEncrypted = await BlueApp.storageIsEncrypted();
  if (storageIsEncrypted) {
    return;
  }

  await BlueApp.fetchWalletBalances();
  await BlueApp.saveToDisk();
};