import { createStackNavigator } from 'react-navigation';

import { MainTabNavigator } from './MainTabNavigator';

export const RootNavigator = createStackNavigator(
  {
    MainTabNavigator,
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);
