import { createStackNavigator } from 'react-navigation';

import list from './send/list';

const SendNavigator = createStackNavigator(
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

export default SendNavigator;
