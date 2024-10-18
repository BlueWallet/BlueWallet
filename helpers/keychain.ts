import * as Keychain from 'react-native-keychain';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';

export const APP_INTENTS = ['receivebitcoin'];

export const storeInKeychain = async (
  data: { address: string; label: string; walletID: string },
  service: string,
  useAccessGroup: boolean = false
): Promise<Error | null> => {
  const { address, label, walletID } = data;
  const qrDataString = `${address},${label},${walletID}`; // Properly concatenating the values

  const keychainOptions: Keychain.Options = {
    service,
    accessGroup: useAccessGroup ? GROUP_IO_BLUEWALLET : undefined, 
  };

  try {
    console.debug('Storing in keychain with service:', service, 'and accessGroup:', keychainOptions.accessGroup);
    const result = await Keychain.setGenericPassword('qrData', qrDataString, keychainOptions);
    if (!result) {
      throw new Error('Failed to store data in keychain');
    }
    console.debug('Successfully stored data in keychain:', qrDataString);
    return null; // Success, no errors
  } catch (error) {
    console.error('Error storing data in keychain:', error);
    return Promise.reject(error); // Return the error object
  }
};

export const getFromKeychain = async (
  key: string,
  useAccessGroup: boolean = false
): Promise<{ address: string; label: string; walletID: string } | null> => {
  const keychainOptions: Keychain.Options = {
    service: key,
    accessGroup: useAccessGroup ? 'group.io.bluewallet.bluewallet' : undefined, // Ensure access group matches
  };

  try {
    console.debug('Fetching from keychain with service:', key, 'and accessGroup:', keychainOptions.accessGroup);
    const credentials = await Keychain.getGenericPassword(keychainOptions);

    if (credentials) {
      console.debug('Keychain data found:', credentials.password);
      const [address, label, walletID] = credentials.password.split(',');
      return { address, label, walletID };
    } else {
      console.debug('No credentials found in keychain');
    }

    return null;
  } catch (error) {
    console.error('Error retrieving data from keychain:', error);
    return null;
  }
};

export const deleteFromKeychain = async (key: string, useAccessGroup: boolean = false): Promise<void | Error> => {
  try {
    const accessGroup = useAccessGroup && APP_INTENTS.includes(key) ? GROUP_IO_BLUEWALLET : undefined;

    console.debug('Deleting from keychain with service:', `${GROUP_IO_BLUEWALLET}.${key}`, 'and accessGroup:', accessGroup);
    await Keychain.resetGenericPassword({
      service: `${GROUP_IO_BLUEWALLET}.${key}`,
      accessGroup,
    });

    console.debug('Data successfully deleted from keychain.');
  } catch (error) {
    console.error('Error deleting data from keychain:', error);
    return Promise.reject(error);
  }
};