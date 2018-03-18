import { StackNavigator } from 'react-navigation';

import list from './receive/list';
import details from './receive/details';

const ReceiveNavigator = StackNavigator(
  {
    SendList: {
      screen: list,
    },
    ReceiveDetails: {
      screen: details,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default ReceiveNavigator;
