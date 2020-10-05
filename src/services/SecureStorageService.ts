import sha256 from 'crypto-js/sha256';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';

export default class SecureStorageService {
  async getSecuredValue(key: string): Promise<string> {
    try {
      const value = await RNSecureKeyStore.get(key);
      return value;
    } catch (_) {
      return '';
    }
  }

  async setSecuredValue(key: string, value: string, encode?: boolean): Promise<string> {
    if (encode) {
      value = sha256(value).toString();
    }
    return await RNSecureKeyStore.set(key, value, {
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async checkSecuredPassword(key: string, value: string) {
    const securedStoredPassword = await RNSecureKeyStore.get(key);
    return sha256(value).toString() === securedStoredPassword;
  }
}
