import { createStackNavigator } from 'react-navigation';

import { MainTabNavigator } from './MainTabNavigator';
import { MessageScreen } from 'screens';

export const RootNavigator = createStackNavigator(
  {
    MainTabNavigator,
    Message: MessageScreen,
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);
