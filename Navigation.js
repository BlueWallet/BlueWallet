// import { createAppContainer } from '@react-navigation/native';
import React from 'react';
import { enableScreens } from 'react-native-screens';
import { createNativeStackNavigator } from 'react-native-screens/native-stack';

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
import HodlHodlViewOffer from './screen/wallets/hodlHodlViewOffer';
import HodlHodlLogin from './screen/wallets/hodlHodlLogin';
import HodlHodlWebview from './screen/wallets/hodlHodlWebview';
import HodlHodlMyContracts from './screen/wallets/hodlHodlMyContracts';
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
import LoadingScreen from './LoadingScreen';
import UnlockWith from './UnlockWith';
const BlueApp = require('./BlueApp');
const loc = require('./loc');

enableScreens();
const WalletsStack = createNativeStackNavigator();
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
    <WalletsStack.Screen name="Settings" component={Settings} options={Settings.navigationOptions} />
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

const AddWalletStack = createNativeStackNavigator();
const AddWalletRoot = () => (
  <AddWalletStack.Navigator>
    <AddWalletStack.Screen name="AddWallet" component={AddWallet} options={AddWallet.navigationOptions} />
    <AddWalletStack.Screen name="ImportWallet" component={ImportWallet} options={ImportWallet.navigationOptions} />
    <AddWalletStack.Screen name="PleaseBackup" component={PleaseBackup} options={PleaseBackup.navigationOptions} />
    <AddWalletStack.Screen name="PleaseBackupLNDHub" component={PleaseBackupLNDHub} options={PleaseBackupLNDHub.navigationOptions} />
  </AddWalletStack.Navigator>
);

// CreateTransactionStackNavigator === SendDetailsStack
const SendDetailsStack = createNativeStackNavigator();
const SendDetailsRoot = () => (
  <SendDetailsStack.Navigator>
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
    <SendDetailsStack.Screen
      name="SelectWallet"
      component={SelectWallet}
      options={{
        headerTitle: loc.wallets.select_wallet,
        headerBackTitleVisible: false,
        headerTintColor: BlueApp.settings.foregroundColor,
      }}
    />
  </SendDetailsStack.Navigator>
);

