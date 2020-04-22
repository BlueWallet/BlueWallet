import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { SettingsScreen } from 'app/screens';

export const SettingsNavigator = createStackNavigator(
  {
    [Route.Settings]: SettingsScreen,
  },
  {
    mode: 'modal',
  },
);
