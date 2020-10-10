import { useAsyncStorage } from '@react-native-community/async-storage';
import Clipboard from '@react-native-community/clipboard';
import { Alert } from 'react-native';
import loc from '../loc';

function AppStateChange() {
  AppStateChange.STORAGE_KEY = 'AppStateChangeClipboardAllowed';
  AppStateChange.STORAGE_KEY_ASKED = 'AppStateChangeClipboardAllowedAsked';
  const hasClipboardAccessAsked = useAsyncStorage(AppStateChange.STORAGE_KEY_ASKED).getItem;
  const setHasClipboardAccessAsked = useAsyncStorage(AppStateChange.STORAGE_KEY_ASKED).setItem;
  const isClipboardAccessAllowed = useAsyncStorage(AppStateChange.STORAGE_KEY).getItem;
  const setIsClipboardAccessAllowed = useAsyncStorage(AppStateChange.STORAGE_KEY).setItem;

  AppStateChange.hasReadClipboardAuthorizationAsked = async () => {
    try {
      const hasAsked = await hasClipboardAccessAsked();
      await setHasClipboardAccessAsked(JSON.stringify(true));
      return !!JSON.parse(hasAsked);
    } catch {
      await setHasClipboardAccessAsked(JSON.stringify(true));
      return false;
    }
  };

  AppStateChange.isReadClipboardAllowed = async () => {
    try {
      const clipboardAccessAllowed = await isClipboardAccessAllowed();
      return !!JSON.parse(clipboardAccessAllowed);
    } catch {
      return false;
    }
  };

  AppStateChange.setReadClipboardAllowed = async value => {
    setHasClipboardAccessAsked(JSON.stringify(true));
    setIsClipboardAccessAllowed(JSON.stringify(value));
  };

  AppStateChange.setReadClipboardAllowedAskedTrue = () => {
    setHasClipboardAccessAsked(JSON.stringify(true));
  };

  AppStateChange.getClipboardContent = async () => {
    const isReadClipboardAsked = await AppStateChange.hasReadClipboardAuthorizationAsked();
    if (isReadClipboardAsked) {
      const isReadClipboardAllowed = await AppStateChange.isReadClipboardAllowed();
      if (isReadClipboardAllowed) {
        return Clipboard.getString();
      } else {
        return '';
      }
    } else {
      return AppStateChange.showReadClipboardAuthorizationRequest();
    }
  };

  AppStateChange.showReadClipboardAuthorizationRequest = () => {
    setHasClipboardAccessAsked(JSON.stringify(true));
    return new Promise(resolve =>
      Alert.alert(
        loc.settings.privacy_read_clipboard,
        loc.settings.privacy_read_clipboard_alert,
        [
          {
            text: loc._.dont_allow,
            onPress: () => {
              setIsClipboardAccessAllowed(JSON.stringify(false));
              resolve('');
            },
            style: 'cancel',
          },
          {
            text: loc._.allow,
            onPress: () => {
              setIsClipboardAccessAllowed(JSON.stringify(true));
              resolve(AppStateChange.getClipboardContent());
            },
          },
        ],
        { cancelable: false },
      ),
    );
  };
}

AppStateChange.default = new AppStateChange();
export default AppStateChange;
