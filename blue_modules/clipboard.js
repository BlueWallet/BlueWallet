import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';

function BlueClipboard() {
  BlueClipboard.STORAGE_KEY = 'ClipboardReadAllowed';
  const isClipboardAccessAllowed = useAsyncStorage(BlueClipboard.STORAGE_KEY).getItem;
  const setIsClipboardAccessAllowed = useAsyncStorage(BlueClipboard.STORAGE_KEY).setItem;

  BlueClipboard.isReadClipboardAllowed = async () => {
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

  BlueClipboard.setReadClipboardAllowed = value => {
    setIsClipboardAccessAllowed(JSON.stringify(!!value));
  };

  BlueClipboard.getClipboardContent = async () => {
    const isAllowed = await BlueClipboard.isReadClipboardAllowed();
    if (isAllowed) {
      return Clipboard.getString();
    } else {
      return '';
    }
  };
}

BlueClipboard.default = new BlueClipboard();
export default BlueClipboard;
