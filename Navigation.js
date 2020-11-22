import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Platform, useWindowDimensions, Dimensions } from 'react-native';

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
import NotificationSettings from './screen/settings/notificationSettings';
import DefaultView from './screen/settings/defaultView';

import WalletsList from './screen/wallets/list';
import WalletTransactions from './screen/wallets/transactions';
import AddWallet from './screen/wallets/add';
import WalletsAddMultisig from './screen/wallets/addMultisig';
import WalletsAddMultisigStep2 from './screen/wallets/addMultisigStep2';
import PleaseBackup from './screen/wallets/pleaseBackup';
import PleaseBackupLNDHub from './screen/wallets/pleaseBackupLNDHub';
import ImportWallet from './screen/wallets/import';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import ExportMultisigCoordinationSetup from './screen/wallets/exportMultisigCoordinationSetup';
import ViewEditMultisigCosigners from './screen/wallets/viewEditMultisigCosigners';
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
import ProvideEntropy from './screen/wallets/provideEntropy';

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
import PsbtMultisig from './screen/send/psbtMultisig';
import Success from './screen/send/success';
import Broadcast from './screen/send/broadcast';
import CoinControl from './screen/send/coinControl';

import ScanLndInvoice from './screen/lnd/scanLndInvoice';
import LappBrowser from './screen/lnd/browser';
import LNDCreateInvoice from './screen/lnd/lndCreateInvoice';
import LNDViewInvoice from './screen/lnd/lndViewInvoice';
import LNDViewAdditionalInvoiceInformation from './screen/lnd/lndViewAdditionalInvoiceInformation';
import LnurlPay from './screen/lnd/lnurlPay';
import LnurlPaySuccess from './screen/lnd/lnurlPaySuccess';
import LoadingScreen from './LoadingScreen';
import UnlockWith from './UnlockWith';
import { BlueNavigationStyle } from './BlueComponents';
import DrawerList from './screen/wallets/drawerList';
import { isTablet } from 'react-native-device-info';
import SettingsPrivacy from './screen/settings/SettingsPrivacy';

const defaultScreenOptions =
  Platform.OS === 'ios'
    ? ({ route, navigation }) => ({
        gestureEnabled: true,
        cardOverlayEnabled: true,
        cardStyle: { backgroundColor: '#FFFFFF' },
        headerStatusBarHeight: navigation.dangerouslyGetState().routes.indexOf(route) > 0 ? 10 : undefined,
        ...TransitionPresets.ModalPresentationIOS,
        gestureResponseDistance: { vertical: Dimensions.get('window').height, horizontal: 50 },
      })
    : {
        gestureEnabled: true,
        cardOverlayEnabled: true,
        ...TransitionPresets.ScaleFromCenterAndroid,
      };
const defaultStackScreenOptions =
  Platform.OS === 'ios'
    ? {
        gestureEnabled: true,
        cardOverlayEnabled: true,
        cardStyle: { backgroundColor: '#FFFFFF' },
        headerStatusBarHeight: 10,
      }
    : {
        gestureEnabled: true,
        cardOverlayEnabled: true,
        ...TransitionPresets.ScaleFromCenterAndroid,
      };

const WalletsStack = createStackNavigator();
const WalletsRoot = () => (
  <WalletsStack.Navigator {...(Platform.OS === 'android' ? { screenOptions: defaultScreenOptions } : null)}>
    <WalletsStack.Screen name="WalletsList" component={WalletsList} />
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
        ...BlueNavigationStyle(),

        headerTitle: '',
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
    <WalletsStack.Screen name="NotificationSettings" component={NotificationSettings} options={NotificationSettings.navigationOptions} />
    <WalletsStack.Screen name="PlausibleDeniability" component={PlausibleDeniability} options={PlausibleDeniability.navigationOptions} />
    <WalletsStack.Screen name="LightningSettings" component={LightningSettings} options={LightningSettings.navigationOptions} />
    <WalletsStack.Screen name="ElectrumSettings" component={ElectrumSettings} options={ElectrumSettings.navigationOptions} />
    <WalletsStack.Screen name="SettingsPrivacy" component={SettingsPrivacy} options={SettingsPrivacy.navigationOptions} />
    <WalletsStack.Screen
      name="LNDViewInvoice"
      component={LNDViewInvoice}
      options={LNDViewInvoice.navigationOptions}
      swipeEnabled={false}
      gestureEnabled={false}
    />
    <WalletsStack.Screen
      name="LNDViewAdditionalInvoiceInformation"
      component={LNDViewAdditionalInvoiceInformation}
      options={LNDViewAdditionalInvoiceInformation.navigationOptions}
    />
    <WalletsStack.Screen name="HodlHodlViewOffer" component={HodlHodlViewOffer} options={HodlHodlViewOffer.navigationOptions} />
    <WalletsStack.Screen name="Broadcast" component={Broadcast} options={Broadcast.navigationOptions} />
    <WalletsStack.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions} />
    <WalletsStack.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions} />
  </WalletsStack.Navigator>
);

