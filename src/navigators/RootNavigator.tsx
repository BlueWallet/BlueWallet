import { createStackNavigator } from 'react-navigation';

import { MainTabNavigator } from './MainTabNavigator';
import { MessageScreen } from 'screens';
import { EditTextNavigator } from './EditTextNavigator';

export const RootNavigator = createStackNavigator(
  {
    MainTabNavigator,
    Message: MessageScreen,
    EditTextNavigator,
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);
