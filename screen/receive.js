import { StackNavigator } from 'react-navigation';

import list from './receive/list';

const ReceiveNavigator = StackNavigator(
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
