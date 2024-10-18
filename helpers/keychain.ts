import * as Keychain from 'react-native-keychain';

export const GROUP_IO_BLUEWALLET = 'A7W54YZ4WU.group.io.bluewallet.bluewallet';

export const storeInKeychain = async (
  data: { address: string; label: string; walletID: string },
  service = 'receivebitcoin',
  useAccessGroup = true
): Promise<Error | null> => {
  const { address, label, walletID } = data;
  const qrDataString = `${encodeURIComponent(address)},${encodeURIComponent(label)},${encodeURIComponent(walletID)}`; // Encode special characters

  const keychainOptions: Keychain.Options = {
    service,
    accessGroup: useAccessGroup ? GROUP_IO_BLUEWALLET : undefined, // Use access group if applicable
  };

  try {
    const result = await Keychain.setGenericPassword('qrData', qrDataString, keychainOptions);
    if (!result) {
      throw new Error('Failed to store data in keychain');
    }
    return null; // No errors, success
  } catch (error) {
    console.error('Error storing data in keychain:', error);
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const getFromKeychain = async (
  key = 'receivebitcoin',
  useAccessGroup = true
): Promise<{ address: string; label: string; walletID: string } | null> => {
  const keychainOptions: Keychain.Options = {
    service: key,
    accessGroup: useAccessGroup ? GROUP_IO_BLUEWALLET : undefined, // Use access group if applicable
  };

  try {
    const credentials = await Keychain.getGenericPassword(keychainOptions);

    if (credentials) {
      const [address, label, walletID] = credentials.password.split(',').map(decodeURIComponent); // Decode special characters
      return { address, label, walletID };
    }

    return null; // No data found
  } catch (error) {
    console.error('Error retrieving data from keychain:', error);
    return null;
  }
};

export const deleteFromKeychain = async (key = 'receivebitcoin', useAccessGroup = true): Promise<void | Error> => {
  try {
    await Keychain.resetGenericPassword({
      service: key,
      accessGroup: useAccessGroup ? GROUP_IO_BLUEWALLET : undefined,
    });
    console.log('Data successfully deleted from keychain.');
  } catch (error) {
    console.error('Error deleting data from keychain:', error);
    return error instanceof Error ? error : new Error(String(error));
  }
};