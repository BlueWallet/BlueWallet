import { createStackNavigator } from 'react-navigation';

import { MainTabNavigator } from './MainTabNavigator';
import { EditTextNavigator } from './EditTextNavigator';

export const RootNavigator = createStackNavigator(
  {
    MainTabNavigator,
    EditTextNavigator,
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);
