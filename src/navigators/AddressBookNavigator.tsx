import { createStackNavigator } from 'react-navigation';

import { AddressBookScreen } from 'screens';

export const AddressBookNavigator = createStackNavigator(
  {
    AddressBookScreen,
  },
  {
    headerMode: 'screen',
  },
);
