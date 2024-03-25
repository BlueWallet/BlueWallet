import { Linking, Alert } from 'react-native';
import loc from '../loc';
import { isDesktop } from '../blue_modules/environment';

export const openPrivacyDesktopSettings = () => {
  if (isDesktop) {
    Linking.openURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera');
  } else {
    Linking.openSettings();
  }
};

export const presentCameraNotAuthorizedAlert = (error: string) => {
  Alert.alert(
    loc.errors.error,
    error,
    [
      {
        text: loc.send.open_settings,
        onPress: openPrivacyDesktopSettings,
        style: 'default',
      },
      {
        text: loc._.ok,
        onPress: () => {},
        style: 'cancel',
      },
    ],
    { cancelable: true },
  );
};
