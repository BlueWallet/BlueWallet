import { createStackNavigator } from 'react-navigation';

import list from './receive/list';

const ReceiveNavigator = createStackNavigator(
  {
    SendList: {
      screen: list,
    },
  },
  {
    mode: 'modal',
  },
);

export default ReceiveNavigator;
