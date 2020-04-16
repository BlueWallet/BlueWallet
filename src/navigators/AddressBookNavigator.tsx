import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { AddressBookScreen } from 'app/screens';

export const AddressBookNavigator = createStackNavigator(
  {
    [Route.AddressBook]: { screen: AddressBookScreen },
  },
  {
    headerMode: 'screen',
  },
);
