import { createStackNavigator } from 'react-navigation';

import list from './receive/list';

const ReceiveNavigator = createStackNavigator(
  {
    SendList: {
      screen: list,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default ReceiveNavigator;
