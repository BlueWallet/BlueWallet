import { createStackNavigator } from 'react-navigation';
import WalletsList from './wallets/list';
import Settings from '../screen/settings/settings';
import About from '../screen/settings/about';
import Language from '../screen/settings/language';
import EncryptStorage from '../screen/settings/encryptStorage';

const WalletsNavigator = createStackNavigator({
  WalletsList: {
    screen: WalletsList,
  },
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

export default WalletsNavigator;
