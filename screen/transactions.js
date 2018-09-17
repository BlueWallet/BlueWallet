import { StackNavigator } from 'react-navigation';

import list from './transactions/list';

const TransactionsNavigator = StackNavigator(
  {
    TransactionsList: {
      screen: list,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default TransactionsNavigator;
