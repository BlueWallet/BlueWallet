import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';

const STORAGE_KEY: string = 'ClipboardReadAllowed';

export const isReadClipboardAllowed = async (): Promise<boolean> => {
  try {
    const clipboardAccessAllowed = await AsyncStorage.getItem(STORAGE_KEY);
    if (clipboardAccessAllowed === null) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(true));
      return true;
    }
    return !!JSON.parse(clipboardAccessAllowed);
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(true));
    return true;
  }
};

export const setReadClipboardAllowed = (value: boolean): Promise<void> => {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(!!value));
};

export const getClipboardContent = async (): Promise<string | undefined> => {
  const isAllowed = await isReadClipboardAllowed();
  const hasString = (await Clipboard.hasString()) || false;
  if (isAllowed && hasString) {
    return Clipboard.getString();
  } else {
    return undefined;
  }
};
