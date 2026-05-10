import { Platform } from 'react-native';

import SettingsModule from './SettingsModule';

const requestKeyboardIncognitoMode = () => {
  if (Platform.OS !== 'android') return;

  SettingsModule?.requestKeyboardIncognitoMode().catch(() => undefined);
};

export default requestKeyboardIncognitoMode;
