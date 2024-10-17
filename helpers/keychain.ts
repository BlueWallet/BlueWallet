import * as Keychain from 'react-native-keychain';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import { DEFAULT_SERVICE } from './intents';

const ACCESS_GROUP = GROUP_IO_BLUEWALLET;

/**
 * Stores key-value pairs in the Keychain.
 * @param {Record<string, string>} data - Dictionary-style object where keys are the Keychain keys and values are the data to store.
 */
export const storeInKeychain = async (data: Record<string, string>, service: string = DEFAULT_SERVICE): Promise<void> => {
  try {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        await Keychain.setGenericPassword(key, value, {
          service: `${service}.${key}`,
          accessGroup: ACCESS_GROUP,
        });
      }
    }
  } catch (error) {
    console.error('Error storing data in Keychain', error);
  }
};

/**
 * Retrieves a value from the Keychain by key.
 * @param {string} key - The key to retrieve from the Keychain.
 * @returns {Promise<Record<string, string> | null>} - The value from Keychain or null if not found.
 */
export const getFromKeychain = async (key: string): Promise<Record<string, string> | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${DEFAULT_SERVICE}.${key}`,
      accessGroup: ACCESS_GROUP,
    });
    if (credentials) {
      return {
        [credentials.username]: credentials.password,
      } as Record<string, string>;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving data from Keychain', error);
    return null;
  }
};

/**
 * Deletes a value from the Keychain by key.
 * @param {string} key - The key to delete from the Keychain.
 */
export const deleteFromKeychain = async (key: string): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({
      service: `${DEFAULT_SERVICE}.${key}`,
      accessGroup: ACCESS_GROUP,
    });
    console.log('Data successfully deleted from Keychain.');
  } catch (error) {
    console.error('Error deleting data from Keychain', error);
  }
};
