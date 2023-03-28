import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';

class BlueClipboard {
  static STORAGE_KEY = 'ClipboardReadAllowed';

  static isReadClipboardAllowed = async (): Promise<boolean> => {
    const isClipboardAccessAllowed = await useAsyncStorage(BlueClipboard.STORAGE_KEY).getItem();
    try {
      if (isClipboardAccessAllowed === null) {
        await useAsyncStorage(BlueClipboard.STORAGE_KEY).setItem(JSON.stringify(true));
        return true;
      }
      return !!JSON.parse(isClipboardAccessAllowed);
    } catch {
      await useAsyncStorage(BlueClipboard.STORAGE_KEY).setItem(JSON.stringify(true));
      return true;
    }
  };

  static setReadClipboardAllowed = (value: boolean): void => {
    useAsyncStorage(BlueClipboard.STORAGE_KEY).setItem(JSON.stringify(!!value));
  };

  static getClipboardContent = async (): Promise<string> => {
    const isAllowed = await BlueClipboard.isReadClipboardAllowed();
    if (isAllowed) {
      return Clipboard.getString();
    } else {
      return '';
    }
  };
}

export default new BlueClipboard();
