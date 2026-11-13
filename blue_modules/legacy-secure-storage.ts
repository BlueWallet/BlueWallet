import { NativeModules } from 'react-native';

type LegacySecureStorageModule = {
  get(key: string): Promise<string | null | undefined>;
  remove(key: string): Promise<void>;
};

const nativeModule = NativeModules.LegacySecureStorage as LegacySecureStorageModule | undefined;

export const getLegacySecureValue = async (key: string): Promise<string | null> => {
  if (!nativeModule) return null;
  const value = await nativeModule.get(key);
  return typeof value === 'string' ? value : null;
};

export const removeLegacySecureValue = async (key: string): Promise<void> => {
  if (!nativeModule) return;
  await nativeModule.remove(key);
};
