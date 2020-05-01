import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import { MainTabNavigator } from 'app/navigators/MainTabNavigator';
import {
  CreateWalletScreen,
  WalletDetailsScreen,
  ImportWalletScreen,
  ExportWalletScreen,
  DeleteWalletScreen,
  ExportWalletXpubScreen,
  CreateContactScreen,
  ContactDetailsScreen,
  TransactionDetailsScreen,
  ContactQRCodeScreen,
  DeleteContactScreen,
  ReceiveCoinsScreen,
  ElectrumServerScreen,
  AboutUsScreen,
  SelectLanguageScreen,
  SendCoinsScreen,
  SendCoinsConfirmScreen,
  SendTransactionDetailsScreen,
  ScanQrCodeScreen,
  ContactListScreen,
} from 'app/screens';

export const MainCardStackNavigator = createStackNavigator(
  {
    MainTabNavigator: {
      screen: MainTabNavigator,
      navigationOptions: {
        header: null,
      },
    },
    [Route.CreateWallet]: CreateWalletScreen,
    [Route.ImportWallet]: ImportWalletScreen,
    [Route.DeleteWallet]: DeleteWalletScreen,
    [Route.WalletDetails]: WalletDetailsScreen,
    [Route.ExportWallet]: ExportWalletScreen,
    [Route.ExportWalletXpub]: ExportWalletXpubScreen,
    [Route.CreateContact]: CreateContactScreen,
    [Route.ContactDetails]: ContactDetailsScreen,
    [Route.ContactQRCode]: ContactQRCodeScreen,
    [Route.DeleteContact]: DeleteContactScreen,
    [Route.TransactionDetails]: TransactionDetailsScreen,
    [Route.ReceiveCoins]: ReceiveCoinsScreen,
    [Route.ElectrumServer]: ElectrumServerScreen,
    [Route.AboutUs]: AboutUsScreen,
    [Route.SelectLanguage]: SelectLanguageScreen,
    [Route.SendCoins]: SendCoinsScreen,
    [Route.SendCoinsConfirm]: SendCoinsConfirmScreen,
    [Route.SendTransactionDetails]: SendTransactionDetailsScreen,
    [Route.ScanQrCode]: ScanQrCodeScreen,
    [Route.ChooseContactList]: ContactListScreen,
  },
  {
    mode: 'card',
  },
);
