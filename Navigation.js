// import { createAppContainer } from '@react-navigation/native';
import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

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

import TransactionDetails from './screen/transactions/details';
import TransactionStatus from './screen/transactions/transactionStatus';
import CPFP from './screen/transactions/CPFP';
import RBFBumpFee from './screen/transactions/RBFBumpFee';
import RBFCancel from './screen/transactions/RBFCancel';

import ReceiveDetails from './screen/receive/details';
import AztecoRedeem from './screen/receive/aztecoRedeem';

import SendDetails from './screen/send/details';
import ScanQRCode from './screen/send/ScanQRCode';
import SendCreate from './screen/send/create';
import Confirm from './screen/send/confirm';
import PsbtWithHardwareWallet from './screen/send/psbtWithHardwareWallet';
import Success from './screen/send/success';
import Broadcast from './screen/send/broadcast';

import ScanLndInvoice from './screen/lnd/scanLndInvoice';
import LappBrowser from './screen/lnd/browser';
import LNDCreateInvoice from './screen/lnd/lndCreateInvoice';
import LNDViewInvoice from './screen/lnd/lndViewInvoice';
import LNDViewAdditionalInvoiceInformation from './screen/lnd/lndViewAdditionalInvoiceInformation';
import { Platform } from 'react-native';

const defaultScreenOptions =
  Platform.OS === 'ios'
    ? ({ route, navigation }) => ({
        gestureEnabled: true,
        cardOverlayEnabled: true,
        headerStatusBarHeight: navigation.dangerouslyGetState().routes.indexOf(route) > 0 ? 10 : undefined,
        ...TransitionPresets.ModalPresentationIOS,
      })
    : undefined;
const defaultStackScreenOptions =
  Platform.OS === 'ios'
    ? {
        gestureEnabled: true,
        cardOverlayEnabled: true,
        headerStatusBarHeight: 10,
      }
    : undefined;
const WalletsStack = createStackNavigator();
const WalletsRoot = () => (
  <WalletsStack.Navigator>
    <WalletsStack.Screen name="WalletsList" component={WalletsList} options={WalletsList.navigationOptions} />
    <WalletsStack.Screen name="WalletTransactions" component={WalletTransactions} options={WalletTransactions.navigationOptions} />
    <WalletsStack.Screen name="WalletDetails" component={WalletDetails} options={WalletDetails.navigationOptions} />
    <WalletsStack.Screen name="TransactionDetails" component={TransactionDetails} options={TransactionDetails.navigationOptions} />
    <WalletsStack.Screen name="TransactionStatus" component={TransactionStatus} options={TransactionStatus.navigationOptions} />
    <WalletsStack.Screen name="HodlHodl" component={HodlHodl} options={HodlHodl.navigationOptions} />
    <WalletsStack.Screen name="CPFP" component={CPFP} options={CPFP.navigationOptions} />
    <WalletsStack.Screen name="RBFBumpFee" component={RBFBumpFee} options={RBFBumpFee.navigationOptions} />
    <WalletsStack.Screen name="RBFCancel" component={RBFCancel} options={RBFCancel.navigationOptions} />
    <WalletsStack.Screen
      name="Settings"
      component={Settings}
      options={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0,
          elevation: 0,
          shadowColor: 'transparent',
        },
        title: '',
        headerBackTitleVisible: false,
        headerTintColor: '#0c2550',
      }}
    />
    <WalletsStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions} />
    <WalletsStack.Screen name="Currency" component={Currency} options={Currency.navigationOptions} />
    <WalletsStack.Screen name="About" component={About} options={About.navigationOptions} />
    <WalletsStack.Screen name="ReleaseNotes" component={ReleaseNotes} options={ReleaseNotes.navigationOptions} />
    <WalletsStack.Screen name="Selftest" component={Selftest} options={Selftest.navigationOptions} />
    <WalletsStack.Screen name="Licensing" component={Licensing} options={Licensing.navigationOptions} />
    <WalletsStack.Screen name="DefaultView" component={DefaultView} options={DefaultView.navigationOptions} />
    <WalletsStack.Screen name="Language" component={Language} options={Language.navigationOptions} />
    <WalletsStack.Screen name="EncryptStorage" component={EncryptStorage} options={EncryptStorage.navigationOptions} />
    <WalletsStack.Screen name="GeneralSettings" component={GeneralSettings} options={GeneralSettings.navigationOptions} />
    <WalletsStack.Screen name="NetworkSettings" component={NetworkSettings} options={NetworkSettings.navigationOptions} />
    <WalletsStack.Screen name="PlausibleDeniability" component={PlausibleDeniability} options={PlausibleDeniability.navigationOptions} />
    <WalletsStack.Screen name="LightningSettings" component={LightningSettings} options={LightningSettings.navigationOptions} />
    <WalletsStack.Screen name="ElectrumSettings" component={ElectrumSettings} options={ElectrumSettings.navigationOptions} />
    <WalletsStack.Screen
      name="LNDViewInvoice"
      component={LNDViewInvoice}
      options={LNDViewInvoice.navigationOptions}
      swipeEnabled={false}
      gesturesEnabled={false}
    />
    <WalletsStack.Screen
      name="LNDViewAdditionalInvoiceInformation"
      component={LNDViewAdditionalInvoiceInformation}
      options={LNDViewAdditionalInvoiceInformation.navigationOptions}
    />
    <WalletsStack.Screen
      name="Broadcast"
      component={Broadcast}
      options={{
        title: 'Broadcast',
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0,
        },
        headerTintColor: '#0c2550',
      }}
    />
  </WalletsStack.Navigator>
);

