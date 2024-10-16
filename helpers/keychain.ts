import * as Keychain from 'react-native-keychain';

const DEFAULT_SERVICE = 'io.bluewallet.bluewallet'; // Generic service identifier
const ACCESS_GROUP = 'group.io.bluewallet.bluewallet'; // Keychain access group

/**
 * Stores any key-value pair in the Keychain.
 * @param {Record<string, string>} data - Dictionary-style object where keys are the keychain keys and values are the data to store.
 * @param {string} service - Service identifier for Keychain. Defaults to a generic service.
 */
export const storeInKeychain = async (
  data: Record<string, string>,
  service: string = DEFAULT_SERVICE,
): Promise<void> => {
  try {
    // Store each key-value pair
    for (const [key, value] of Object.entries(data)) {
      await Keychain.setGenericPassword(key, value, {
        service: `${service}.${key}`, // Unique service for each key
        accessGroup: ACCESS_GROUP,
      });
    }
    console.log('Data successfully stored in Keychain.');
  } catch (error) {
    console.error('Error storing data in Keychain', error);
  }
};

/**
 * Retrieves the data associated with the specified key.
 * @param {string} key - Key to retrieve the value for.
 * @param {string} service - Service identifier for Keychain. Defaults to a generic service.
 * @returns {Promise<string | null>}
 */
export const getFromKeychain = async (
  key: string,
  service: string = DEFAULT_SERVICE,
): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${service}.${key}`, // Unique service for each key
      accessGroup: ACCESS_GROUP,
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Error retrieving data from Keychain', error);
    return null;
  }
};

/**
 * Deletes the data associated with the specified key from the Keychain.
 * @param {string} key - Key to delete from the Keychain.
 * @param {string} service - Service identifier for Keychain. Defaults to a generic service.
 */
export const deleteFromKeychain = async (
  key: string,
  service: string = DEFAULT_SERVICE,
): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({
      service: `${service}.${key}`, // Unique service for each key
      accessGroup: ACCESS_GROUP,
    });
    console.log('Data successfully deleted from Keychain.');
  } catch (error) {
    console.error('Error deleting data from Keychain', error);
  }
};