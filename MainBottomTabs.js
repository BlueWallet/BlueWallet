import { createStackNavigator, createAppContainer } from 'react-navigation';

import Settings from './screen/settings/settings';
import About from './screen/settings/about';
import ReleaseNotes from './screen/settings/releasenotes';
import Licensing from './screen/settings/licensing';
import Selftest from './screen/selftest';
import Language from './screen/settings/language';
import Currency from './screen/settings/currency';
import EncryptStorage from './screen/settings/encryptStorage';
import PlausibleDeniability from './screen/plausibledeniability';
import LightningSettings from './screen/settings/lightningSettings';
import ElectrumSettings from './screen/settings/electrumSettings';
import GeneralSettings from './screen/settings/GeneralSettings';
import NetworkSettings from './screen/settings/NetworkSettings';
import DefaultView from './screen/settings/defaultView';

import WalletsList from './screen/wallets/list';
import WalletTransactions from './screen/wallets/transactions';
import AddWallet from './screen/wallets/add';
import PleaseBackup from './screen/wallets/pleaseBackup';
import PleaseBackupLNDHub from './screen/wallets/pleaseBackupLNDHub';
import ImportWallet from './screen/wallets/import';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import WalletXpub from './screen/wallets/xpub';
import BuyBitcoin from './screen/wallets/buyBitcoin';
import HodlHodl from './screen/wallets/hodlHodl';
import Marketplace from './screen/wallets/marketplace';
import ReorderWallets from './screen/wallets/reorderWallets';
import SelectWallet from './screen/wallets/selectWallet';

import details from './screen/transactions/details';
import TransactionStatus from './screen/transactions/transactionStatus';
import cpfp from './screen/transactions/CPFP';
import rbfBumpFee from './screen/transactions/RBFBumpFee';
import rbfCancel from './screen/transactions/RBFCancel';

import receiveDetails from './screen/receive/details';

import sendDetails from './screen/send/details';
import ScanQRCode from './screen/send/ScanQRCode';
import sendCreate from './screen/send/create';
import Confirm from './screen/send/confirm';
import PsbtWithHardwareWallet from './screen/send/psbtWithHardwareWallet';
import Success from './screen/send/success';
import Broadcast from './screen/send/broadcast';

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
      navigationOptions: {
        header: null,
      },
    },
    WalletTransactions: {
      screen: WalletTransactions,
      path: 'WalletTransactions',
      routeName: 'WalletTransactions',
    },
    TransactionStatus: {
      screen: TransactionStatus,
    },
    TransactionDetails: {
      screen: details,
    },
    WalletDetails: {
      screen: WalletDetails,
    },
    HodlHodl: {
      screen: HodlHodl,
    },
    CPFP: {
      screen: cpfp,
    },
    RBFBumpFee: {
      screen: rbfBumpFee,
    },
    RBFCancel: {
      screen: rbfCancel,
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
    SelectWallet: {
      screen: SelectWallet,
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
    Licensing: {
      screen: Licensing,
      path: 'Licensing',
    },
    DefaultView: {
      screen: DefaultView,
      path: 'DefaultView',
    },
    Language: {
      screen: Language,
      path: 'Language',
    },
    EncryptStorage: {
      screen: EncryptStorage,
      path: 'EncryptStorage',
    },
    GeneralSettings: {
      screen: GeneralSettings,
      path: 'GeneralSettings',
    },
    NetworkSettings: {
      screen: NetworkSettings,
      path: 'NetworkSettings',
    },
    PlausibleDeniability: {
      screen: PlausibleDeniability,
      path: 'PlausibleDeniability',
    },
    LightningSettings: {
      screen: LightningSettings,
      path: 'LightningSettings',
    },
    ElectrumSettings: {
      screen: ElectrumSettings,
      path: 'ElectrumSettings',
    },
    LNDViewInvoice: {
      screen: LNDViewInvoice,
      swipeEnabled: false,
      gesturesEnabled: false,
    },
    LNDViewAdditionalInvoiceInformation: {
      screen: LNDViewAdditionalInvoiceInformation,
    },
    Broadcast: {
      screen: Broadcast,
      navigationOptions: () => ({
        title: 'Broadcast',
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0,
        },
        headerTintColor: '#0c2550',
      }),
    },
  },
  { headerBackTitleVisible: false },
);

const CreateTransactionStackNavigator = createStackNavigator({
  SendDetails: {
    routeName: 'SendDetails',
    screen: sendDetails,
  },
  Confirm: {
    screen: Confirm,
  },
  PsbtWithHardwareWallet: {
    screen: PsbtWithHardwareWallet,
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
    navigationOptions: {
      headerRight: null,
    },
  },
});

const LNDCreateInvoiceStackNavigator = createStackNavigator({
  LNDCreateInvoice: {
    screen: LNDCreateInvoice,
  },
  SelectWallet: {
    screen: SelectWallet,
    navigationOptions: {
      headerLeft: null,
    },
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
    routeName: 'ImportWallet',
  },
  PleaseBackup: {
    screen: PleaseBackup,
  },
  PleaseBackupLNDHub: {
    screen: PleaseBackupLNDHub,
    swipeEnabled: false,
    gesturesEnabled: false,
    navigationOptions: {
      header: null,
    },
  },
});

const LightningScanInvoiceStackNavigator = createStackNavigator({
  ScanLndInvoice: {
    screen: ScanLndInvoice,
  },
  SelectWallet: {
    screen: SelectWallet,
    navigationOptions: {
      headerRight: null,
    },
  },
  Success: {
    screen: Success,
  },
});

const HandleOffchainAndOnChainStackNavigator = createStackNavigator(
  {
    SelectWallet: {
      screen: SelectWallet,
    },
    // LND:

    ScanLndInvoice: {
      screen: LightningScanInvoiceStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    ScanQRCode: {
      screen: ScanQRCode,
    },
    SendDetails: {
      screen: CreateTransactionStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
  },
  { headerBackTitleVisible: false },
);

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
    WalletExport: {
      screen: WalletExport,
    },
    WalletXpub: {
      screen: WalletXpub,
    },
    BuyBitcoin: {
      screen: BuyBitcoin,
    },
    Marketplace: {
      screen: Marketplace,
    },
    //
    SendDetails: {
      routeName: 'SendDetails',
      screen: CreateTransactionStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    SelectWallet: {
      screen: SelectWallet,
      navigationOptions: {
        headerLeft: null,
      },
    },

    ReceiveDetails: {
      screen: receiveDetails,
    },

    //

    // LND:

    ScanLndInvoice: {
      screen: LightningScanInvoiceStackNavigator,
      navigationOptions: {
        header: null,
      },
    },
    ScanQRCode: {
      screen: ScanQRCode,
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
    HandleOffchainAndOnChain: {
      screen: HandleOffchainAndOnChainStackNavigator,
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
