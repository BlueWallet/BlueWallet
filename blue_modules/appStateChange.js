import { useAsyncStorage } from '@react-native-community/async-storage';
import Clipboard from '@react-native-community/clipboard';

function AppStateChange() {
  AppStateChange.STORAGE_KEY = 'AppStateChangeClipboardAllowed';
  const isClipboardAccessAllowed = useAsyncStorage(AppStateChange.STORAGE_KEY).getItem;
  const setIsClipboardAccessAllowed = useAsyncStorage(AppStateChange.STORAGE_KEY).setItem;

  AppStateChange.isReadClipboardAllowed = async () => {
    try {
      const clipboardAccessAllowed = await isClipboardAccessAllowed();
      if (clipboardAccessAllowed === null) {
        await setIsClipboardAccessAllowed(JSON.stringify(true));
        return true;
      }
      return !!JSON.parse(clipboardAccessAllowed);
    } catch {
      await setIsClipboardAccessAllowed(JSON.stringify(true));
      return true;
    }
  };

  AppStateChange.setReadClipboardAllowed = value => {
    setIsClipboardAccessAllowed(JSON.stringify(value));
  };

  AppStateChange.getClipboardContent = async () => {
    const isAllowed = await AppStateChange.isReadClipboardAllowed();
    if (isAllowed) {
      return Clipboard.getString();
    } else {
      return '';
    }
  };
}

AppStateChange.default = new AppStateChange();
export default AppStateChange;
