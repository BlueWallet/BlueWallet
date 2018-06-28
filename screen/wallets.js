import { StackNavigator } from 'react-navigation';

import WalletsList from './wallets/list';
import AddWallet from './wallets/add';
import WalletDetails from './wallets/details';
import WalletExport from './wallets/export';
import scanQrWif from './wallets/scanQrWif';

import details from './transactions/details';
import rbf from './transactions/RBF';
import createrbf from './transactions/RBF-create';

import receiveDetails from './receive/details';

const WalletsNavigator = StackNavigator(
  {
    WalletsList: {
      screen: WalletsList,
    },
    AddWallet: {
      screen: AddWallet,
    },
    ScanQrWif: {
      screen: scanQrWif,
    },
    WalletDetails: {
      screen: WalletDetails,
    },
    WalletExport: {
      screen: WalletExport,
    },

    //

    TransactionDetails: {
      screen: details,
    },
    RBF: {
      screen: rbf,
    },
    CreateRBF: {
      screen: createrbf,
    },

    //

    ReceiveDetails: {
      screen: receiveDetails,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default WalletsNavigator;