const AddWalletStack = createStackNavigator();
const AddWalletRoot = () => (
  <AddWalletStack.Navigator screenOptions={defaultStackScreenOptions}>
    <AddWalletStack.Screen name="AddWallet" component={AddWallet} options={AddWallet.navigationOptions} />
    <AddWalletStack.Screen name="ImportWallet" component={ImportWallet} options={ImportWallet.navigationOptions} />
    <AddWalletStack.Screen
      name="PleaseBackup"
      component={PleaseBackup}
      options={PleaseBackup.navigationOptions}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        gestureEnabled: false,
      }}
    />
    <AddWalletStack.Screen
      name="PleaseBackupLNDHub"
      component={PleaseBackupLNDHub}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        gestureEnabled: false,
      }}
    />
  </AddWalletStack.Navigator>
);

// CreateTransactionStackNavigator === SendDetailsStack
const SendDetailsStack = createStackNavigator();
const SendDetailsRoot = () => (
  <SendDetailsStack.Navigator screenOptions={defaultStackScreenOptions}>
    <SendDetailsStack.Screen name="SendDetails" component={SendDetails} options={SendDetails.navigationOptions} />
    <SendDetailsStack.Screen name="Confirm" component={Confirm} options={Confirm.navigationOptions} />
    <SendDetailsStack.Screen
      name="PsbtWithHardwareWallet"
      component={PsbtWithHardwareWallet}
      options={PsbtWithHardwareWallet.navigationOptions}
    />
    <SendDetailsStack.Screen
      name="CreateTransaction"
      component={SendCreate}
      options={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0,
        },
        headerTintColor: '#0c2550',
      }}
    />
    <SendDetailsStack.Screen name="Success" component={Success} options={Success.navigationOptions} />
    <SendDetailsStack.Screen name="SelectWallet" component={SelectWallet} options={{ headerRight: null }} />
  </SendDetailsStack.Navigator>
);

const LNDCreateInvoiceStack = createStackNavigator();
const LNDCreateInvoiceRoot = () => (
  <LNDCreateInvoiceStack.Navigator screenOptions={defaultStackScreenOptions}>
    <LNDCreateInvoiceStack.Screen name="LNDCreateInvoice" component={LNDCreateInvoice} options={LNDCreateInvoice.navigationOptions} />
    <LNDCreateInvoiceStack.Screen name="SelectWallet" component={SelectWallet} />
    <LNDCreateInvoiceStack.Screen
      name="LNDViewInvoice"
      component={LNDViewInvoice}
      options={LNDViewInvoice.navigationOptions}
      swipeEnabled={false}
      gesturesEnabled={false}
    />
    <LNDCreateInvoiceStack.Screen
      name="LNDViewAdditionalInvoiceInformation"
      component={LNDViewAdditionalInvoiceInformation}
      options={LNDViewAdditionalInvoiceInformation.navigationOptions}
    />
  </LNDCreateInvoiceStack.Navigator>
);

