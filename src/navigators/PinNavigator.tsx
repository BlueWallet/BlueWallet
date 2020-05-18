import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { CreatePinScreen, ConfirmPinScreen, CurrentPinScreen } from 'app/screens';

export const PinNavigator = createStackNavigator(
  {
    [Route.CurrentPin]: CurrentPinScreen,
    [Route.CreatePin]: CreatePinScreen,
    [Route.ConfirmPin]: ConfirmPinScreen,
  },
  {
    headerMode: 'screen',
  },
);