const LNDCreateInvoiceStack = createNativeStackNavigator();
const LNDCreateInvoiceRoot = () => (
  <LNDCreateInvoiceStack.Navigator>
    <LNDCreateInvoiceStack.Screen name="LNDCreateInvoice" component={LNDCreateInvoice} options={LNDCreateInvoice.navigationOptions} />
    <LNDCreateInvoiceStack.Screen
      name="SelectWallet"
      component={SelectWallet}
      options={{
        headerTitle: loc.wallets.select_wallet,
        headerBackTitleVisible: false,
        headerTintColor: BlueApp.settings.foregroundColor,
      }}
    />
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

const HodlHodlStack = createNativeStackNavigator();
const HodlHodlRoot = () => (
  <HodlHodlStack.Navigator>
    <HodlHodlStack.Screen name="HodlHodl" component={HodlHodl} options={HodlHodl.navigationOptions} />
    <HodlHodlStack.Screen name="HodlHodlViewOffer" component={HodlHodlViewOffer} options={HodlHodlViewOffer.navigationOptions} />
    <HodlHodlStack.Screen name="HodlHodlLogin" component={HodlHodlLogin} options={HodlHodlLogin.navigationOptions} />
    <HodlHodlStack.Screen name="HodlHodlMyContracts" component={HodlHodlMyContracts} options={HodlHodlMyContracts.navigationOptions} />
    <HodlHodlStack.Screen name="HodlHodlWebview" component={HodlHodlWebview} options={HodlHodlWebview.navigationOptions} />
  </HodlHodlStack.Navigator>
);

// LightningScanInvoiceStackNavigator === ScanLndInvoiceStack
const ScanLndInvoiceStack = createNativeStackNavigator();
const ScanLndInvoiceRoot = () => (
  <ScanLndInvoiceStack.Navigator>
    <ScanLndInvoiceStack.Screen name="ScanLndInvoice" component={ScanLndInvoice} options={ScanLndInvoice.navigationOptions} />
    <ScanLndInvoiceStack.Screen
      name="SelectWallet"
      component={SelectWallet}
      options={{
        headerTitle: loc.wallets.select_wallet,
        headerBackTitleVisible: false,
        headerTintColor: BlueApp.settings.foregroundColor,
      }}
    />
    <ScanLndInvoiceStack.Screen name="Success" component={Success} options={Success.navigationOptions} />
  </ScanLndInvoiceStack.Navigator>
);

const AztecoRedeemStack = createNativeStackNavigator();
const AztecoRedeemRoot = () => (
  <AztecoRedeemStack.Navigator>
    <AztecoRedeemStack.Screen name="AztecoRedeem" component={AztecoRedeem} options={AztecoRedeem.navigationOptions} />
    <AztecoRedeemStack.Screen name="SelectWallet" component={SelectWallet} />
  </AztecoRedeemStack.Navigator>
);

const ScanQRCodeStack = createNativeStackNavigator();
const ScanQRCodeRoot = () => (
  <ScanQRCodeStack.Navigator mode="modal" screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="ScanQRCode" component={ScanQRCode} options={{ stackPresentation: 'fullScreenModal' }} />
  </ScanQRCodeStack.Navigator>
);

const LoadingScreenStack = createNativeStackNavigator();
const LoadingScreenRoot = () => (
  <LoadingScreenStack.Navigator screenOptions={{ headerShown: false }}>
    <LoadingScreenStack.Screen name="LoadingScreen" component={LoadingScreen} />
  </LoadingScreenStack.Navigator>
);

const UnlockWithScreenStack = createNativeStackNavigator();
const UnlockWithScreenRoot = () => (
  <UnlockWithScreenStack.Navigator screenOptions={{ headerShown: false }}>
    <UnlockWithScreenStack.Screen name="UnlockWithScreen" component={UnlockWith} />
  </UnlockWithScreenStack.Navigator>
);

const ReceiveDetailsScreenStack = createNativeStackNavigator();
const ReceiveDetailsScreenRoot = () => (
  <ReceiveDetailsScreenStack.Navigator>
    <ReceiveDetailsScreenStack.Screen name="ReceiveDetails" component={ReceiveDetails} options={ReceiveDetails.navigationOptions} />
  </ReceiveDetailsScreenStack.Navigator>
);

const BuyBitcoinScreenStack = createNativeStackNavigator();
const BuyBitcoinScreenStackRoot = () => (
  <BuyBitcoinScreenStack.Navigator>
    <BuyBitcoinScreenStack.Screen name="BuyBitcoin" component={BuyBitcoin} options={BuyBitcoin.navigationOptions} />
  </BuyBitcoinScreenStack.Navigator>
);

const WalletXPubScreenStack = createNativeStackNavigator();
const WalletXPubScreenStackRoot = () => (
  <WalletXPubScreenStack.Navigator>
    <WalletXPubScreenStack.Screen name="WalletXpub" component={WalletXpub} options={BuyBitcoin.navigationOptions} />
  </WalletXPubScreenStack.Navigator>
);

const WalletExportScreenStack = createNativeStackNavigator();
const WalletExportScreenStackRoot = () => (
  <WalletExportScreenStack.Navigator>
    <WalletExportScreenStack.Screen name="WalletExport" component={WalletExport} options={WalletExport.navigationOptions} />
  </WalletExportScreenStack.Navigator>
);

const LappBrowsercreenStack = createNativeStackNavigator();
const LappBrowsercreenStackRoot = () => (
  <LappBrowsercreenStack.Navigator>
    <LappBrowsercreenStack.Screen name="LappBrowser" component={LappBrowser} options={LappBrowser.navigationOptions} />
  </LappBrowsercreenStack.Navigator>
);

const RootStack = createNativeStackNavigator();
const Navigation = () => (
  <RootStack.Navigator initialRouteName="LoadingScreenRoot">
    {/* stacks */}
    <RootStack.Screen name="LoadingScreenRoot" component={LoadingScreenRoot} options={{ headerShown: false, stackAnimation: 'none' }} />
    <RootStack.Screen
      name="UnlockWithScreenRoot"
      component={UnlockWithScreenRoot}
      options={{ headerShown: false, stackAnimation: 'none' }}
    />
    <RootStack.Screen name="WalletsRoot" component={WalletsRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="AddWalletRoot" component={AddWalletRoot} options={{ headerShown: false, stackPresentation: 'modal' }} />
    <RootStack.Screen
      name="ReceiveDetailsScreenRoot"
      component={ReceiveDetailsScreenRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen name="SendDetailsRoot" component={SendDetailsRoot} options={{ headerShown: false, stackPresentation: 'modal' }} />
    <RootStack.Screen
      name="LNDCreateInvoiceRoot"
      component={LNDCreateInvoiceRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen
      name="ScanLndInvoiceRoot"
      component={ScanLndInvoiceRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={{ headerShown: false, stackPresentation: 'modal' }} />
    <RootStack.Screen name="HodlHodlRoot" component={HodlHodlRoot} options={{ headerShown: false, stackPresentation: 'modal' }} />
    <RootStack.Screen
      name="ScanQRCodeRoot"
      component={ScanQRCodeRoot}
      options={{
        headerShown: false,
        stackPresentation: 'fullScreenModal',
      }}
    />
    {/* screens */}
    <RootStack.Screen
      name="BuyBitcoin"
      component={BuyBitcoinScreenStackRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen
      name="WalletExport"
      component={WalletExportScreenStackRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen
      name="WalletXpub"
      component={WalletXPubScreenStackRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen name="Marketplace" component={Marketplace} options={Marketplace.navigationOptions} />
    <RootStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions} />
    <RootStack.Screen
      name="LappBrowser"
      component={LappBrowsercreenStackRoot}
      options={{ headerShown: false, stackPresentation: 'modal' }}
    />
    <RootStack.Screen name="ReorderWallets" component={ReorderWallets} options={ReorderWallets.navigationOptions} />
  </RootStack.Navigator>
);

export default Navigation;
