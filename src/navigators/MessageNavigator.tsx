import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { MessageScreen } from 'app/screens';

export const MessageNavigator = createStackNavigator(
  {
    [Route.Message]: MessageScreen,
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);
