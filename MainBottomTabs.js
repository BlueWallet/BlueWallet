import { createStackNavigator } from 'react-navigation';

import wallets from './screen/wallets';
import settings from './screen/settings';

const Tabs = createStackNavigator(
  {
    Wallets: {
      screen: wallets,
      path: 'wallets',
    },
    Settings: {
      screen: settings,
      path: 'settings',
    },
  },
  {
    mode: 'modal',
    headerMode: 'none',
  },
);

export default Tabs;
