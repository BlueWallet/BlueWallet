import React from 'react';
import { createStackNavigator, createAppContainer } from 'react-navigation';

import { Header } from 'app/components';
import { DashboardScreen } from 'app/screens';
import { NavigationService } from 'app/services';

import PlausibleDeniability from './screen/plausibledeniability';
import receiveDetails from './screen/receive/details';
import setReceiveAmount from './screen/receive/receiveAmount';
import Selftest from './screen/selftest';
import Confirm from './screen/send/confirm';
import sendCreate from './screen/send/create';
import sendDetails from './screen/send/details';
import PsbtWithHardwareWallet from './screen/send/psbtWithHardwareWallet';
import ScanQRCode from './screen/send/scanQrAddress';
import Success from './screen/send/success';
import About from './screen/settings/about';
import Currency from './screen/settings/currency';
import DefaultView from './screen/settings/defaultView';
import ElectrumSettings from './screen/settings/electrumSettings';
import EncryptStorage from './screen/settings/encryptStorage';
import Language from './screen/settings/language';
import ReleaseNotes from './screen/settings/releasenotes';
import SettingsContainer from './screen/settings/settings';
import cpfp from './screen/transactions/CPFP';
import rbf from './screen/transactions/RBF';
import createrbf from './screen/transactions/RBF-create';
import rbfBumpFee from './screen/transactions/RBFBumpFee';
import rbfCancel from './screen/transactions/RBFCancel';
import details from './screen/transactions/details';
import TransactionStatus from './screen/transactions/transactionStatus';
import BuyBitcoin from './screen/wallets/buyBitcoin';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import ImportWallet from './screen/wallets/import';
import WalletsList from './screen/wallets/list';
import Marketplace from './screen/wallets/marketplace';
import PleaseBackup from './screen/wallets/pleaseBackup';
import ReorderWallets from './screen/wallets/reorderWallets';
import scanQrWif from './screen/wallets/scanQrWif';
import SelectWallet from './screen/wallets/selectWallet';
import WalletTransactions from './screen/wallets/transactions';
import WalletXpub from './screen/wallets/xpub';

const ReorderWalletsStackNavigator = createStackNavigator({
  ReorderWallets: {
    screen: ReorderWallets,
  },
});

const WalletsStackNavigator = createStackNavigator({
  Wallets: {
    // screen: WalletsList,
    screen: DashboardScreen,
    path: 'wallets',
    // headerMode: 'none',
    navigationOptions: {
      header: () => <Header title="Wallets" addFunction={() => NavigationService.navigate('CreateWallet')} />,
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
  RBF: {
    screen: rbf,
  },
  CreateRBF: {
    screen: createrbf,
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
    screen: SettingsContainer,
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
  PlausibleDeniability: {
    screen: PlausibleDeniability,
    path: 'PlausibleDeniability',
  },
  ElectrumSettings: {
    screen: ElectrumSettings,
    path: 'ElectrumSettings',
  },
});

const CreateTransactionStackNavigator = createStackNavigator({
  SendDetails: {
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

const MainBottomTabs = createStackNavigator(
  {
    Wallets: {
      screen: WalletsStackNavigator,
      path: 'wallets',
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
    Marketplace: {
      screen: Marketplace,
    },
    //
    SendDetails: {
      screen: CreateTransactionStackNavigator,
      // navigationOptions: {
      //   header: null,
      // },
    },
    SelectWallet: {
      screen: SelectWallet,
      // navigationOptions: {
      //   headerLeft: null,
      // },
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

    ScanQrAddress: {
      screen: ScanQRCode,
    },

    ReorderWallets: {
      screen: ReorderWalletsStackNavigator,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default createAppContainer(MainBottomTabs);
