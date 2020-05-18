import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';

export default class SecureStorageService {
  async getSecuredValue(key: string): Promise<string> {
    return await RNSecureKeyStore.get(key);
  }

  async setSecuredValue(key: string, value: string): Promise<string> {
    return await RNSecureKeyStore.set(key, value, {
      accessible: ACCESSIBLE.WHEN_UNLOCKED,
    });
  }
}
