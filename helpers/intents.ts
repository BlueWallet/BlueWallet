import { getFromKeychain, storeInKeychain, deleteFromKeychain } from './keychain';
import { TWallet } from '../class/wallets/types';

export const DEFAULT_SERVICE = 'io.bluewallet.bluewallet.receivebitcoin';
const INTENT_KEY = 'io.bluewallet.bluewallet.receivebitcoin';
/**
 * Helper function to check if the Receive Bitcoin Intent is enabled.
 * If enabled, it will verify if there's any change in the wallet information (ID, label, address).
 * If any change is detected, it updates the Keychain information accordingly.
 * If the wallet was deleted or is no longer available, it removes the data from Keychain.
 * @returns {Promise<void>}
 */
export const checkAndUpdateReceiveBitcoinIntent = async (wallets: TWallet[]): Promise<void> => {
  const intentKey = INTENT_KEY;

  const storedData = await getFromKeychain(intentKey);
  if (!storedData) {
    console.debug('Receive Bitcoin Intent is not enabled.');
    return;
  }

  const { label: storedLabel, address: storedAddress, walletID: storedWalletID } = storedData;

  if (!storedLabel || !storedAddress || !storedWalletID) {
    console.debug('Stored data is incomplete. Removing intent data from the Keychain.');
    await deleteFromKeychain(intentKey);
    return;
  }

  const currentWallet = wallets.find(wallet => wallet.getID() === storedWalletID);

  if (!currentWallet) {
    console.debug('The wallet was deleted. Removing intent data from the Keychain.');
    await deleteFromKeychain(intentKey);
    return;
  }

  const currentLabel = currentWallet.getLabel();
  const currentAddress = await currentWallet.getAddressAsync();

  if (storedLabel !== currentLabel || storedAddress !== currentAddress) {
    console.debug('Wallet information changed. Updating Keychain.');
    await storeInKeychain(
      {
        address: currentAddress || '',
        label: currentLabel || '',
        walletID: storedWalletID || '',
      },
      intentKey 
    );
  } else {
    console.debug('No changes detected in the wallet.');
  }
};
