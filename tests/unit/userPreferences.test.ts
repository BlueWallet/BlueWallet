import { getUserPreference, setUserPreference, clearUserPreference } from '../../helpers/userPreference';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';

describe('userPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreference', () => {
    it('should migrate value from DefaultPreference to group container if migrateToGroupContainer is true', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValueOnce('valueToMigrate');

      await getUserPreference({ key: 'testKey', migrateToGroupContainer: true });

      expect(DefaultPreference.get).toHaveBeenCalledWith('testKey');
      expect(DefaultPreference.setName).toHaveBeenCalledWith('group.io.bluewallet.bluewallet');
      expect(DefaultPreference.set).toHaveBeenCalledWith('testKey', 'valueToMigrate');
    });

    it('should migrate value from AsyncStorage to group container', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('asyncValue');

      const result = await getUserPreference({ key: 'testKey', useGroupContainer: true });

      expect(result).toBe('asyncValue');
      expect(DefaultPreference.setName).toHaveBeenCalledWith('group.io.bluewallet.bluewallet');
      expect(DefaultPreference.set).toHaveBeenCalledWith('testKey', 'asyncValue');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should migrate value from AsyncStorage to DefaultPreference without using group container', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('asyncValue');

      const result = await getUserPreference({ key: 'testKey', useGroupContainer: false });

      expect(result).toBe('asyncValue');
      expect(DefaultPreference.setName).not.toHaveBeenCalled();
      expect(DefaultPreference.set).toHaveBeenCalledWith('testKey', 'asyncValue');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should return true for boolean value "1"', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValueOnce('1');

      const result = await getUserPreference({ key: 'testKey' });
      expect(result).toBe(true);
    });

    it('should return false for boolean value "0"', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValueOnce('0');

      const result = await getUserPreference({ key: 'testKey' });
      expect(result).toBe(false);
    });

    it('should return parsed JSON if stored value is stringified JSON', async () => {
      const jsonString = JSON.stringify({ test: 'value' });
      (DefaultPreference.get as jest.Mock).mockResolvedValueOnce(jsonString);

      const result = await getUserPreference({ key: 'testKey' });
      expect(result).toEqual({ test: 'value' });
    });

    it('should return null if no value is found in DefaultPreference or AsyncStorage', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getUserPreference({ key: 'testKey' });
      expect(result).toBeNull();
    });
  });

  describe('setUserPreference', () => {
    it('should set boolean true as "1" in DefaultPreference', async () => {
      await setUserPreference({ key: 'testKey', value: true });

      expect(DefaultPreference.set).toHaveBeenCalledWith('testKey', '1');
    });

    it('should clear preference if boolean false is passed', async () => {
      await setUserPreference({ key: 'testKey', value: false });

      expect(DefaultPreference.clear).toHaveBeenCalledWith('testKey');
    });

    it('should set string value in DefaultPreference', async () => {
      await setUserPreference({ key: 'testKey', value: 'testValue' });

      expect(DefaultPreference.set).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('should set value in DefaultPreference with group container', async () => {
      await setUserPreference({ key: 'testKey', value: 'testValue', useGroupContainer: true });

      expect(DefaultPreference.setName).toHaveBeenCalledWith('group.io.bluewallet.bluewallet');
      expect(DefaultPreference.set).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('should remove key from AsyncStorage after setting value in DefaultPreference', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('testValue');
      await setUserPreference({ key: 'testKey', value: 'testValue' });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('clearUserPreference', () => {
    it('should clear value from DefaultPreference', async () => {
      await clearUserPreference({ key: 'testKey' });

      expect(DefaultPreference.clear).toHaveBeenCalledWith('testKey');
    });

    it('should clear value from DefaultPreference with group container', async () => {
      await clearUserPreference({ key: 'testKey', useGroupContainer: true });

      expect(DefaultPreference.setName).toHaveBeenCalledWith('group.io.bluewallet.bluewallet');
      expect(DefaultPreference.clear).toHaveBeenCalledWith('testKey');
    });
  });
});
