import { StackNavigator } from 'react-navigation';

import list from './send/list';
import details from './send/details';
import scanQrAddress from './send/scanQrAddress';
import create from './send/create';

const SendNavigator = StackNavigator(
  {
    SendList: {
      screen: list,
    },
    SendDetails: {
      screen: details,
    },
    ScanQrAddress: {
      screen: scanQrAddress,
    },
    CreateTransaction: {
      screen: create,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default SendNavigator;
