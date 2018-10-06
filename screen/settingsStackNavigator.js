import { createStackNavigator } from 'react-navigation';
import Settings from './settings/settings';
import About from './settings/about';
import Language from './settings/language';
import EncryptStorage from './settings/encryptStorage';

const SettingsNavigator = createStackNavigator({
  Settings: {
    screen: Settings,
    path: 'Settings',
  },
  About: {
    screen: About,
    path: 'About',
  },
  Language: {
    screen: Language,
    path: 'Language',
  },
  EncryptStorage: {
    screen: EncryptStorage,
    path: 'EncryptStorage',
  },
});

export default SettingsNavigator;
