import { createStackNavigator, createAppContainer } from 'react-navigation';

import Settings from './screen/settings/settings';
import About from './screen/settings/about';
import ReleaseNotes from './screen/settings/releasenotes';
import Selftest from './screen/selftest';
import Language from './screen/settings/language';
import Currency from './screen/settings/currency';
import EncryptStorage from './screen/settings/encryptStorage';
import PlausibleDeniability from './screen/plausibledeniability';
import LightningSettings from './screen/settings/lightningSettings';
import WalletsList from './screen/wallets/list';
import WalletTransactions from './screen/wallets/transactions';
import AddWallet from './screen/wallets/add';
import ImportWallet from './screen/wallets/import';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import WalletXpub from './screen/wallets/xpub';
import BuyBitcoin from './screen/wallets/buyBitcoin';
import scanQrWif from './screen/wallets/scanQrWif';
import ReorderWallets from './screen/wallets/reorderWallets';
import SelectWallet from './screen/wallets/selectWallet';

import details from './screen/transactions/details';
import rbf from './screen/transactions/RBF';
import createrbf from './screen/transactions/RBF-create';

import receiveDetails from './screen/receive/details';
import setReceiveAmount from './screen/receive/receiveAmount';

import sendDetails from './screen/send/details';
import sendScanQrAddress from './screen/send/scanQrAddress';
import sendCreate from './screen/send/create';
import Confirm from './screen/send/confirm';
import Success from './screen/send/success';

import ManageFunds from './screen/lnd/manageFunds';
import ScanLndInvoice from './screen/lnd/scanLndInvoice';
import LappBrowser from './screen/lnd/browser';
import LNDCreateInvoice from './screen/lnd/lndCreateInvoice';
import LNDViewInvoice from './screen/lnd/lndViewInvoice';
import LNDViewAdditionalInvoiceInformation from './screen/lnd/lndViewAdditionalInvoiceInformation';

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
    Currency: {
      screen: Currency,
    },
    About: {
      screen: About,
      path: 'About',
    },
    ReleaseNotes: {
      screen: ReleaseNotes,
      path: 'ReleaseNotes',
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
    LNDViewInvoice: {
      screen: LNDViewInvoice,
      swipeEnabled: false,
      gesturesEnabled: false,
    },
    LNDViewAdditionalInvoiceInformation: {
      screen: LNDViewAdditionalInvoiceInformation,
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

const ManageFundsStackNavigator = createStackNavigator({
  ManageFunds: {
    screen: ManageFunds,
  },
  SelectWallet: {
    screen: SelectWallet,
  },
  SendDetails: {
    screen: CreateTransactionStackNavigator,
    navigationOptions: {
      header: null,
    },
  },
});

const LNDCreateInvoiceStackNavigator = createStackNavigator({
  LNDCreateInvoice: {
    screen: LNDCreateInvoice,
  },
  LNDViewInvoice: {
    screen: LNDViewInvoice,
    swipeEnabled: false,
    gesturesEnabled: false,
  },
  LNDViewAdditionalInvoiceInformation: {
    screen: LNDViewAdditionalInvoiceInformation,
  },
});

const CreateWalletStackNavigator = createStackNavigator({
  AddWallet: {
    screen: AddWallet,
  },
  ImportWallet: {
    screen: ImportWallet,
  },
});

const LightningScanInvoiceStackNavigator = createStackNavigator({
  ScanLndInvoice: {
    screen: ScanLndInvoice,
  },
  Success: {
    screen: Success,
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
      screen: CreateWalletStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    ScanQrWif: {
      screen: scanQrWif,
    },
    WalletExport: {
      screen: WalletExport,
    },
    WalletXpub: {
      screen: WalletXpub,
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

    ReceiveAmount: {
      screen: setReceiveAmount,
    },

    //

    // LND:

    ManageFunds: {
      screen: ManageFundsStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    ScanLndInvoice: {
      screen: LightningScanInvoiceStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    ScanQrAddress: {
      screen: sendScanQrAddress,
    },
    LappBrowser: {
      screen: LappBrowser,
    },

    ReorderWallets: {
      screen: ReorderWalletsStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    LNDCreateInvoice: {
      screen: LNDCreateInvoiceStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
  },
  {
    mode: 'modal',
  },
);

export default createAppContainer(MainBottomTabs);
