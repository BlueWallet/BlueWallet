import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { UnlockTransaction } from 'app/screens';

export const UnlockTransactionNavaigator = createStackNavigator(
  {
    [Route.UnlockTransaction]: UnlockTransaction,
  },
  {
    headerMode: 'screen',
  },
);
