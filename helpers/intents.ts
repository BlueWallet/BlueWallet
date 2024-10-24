import { getFromKeychain, storeInKeychain, deleteFromKeychain } from './keychain';
import { TWallet } from '../class/wallets/types';

export const WALLET_ADDRESS_INTENT_KEY = 'walletaddress';

export const checkAndUpdateWalletAddressIntent = async (wallets: TWallet[]): Promise<void> => {
  const storedData = await getFromKeychain(WALLET_ADDRESS_INTENT_KEY, true);

  if (!storedData) {
    console.debug('Receive Bitcoin Intent is not enabled.');
    return;
  }

  const { label: storedLabel, address: storedAddress, walletID: storedWalletID } = storedData;

  if (!storedLabel || !storedAddress || !storedWalletID) {
    console.debug('Stored data is incomplete. Removing intent data from the Keychain.');
    await deleteFromKeychain(WALLET_ADDRESS_INTENT_KEY, true);
    return;
  }

  const currentWallet = wallets.find(wallet => wallet.getID() === storedWalletID);

  if (!currentWallet) {
    console.debug('The wallet was deleted. Removing intent data from the Keychain.');
    await deleteFromKeychain(WALLET_ADDRESS_INTENT_KEY, true);
    return;
  }

  const currentLabel = currentWallet.getLabel().replace(/[^a-zA-Z0-9 ]/g, ''); // Handle special characters
  const currentAddress = await currentWallet.getAddressAsync();

  if (storedLabel !== currentLabel || storedAddress !== currentAddress) {
    console.debug('Wallet information changed. Updating Keychain.');
    await storeInKeychain(
      {
        address: currentAddress || '',
        label: currentLabel || '',
        walletID: currentWallet.getID() || '',
      },
      WALLET_ADDRESS_INTENT_KEY,
      true,
    );
  } else {
    console.debug('No changes detected in the wallet.');
  }
};
