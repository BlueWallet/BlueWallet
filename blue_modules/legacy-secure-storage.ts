import { NativeModules } from 'react-native';

type LegacySecureStorageModule = {
  // Some React Native bridge versions return undefined for a native nil.
  get(key: string): Promise<string | null | undefined>;
  contains(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
};

export const clearLegacySecureStorage = async (): Promise<void> => {
  if (!nativeModule) return;
  await nativeModule.clear();
};

const nativeModule = NativeModules.LegacySecureStorage as LegacySecureStorageModule | undefined;

export const hasLegacySecureValue = async (key: string): Promise<boolean> => {
  if (!nativeModule) return false;
  return await nativeModule.contains(key);
};

export const getLegacySecureValue = async (key: string): Promise<string | null> => {
  if (!nativeModule) return null;

  try {
    const value = await nativeModule.get(key);
    if (typeof value === 'string') return value;
    if (value !== null && value !== undefined) {
      console.debug('[LegacySecureStorage] Ignoring non-string value for key:', key);
    }
    return null;
  } catch (error) {
    console.warn(`Unable to read legacy secure-storage key ${key}:`, error);
    throw error;
  }
};

export const removeLegacySecureValue = async (key: string): Promise<void> => {
  if (!nativeModule) return;

  try {
    await nativeModule.remove(key);
  } catch (error) {
    console.warn(`Unable to remove legacy secure-storage key ${key}:`, error);
    throw error;
  }
};