// LightningScanInvoiceStackNavigator === ScanLndInvoiceStack
const ScanLndInvoiceStack = createStackNavigator();
const ScanLndInvoiceRoot = () => (
  <ScanLndInvoiceStack.Navigator screenOptions={defaultStackScreenOptions}>
    <ScanLndInvoiceStack.Screen name="ScanLndInvoice" component={ScanLndInvoice} options={ScanLndInvoice.navigationOptions} />
    <ScanLndInvoiceStack.Screen name="SelectWallet" component={SelectWallet} />
    <ScanLndInvoiceStack.Screen name="Success" component={Success} options={Success.navigationOptions} />
  </ScanLndInvoiceStack.Navigator>
);

const HandleOffchainAndOnChainStack = createStackNavigator();
const HandleOffchainAndOnChain = () => (
  <HandleOffchainAndOnChainStack.Navigator screenOptions={{ headerBackTitleVisible: false, ...defaultStackScreenOptions }}>
    {/* screens */}
    <HandleOffchainAndOnChainStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions} />
    <HandleOffchainAndOnChainStack.Screen name="ScanQRCode" component={ScanQRCodeRoot} />
    {/* stacks */}
    <HandleOffchainAndOnChainStack.Screen name="ScanLndInvoice" component={ScanLndInvoiceRoot} options={{ headerShown: false }} />
    <HandleOffchainAndOnChainStack.Screen name="SendDetails" component={SendDetailsRoot} options={{ headerShown: false }} />
  </HandleOffchainAndOnChainStack.Navigator>
);

const AztecoRedeemStack = createStackNavigator();
const AztecoRedeemRoot = () => (
  <AztecoRedeemStack.Navigator screenOptions={defaultStackScreenOptions}>
    <AztecoRedeemStack.Screen name="AztecoRedeem" component={AztecoRedeem} options={AztecoRedeem.navigationOptions} />
    <AztecoRedeemStack.Screen name="SelectWallet" component={SelectWallet} options={{ headerLeft: null }} />
  </AztecoRedeemStack.Navigator>
);

const ScanQRCodeStack = createStackNavigator();
const ScanQRCodeRoot = () => (
  <ScanQRCodeStack.Navigator mode="modal" screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="ScanQRCode" component={ScanQRCode} />
  </ScanQRCodeStack.Navigator>
);

const RootStack = createStackNavigator();
const Navigation = () => (
  <RootStack.Navigator mode="modal" screenOptions={defaultScreenOptions}>
    {/* stacks */}
    <RootStack.Screen name="WalletsRoot" component={WalletsRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="AddWalletRoot" component={AddWalletRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="SendDetailsRoot" component={SendDetailsRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="HandleOffchainAndOnChain" component={HandleOffchainAndOnChain} options={{ headerShown: false }} />
    <RootStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={{ headerShown: false }} />
    <RootStack.Screen
      name="ScanQRCodeRoot"
      component={ScanQRCodeRoot}
      options={{ ...TransitionPresets.ModalTransition, headerShown: false }}
    />
    {/* screens */}
    <RootStack.Screen name="WalletExport" component={WalletExport} options={WalletExport.navigationOptions} />
    <RootStack.Screen name="WalletXpub" component={WalletXpub} options={WalletXpub.navigationOptions} />
    <RootStack.Screen name="BuyBitcoin" component={BuyBitcoin} options={BuyBitcoin.navigationOptions} />
    <RootStack.Screen name="Marketplace" component={Marketplace} options={Marketplace.navigationOptions} />
    <RootStack.Screen name="SelectWallet" component={SelectWallet} options={{ headerLeft: null }} />
    <RootStack.Screen name="ReceiveDetails" component={ReceiveDetails} options={ReceiveDetails.navigationOptions} />
    <RootStack.Screen name="LappBrowser" component={LappBrowser} options={LappBrowser.navigationOptions} />
    <RootStack.Screen name="ReorderWallets" component={ReorderWallets} options={ReorderWallets.navigationOptions} />
  </RootStack.Navigator>
);

export default Navigation;
