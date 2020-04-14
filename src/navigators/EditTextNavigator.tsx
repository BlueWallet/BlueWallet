import { createStackNavigator } from 'react-navigation';

import { EditTextScreen } from 'screens/EditTextScreen';

export const EditTextNavigator = createStackNavigator(
  {
    EditText: EditTextScreen,
  },
  {
    headerMode: 'screen',
    mode: 'modal',
  },
);
