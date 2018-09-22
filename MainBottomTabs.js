import { createStackNavigator } from 'react-navigation';

import transactions from './screen/transactions';
import wallets from './screen/wallets';
import send from './screen/send';
import settings from './screen/settings';
import receive from './screen/receive';

const Tabs = createStackNavigator(
  {
    Wallets: {
      screen: wallets,
      path: 'wallets',
    },
    Transactions: {
      screen: transactions,
      path: 'trans',
    },
    Send: {
      screen: send,
      path: 'cart',
    },
    Receive: {
      screen: receive,
      path: 'receive',
    },
    Settings: {
      screen: settings,
      path: 'settings',
    },
  },
  {
    mode: 'modal',
    headerMode: 'none',
  },
);

export default Tabs;
