import { StackNavigator } from 'react-navigation';

import list from './send/list';

const SendNavigator = StackNavigator(
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
