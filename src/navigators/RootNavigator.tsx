import { createStackNavigator } from 'react-navigation';

import { MessageScreen } from 'app/screens';

import { EditTextNavigator } from './EditTextNavigator';
import { MainTabNavigator } from './MainTabNavigator';

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
