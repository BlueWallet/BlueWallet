import { getFromKeychain, storeInKeychain, deleteFromKeychain } from './keychain';
import { TWallet } from '../class/wallets/types';

export const RECEIVE_BITCOIN_INTENT_KEY = 'receivebitcoin';

export const checkAndUpdateReceiveBitcoinIntent = async (wallets: TWallet[]): Promise<void> => {
  const storedData = await getFromKeychain(RECEIVE_BITCOIN_INTENT_KEY, true);

  if (!storedData) {
    console.debug('Receive Bitcoin Intent is not enabled.');
    return;
  }

  const { label: storedLabel, address: storedAddress, walletID: storedWalletID } = storedData;

  if (!storedLabel || !storedAddress || !storedWalletID) {
    console.debug('Stored data is incomplete. Removing intent data from the Keychain.');
    await deleteFromKeychain(RECEIVE_BITCOIN_INTENT_KEY, true);
    return;
  }

  const currentWallet = wallets.find(wallet => wallet.getID() === storedWalletID);

  if (!currentWallet) {
    console.debug('The wallet was deleted. Removing intent data from the Keychain.');
    await deleteFromKeychain(RECEIVE_BITCOIN_INTENT_KEY, true);
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
        walletID: currentWallet.getID() || '',
      },
      RECEIVE_BITCOIN_INTENT_KEY,
      true
    );
  } else {
    console.debug('No changes detected in the wallet.');
  }
};