import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { CreateTransactionPassword, ConfirmTransactionPassword } from 'app/screens';

export const PasswordNavigator = createStackNavigator(
  {
    [Route.CreateTransactionPassword]: CreateTransactionPassword,
    [Route.ConfirmTransactionPassword]: ConfirmTransactionPassword,
  },
  {
    headerMode: 'screen',
  },
);
