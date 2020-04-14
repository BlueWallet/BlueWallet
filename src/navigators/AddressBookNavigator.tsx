import { createStackNavigator } from 'react-navigation';

import { AddressBookScreen } from 'screens';
import { Route } from 'consts';

export const AddressBookNavigator = createStackNavigator(
  {
    [Route.AddressBook]: { screen: AddressBookScreen },
  },
  {
    headerMode: 'screen',
  },
);
