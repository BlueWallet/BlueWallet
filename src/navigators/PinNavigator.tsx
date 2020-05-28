import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { CreatePinScreen, ConfirmPinScreen, CurrentPinScreen } from 'app/screens';

export const PinNavigator = createStackNavigator(
  {
    [Route.CreatePin]: CreatePinScreen,
    [Route.CurrentPin]: CurrentPinScreen,
    [Route.ConfirmPin]: ConfirmPinScreen,
  },
  {
    headerMode: 'screen',
  },
);
