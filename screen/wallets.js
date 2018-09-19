import { createStackNavigator } from 'react-navigation';

import WalletsList from './wallets/list';
import AddWallet from './wallets/add';
import ImportWallet from './wallets/import';
import WalletDetails from './wallets/details';
import WalletExport from './wallets/export';
import scanQrWif from './wallets/scanQrWif';

import details from './transactions/details';
import rbf from './transactions/RBF';
import createrbf from './transactions/RBF-create';

import receiveDetails from './receive/details';

import sendDetails from './send/details';
import sendScanQrAddress from './send/scanQrAddress';
import sendCreate from './send/create';

import ManageFunds from './lnd/manageFunds';
import ScanLndInvoice from './lnd/scanLndInvoice';

const WalletsNavigator = createStackNavigator(
  {
    WalletsList: {
      screen: WalletsList,
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

export default WalletsNavigator;
