import { Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';

interface UserPreferenceParams {
  key: string;
  value?: string | boolean;
  useGroupContainer?: boolean;
  migrateToGroupContainer?: boolean;
}

/**
 * Gets the value for a given key, migrating from AsyncStorage if necessary.
 * If `useGroupContainer` is true, DefaultPreference will use the group container for both platforms.
 * If the value is '1', return it as a boolean true. If the value is not found, it returns null.
 * If `migrateToGroupContainer` is true, it checks for the value in DefaultPreference without setting the name.
 * If the value is in a stringified JSON format, it parses it before returning.
 * @param params - The preference key and options.
 * @returns The stored value, parsed if needed, or null if not found.
 */
export const getUserPreference = async ({
  key,
  useGroupContainer = true,
  migrateToGroupContainer = false,
}: UserPreferenceParams): Promise<string | boolean | object | null> => {
  let storedValue: string | null = null;

  if (migrateToGroupContainer) {
    // First check without setting the group name
    storedValue = (await DefaultPreference.get(key)) ?? null;
    if (storedValue !== null) {
      // If the value is found, migrate it to the group container
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      await setUserPreference({ key, value: storedValue, useGroupContainer: true });
      return parseStoredValue(storedValue);
    }
  }

  if (useGroupContainer) {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  }

  if (Platform.OS === 'android' || useGroupContainer) {
    storedValue = (await DefaultPreference.get(key)) ?? null;
  } else if (Platform.OS === 'ios') {
    storedValue = (Settings.get(key) as string | undefined) ?? null;
  }
  // If the value is found, parse it if necessary
  if (storedValue !== null) {
    return parseStoredValue(storedValue);
  }

  // If no value is found in DefaultPreference or Settings, check AsyncStorage
  storedValue = await AsyncStorage.getItem(key);

  if (storedValue !== null) {
    // Migrate value to the appropriate storage
    await setUserPreference({ key, value: storedValue, useGroupContainer });
    await AsyncStorage.removeItem(key);
    return parseStoredValue(storedValue);
  }

  return null;
};

/**
 * Helper function to parse stored values.
 * @param value - The stored string value to be parsed.
 * @returns Parsed value if it's in JSON format, or the original value.
 */
const parseStoredValue = (value: string): string | boolean | object => {
  try {
    // Check if the value is a boolean stored as a string
    if (value === '1') {
      return true;
    }
    if (value === '0') {
      return false;
    }

    // Try to parse JSON if the value is in stringified JSON format
    const parsedValue = JSON.parse(value);
    if (typeof parsedValue === 'object') {
      return parsedValue;
    }
  } catch {
    // If parsing fails, return the original string value
    return value;
  }

  return value;
};

/**
 * Sets the value for a given key in the appropriate storage (DefaultPreference for Android, Settings for iOS).
 * If `useGroupContainer` is true, DefaultPreference will use the group container for both platforms.
 * If the value is a boolean, '1' is set for true and the key is cleared for false.
 * After setting the value, it clears it from AsyncStorage if it exists.
 * @param params - The preference key, value, and options.
 */
export const setUserPreference = async ({ key, value, useGroupContainer = false }: UserPreferenceParams): Promise<void> => {
  if (useGroupContainer) {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  }

  if (typeof value === 'boolean') {
    if (value) {
      value = '1'; // Convert true to '1'
    } else {
      // If false, clear the value
      await clearUserPreference({ key, useGroupContainer });
      return;
    }
  }

  if (Platform.OS === 'android' || useGroupContainer) {
    await DefaultPreference.set(key, value as string);
  } else if (Platform.OS === 'ios') {
    Settings.set({ [key]: value });
  }

  // Check if the key exists in AsyncStorage and remove it if present
  const asyncStorageValue = await AsyncStorage.getItem(key);
  if (asyncStorageValue !== null) {
    await AsyncStorage.removeItem(key);
  }
};

/**
 * Clears the value for a given key in the appropriate storage (DefaultPreference for Android, Settings for iOS).
 * If `useGroupContainer` is true, DefaultPreference will use the group container for both platforms.
 * @param params - The preference key and options.
 */
export const clearUserPreference = async ({ key, useGroupContainer = false }: UserPreferenceParams): Promise<void> => {
  if (useGroupContainer) {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  }

  if (Platform.OS === 'android' || useGroupContainer) {
    await DefaultPreference.clear(key);
  } else if (Platform.OS === 'ios') {
    Settings.set({ [key]: '' });
  }
};