import { Platform } from 'react-native';

import SettingsModule from './SettingsModule';

const requestKeyboardIncognitoMode = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    return (await SettingsModule?.requestKeyboardIncognitoMode()) ?? false;
  } catch {
    return false;
  }
};

export default requestKeyboardIncognitoMode;
