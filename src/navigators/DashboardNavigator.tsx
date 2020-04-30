import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { DashboardScreen } from 'app/screens';

export const DashboardNavigator = createStackNavigator(
  {
    [Route.Dashboard]: DashboardScreen,
  },
  {
    mode: 'modal',
  },
);
