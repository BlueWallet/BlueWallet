import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import { Route, MainCardStackNavigatorParams } from 'app/consts';
import { MainTabNavigator } from 'app/navigators/MainTabNavigator';
import {
  CreateWalletScreen,
  WalletDetailsScreen,
  ImportWalletScreen,
  CreateContactScreen,
  ContactDetailsScreen,
  TransactionDetailsScreen,
  ContactQRCodeScreen,
  ReceiveCoinsScreen,
  SendCoinsScreen,
  SendCoinsConfirmScreen,
  ScanQrCodeScreen,
  ContactListScreen,
  SettingsScreen,
  SelectLanguageScreen,
  AboutUsScreen,
  AdvancedOptionsScreen,
  ElectrumServerScreen,
  CreatePinScreen,
  CurrentPinScreen,
  ConfirmPinScreen,
  FilterTransactionsScreen,
} from 'app/screens';

const Stack = createStackNavigator<MainCardStackNavigatorParams>();

export const MainCardStackNavigator = () => (
  <Stack.Navigator headerMode="none">
    <Stack.Screen name={Route.MainCardStackNavigator} component={MainTabNavigator} />
    <Stack.Screen name={Route.CreateWallet} component={CreateWalletScreen} />
    <Stack.Screen name={Route.ImportWallet} component={ImportWalletScreen} />
    <Stack.Screen name={Route.WalletDetails} component={WalletDetailsScreen} />
    <Stack.Screen name={Route.CreateContact} component={CreateContactScreen} />
    <Stack.Screen name={Route.ContactDetails} component={ContactDetailsScreen} />
    <Stack.Screen name={Route.ContactQRCode} component={ContactQRCodeScreen} />
    <Stack.Screen name={Route.TransactionDetails} component={TransactionDetailsScreen} />
    <Stack.Screen name={Route.ReceiveCoins} component={ReceiveCoinsScreen} />
    <Stack.Screen name={Route.SendCoins} component={SendCoinsScreen} />
    <Stack.Screen name={Route.SendCoinsConfirm} component={SendCoinsConfirmScreen} />
    <Stack.Screen name={Route.ScanQrCode} component={ScanQrCodeScreen} />
    <Stack.Screen name={Route.ChooseContactList} component={ContactListScreen} />
    <Stack.Screen name={Route.Settings} component={SettingsScreen} />
    <Stack.Screen name={Route.SelectLanguage} component={SelectLanguageScreen} />
    <Stack.Screen name={Route.AboutUs} component={AboutUsScreen} />
    <Stack.Screen name={Route.AdvancedOptions} component={AdvancedOptionsScreen} />
    <Stack.Screen name={Route.ElectrumServer} component={ElectrumServerScreen} />
    <Stack.Screen name={Route.CreatePin} component={CreatePinScreen} />
    <Stack.Screen name={Route.CurrentPin} component={CurrentPinScreen} />
    <Stack.Screen name={Route.ConfirmPin} component={ConfirmPinScreen} />
    <Stack.Screen name={Route.FilterTransactions} component={FilterTransactionsScreen} />
  </Stack.Navigator>
);
