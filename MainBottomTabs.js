import { createStackNavigator } from 'react-navigation';

import SettingsStackNavigator from './screen/settingsStackNavigator';
import WalletsList from './screen/wallets/list';
import Transactions from './screen/wallets/transactions';
import AddWallet from './screen/wallets/add';
import ImportWallet from './screen/wallets/import';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import scanQrWif from './screen/wallets/scanQrWif';

import details from './screen/transactions/details';
import rbf from './screen/transactions/RBF';
import createrbf from './screen/transactions/RBF-create';

import receiveDetails from './screen/receive/details';

import sendDetails from './screen/send/details';
import sendScanQrAddress from './screen/send/scanQrAddress';
import sendCreate from './screen/send/create';

import ManageFunds from './screen/lnd/manageFunds';
import ScanLndInvoice from './screen/lnd/scanLndInvoice';

const WalletsStackNavigator = createStackNavigator({
  Wallets: {
    screen: WalletsList,
    path: 'wallets',
  },
  WalletTransactions: {
    screen: Transactions,
  },
  Settings: {
    screen: SettingsStackNavigator,
  },
});

const Tabs = createStackNavigator(
  {
    Wallets: {
      screen: WalletsStackNavigator,
      path: 'wallets',
      navigationOptions: {
        header: null,
      },
    },
    AddWallet: {
      screen: AddWallet,
    },
    ImportWallet: {
      screen: ImportWallet,
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

    //

    SendDetails: {
      screen: sendDetails,
    },
    ScanQrAddress: {
      screen: sendScanQrAddress,
    },
    CreateTransaction: {
      screen: sendCreate,
    },

    // LND:

    ManageFunds: {
      screen: ManageFunds,
    },
    ScanLndInvoice: {
      screen: ScanLndInvoice,
    },
  },
  {
    mode: 'modal',
  },
);

export default Tabs;