const AddWalletStack = createStackNavigator();
const AddWalletRoot = () => (
  <AddWalletStack.Navigator screenOptions={defaultStackScreenOptions}>
    <AddWalletStack.Screen name="AddWallet" component={AddWallet} options={AddWallet.navigationOptions} />
    <AddWalletStack.Screen name="ImportWallet" component={ImportWallet} options={ImportWallet.navigationOptions} />
    <AddWalletStack.Screen name="PleaseBackup" component={PleaseBackup} options={PleaseBackup.navigationOptions} />
    <AddWalletStack.Screen name="PleaseBackupLNDHub" component={PleaseBackupLNDHub} options={PleaseBackupLNDHub.navigationOptions} />
    <AddWalletStack.Screen name="ProvideEntropy" component={ProvideEntropy} options={ProvideEntropy.navigationOptions} />
    <AddWalletStack.Screen name="WalletsAddMultisig" component={WalletsAddMultisig} options={WalletsAddMultisig.navigationOptions} />
    <AddWalletStack.Screen
      name="WalletsAddMultisigStep2"
      component={WalletsAddMultisigStep2}
      options={WalletsAddMultisigStep2.navigationOptions}
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
    <SendDetailsStack.Screen name="CreateTransaction" component={SendCreate} options={SendCreate.navigationOptions} />
    <SendDetailsStack.Screen name="PsbtMultisig" component={PsbtMultisig} options={PsbtMultisig.navigationOptions} />
    <SendDetailsStack.Screen
      name="Success"
      component={Success}
      options={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
    <SendDetailsStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions} />
    <SendDetailsStack.Screen name="CoinControl" component={CoinControl} options={CoinControl.navigationOptions} />
  </SendDetailsStack.Navigator>
);

const LNDCreateInvoiceStack = createStackNavigator();
const LNDCreateInvoiceRoot = () => (
  <LNDCreateInvoiceStack.Navigator screenOptions={defaultStackScreenOptions}>
    <LNDCreateInvoiceStack.Screen name="LNDCreateInvoice" component={LNDCreateInvoice} options={LNDCreateInvoice.navigationOptions} />
    <LNDCreateInvoiceStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions} />
    <LNDCreateInvoiceStack.Screen
      name="LNDViewInvoice"
      component={LNDViewInvoice}
      options={LNDViewInvoice.navigationOptions}
      swipeEnabled={false}
      gestureEnabled={false}
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
    <ScanLndInvoiceStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions} />
    <ScanLndInvoiceStack.Screen name="Success" component={Success} options={{ headerShown: false, gestureEnabled: false }} />
    <ScanLndInvoiceStack.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions} />
    <ScanLndInvoiceStack.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions} />
  </ScanLndInvoiceStack.Navigator>
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

const LoadingScreenStack = createStackNavigator();
const LoadingScreenRoot = () => (
  <LoadingScreenStack.Navigator name="LoadingScreenRoot" mode="modal" screenOptions={{ headerShown: false }}>
    <LoadingScreenStack.Screen name="LoadingScreen" component={LoadingScreen} />
  </LoadingScreenStack.Navigator>
);

const UnlockWithScreenStack = createStackNavigator();
const UnlockWithScreenRoot = () => (
  <UnlockWithScreenStack.Navigator name="UnlockWithScreenRoot" screenOptions={{ headerShown: false }}>
    <UnlockWithScreenStack.Screen name="UnlockWithScreen" component={UnlockWith} initialParams={{ unlockOnComponentMount: true }} />
  </UnlockWithScreenStack.Navigator>
);

const HodlHodlLoginStack = createStackNavigator();
const HodlHodlLoginRoot = () => (
  <HodlHodlLoginStack.Navigator name="HodlHodlLoginRoot" screenOptions={defaultStackScreenOptions}>
    <HodlHodlLoginStack.Screen name="HodlHodlLogin" component={HodlHodlLogin} options={HodlHodlLogin.navigationOptions} />
  </HodlHodlLoginStack.Navigator>
);

