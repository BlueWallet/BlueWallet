import AsyncStorage from '@react-native-community/async-storage';

export default class StoreService {
  async getStoreValue(key: string): Promise<string> {
    try {
      const value = (await AsyncStorage.getItem(key)) || '';
      return value;
    } catch (_) {
      return '';
    }
  }

  async setStoreValue(key: string, value: string | boolean | number): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return;
  }
}
