import { createStackNavigator, createAppContainer } from 'react-navigation';

import Settings from './screen/settings/settings';
import About from './screen/settings/about';
import Selftest from './screen/selftest';
import Language from './screen/settings/language';
import EncryptStorage from './screen/settings/encryptStorage';
import PlausibleDeniability from './screen/plausibledeniability';
import LightningSettings from './screen/settings/lightningSettings';
import WalletsList from './screen/wallets/list';
import WalletTransactions from './screen/wallets/transactions';
import AddWallet from './screen/wallets/add';
import ImportWallet from './screen/wallets/import';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import BuyBitcoin from './screen/wallets/buyBitcoin';
import scanQrWif from './screen/wallets/scanQrWif';
import ReorderWallets from './screen/wallets/reorderWallets';
import SelectWallet from './screen/wallets/selectWallet';

import details from './screen/transactions/details';
import rbf from './screen/transactions/RBF';
import createrbf from './screen/transactions/RBF-create';

import receiveDetails from './screen/receive/details';

import sendDetails from './screen/send/details';
import sendScanQrAddress from './screen/send/scanQrAddress';
import sendCreate from './screen/send/create';
import Confirm from './screen/send/confirm';
import Success from './screen/send/success';

import ManageFunds from './screen/lnd/manageFunds';
import ScanLndInvoice from './screen/lnd/scanLndInvoice';

const ReorderWalletsStackNavigator = createStackNavigator({
  ReorderWallets: {
    screen: ReorderWallets,
  },
});

const WalletsStackNavigator = createStackNavigator(
  {
    Wallets: {
      screen: WalletsList,
      path: 'wallets',
    },
    WalletTransactions: {
      screen: WalletTransactions,
    },
    TransactionDetails: {
      screen: details,
    },
    WalletDetails: {
      screen: WalletDetails,
    },
    RBF: {
      screen: rbf,
    },
    CreateRBF: {
      screen: createrbf,
    },
    Settings: {
      screen: Settings,
      path: 'Settings',
      navigationOptions: {
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0,
          elevation: 0,
        },
        headerTintColor: '#0c2550',
      },
    },
    About: {
      screen: About,
      path: 'About',
    },
    Selftest: {
      screen: Selftest,
    },
    Language: {
      screen: Language,
      path: 'Language',
    },
    EncryptStorage: {
      screen: EncryptStorage,
      path: 'EncryptStorage',
    },
    PlausibleDeniability: {
      screen: PlausibleDeniability,
      path: 'PlausibleDeniability',
    },
    LightningSettings: {
      screen: LightningSettings,
      path: 'LightningSettings',
    },
  },
  { headerBackTitleVisible: false },
);

const CreateTransactionStackNavigator = createStackNavigator({
  SendDetails: {
    screen: sendDetails,
  },
  Confirm: {
    screen: Confirm,
  },
  CreateTransaction: {
    screen: sendCreate,
    navigationOptions: {
      headerStyle: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0,
      },
      headerTintColor: '#0c2550',
    },
  },
  Success: {
    screen: Success,
  },
  SelectWallet: {
    screen: SelectWallet,
  },
});

const MainBottomTabs = createStackNavigator(
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
    WalletExport: {
      screen: WalletExport,
    },
    BuyBitcoin: {
      screen: BuyBitcoin,
    },
    //
    SendDetails: {
      screen: CreateTransactionStackNavigator,
      navigationOptions: {
        header: null,
      },
    },

    //

    ReceiveDetails: {
      screen: receiveDetails,
    },

    //

    // LND:

    ManageFunds: {
      screen: ManageFunds,
    },
    ScanLndInvoice: {
      screen: ScanLndInvoice,
    },
    ScanQrAddress: {
      screen: sendScanQrAddress,
    },
    ReorderWallets: {
      screen: ReorderWalletsStackNavigator,
      navigationOptions: {
        header: null,
      },
    },

    // Select Wallet. Mostly for deeplinking

    SelectWallet: {
      screen: SelectWallet,
    },
  },
  {
    mode: 'modal',
  },
);

export default createAppContainer(MainBottomTabs);