const ReorderWalletsStack = createStackNavigator();
const ReorderWalletsStackRoot = () => (
  <ReorderWalletsStack.Navigator name="ReorderWalletsRoot" screenOptions={defaultStackScreenOptions}>
    <ReorderWalletsStack.Screen name="ReorderWallets" component={ReorderWallets} options={ReorderWallets.navigationOptions} />
  </ReorderWalletsStack.Navigator>
);

const Drawer = createDrawerNavigator();
function DrawerRoot() {
  const dimensions = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'android' ? isTablet() : dimensions.width >= Dimensions.get('screen').width / 3 && isTablet();
  const drawerStyle = { width: '0%' };

  return (
    <Drawer.Navigator
      drawerStyle={isLargeScreen ? null : drawerStyle}
      drawerType={isLargeScreen ? 'permanent' : null}
      drawerContent={props => (isLargeScreen ? <DrawerList {...props} /> : null)}
    >
      <Drawer.Screen name="Navigation" component={Navigation} options={{ headerShown: false, gestureEnabled: false }} />
    </Drawer.Navigator>
  );
}

const InitStack = createStackNavigator();
const InitRoot = () => (
  <InitStack.Navigator screenOptions={defaultScreenOptions} initialRouteName="LoadingScreenRoot">
    <InitStack.Screen name="LoadingScreenRoot" component={LoadingScreenRoot} options={{ headerShown: false, animationEnabled: false }} />
    <InitStack.Screen
      name="UnlockWithScreenRoot"
      component={UnlockWithScreenRoot}
      options={{ headerShown: false, animationEnabled: false }}
    />
    <InitStack.Screen name="ReorderWallets" component={ReorderWalletsStackRoot} options={{ headerShown: false }} />
    <InitStack.Screen name="DrawerRoot" component={DrawerRoot} options={{ headerShown: false, animationEnabled: false }} />
  </InitStack.Navigator>
);

const RootStack = createStackNavigator();
const Navigation = () => (
  <RootStack.Navigator mode="modal" screenOptions={defaultScreenOptions} initialRouteName="LoadingScreenRoot">
    {/* stacks */}
    <RootStack.Screen name="WalletsRoot" component={WalletsRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="AddWalletRoot" component={AddWalletRoot} options={{ headerShown: false, gestureEnabled: false }} />
    <RootStack.Screen name="SendDetailsRoot" component={SendDetailsRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="HodlHodlLoginRoot" component={HodlHodlLoginRoot} options={{ headerShown: false }} />
    <RootStack.Screen name="HodlHodlMyContracts" component={HodlHodlMyContracts} options={HodlHodlMyContracts.navigationOptions} />
    <RootStack.Screen name="HodlHodlWebview" component={HodlHodlWebview} options={HodlHodlWebview.navigationOptions} />

    {/* screens */}
    <RootStack.Screen name="WalletExport" component={WalletExport} options={WalletExport.navigationOptions} />
    <RootStack.Screen
      name="ExportMultisigCoordinationSetup"
      component={ExportMultisigCoordinationSetup}
      options={ExportMultisigCoordinationSetup.navigationOptions}
    />
    <RootStack.Screen
      name="ViewEditMultisigCosigners"
      component={ViewEditMultisigCosigners}
      options={ViewEditMultisigCosigners.navigationOptions}
    />
    <RootStack.Screen name="WalletXpub" component={WalletXpub} options={WalletXpub.navigationOptions} />
    <RootStack.Screen name="BuyBitcoin" component={BuyBitcoin} options={BuyBitcoin.navigationOptions} />
    <RootStack.Screen name="Marketplace" component={Marketplace} options={Marketplace.navigationOptions} />
    <RootStack.Screen name="SelectWallet" component={SelectWallet} options={{ headerLeft: null }} />
    <RootStack.Screen name="ReceiveDetails" component={ReceiveDetails} options={ReceiveDetails.navigationOptions} />
    <RootStack.Screen name="LappBrowser" component={LappBrowser} options={LappBrowser.navigationOptions} />

    <RootStack.Screen
      name="ScanQRCodeRoot"
      component={ScanQRCodeRoot}
      options={{
        ...(Platform.OS === 'ios' ? TransitionPresets.ModalTransition : TransitionPresets.ScaleFromCenterAndroid),
        headerShown: false,
      }}
    />
  </RootStack.Navigator>
);

export default InitRoot;
