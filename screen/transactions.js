import { StackNavigator } from 'react-navigation';

import list from './transactions/list';
import details from './transactions/details';
import rbf from './transactions/RBF';
import createrbf from './transactions/RBF-create';

const TransactionsNavigator = StackNavigator(
  {
    TransactionsList: {
      screen: list,
    },
    TransactionDetails: {
      screen: details,
    },
    RBF: {
      screen: rbf,
    },
    CreateRBF: {
      screen: createrbf,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default TransactionsNavigator;
