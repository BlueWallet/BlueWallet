import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Platform, useWindowDimensions, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';

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
import WalletsAddMultisigHelp from './screen/wallets/addMultisigHelp';
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
import PsbtMultisigQRCode from './screen/send/psbtMultisigQRCode';
import Success from './screen/send/success';
import Broadcast from './screen/send/broadcast';
import IsItMyAddress from './screen/send/isItMyAddress';
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
import DrawerList from './screen/wallets/drawerList';
import { isTablet } from 'react-native-device-info';
import SettingsPrivacy from './screen/settings/SettingsPrivacy';
import LNDViewAdditionalInvoicePreImage from './screen/lnd/lndViewAdditionalInvoicePreImage';

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

const WalletsRoot = () => {
  const theme = useTheme();

  return (
    <WalletsStack.Navigator {...(Platform.OS === 'android' ? { screenOptions: defaultScreenOptions } : null)}>
      <WalletsStack.Screen name="WalletsList" component={WalletsList} />
      <WalletsStack.Screen name="WalletTransactions" component={WalletTransactions} options={WalletTransactions.navigationOptions(theme)} />
      <WalletsStack.Screen name="WalletDetails" component={WalletDetails} options={WalletDetails.navigationOptions(theme)} />
      <WalletsStack.Screen name="TransactionDetails" component={TransactionDetails} options={TransactionDetails.navigationOptions(theme)} />
      <WalletsStack.Screen name="TransactionStatus" component={TransactionStatus} options={TransactionStatus.navigationOptions(theme)} />
      <WalletsStack.Screen name="HodlHodl" component={HodlHodl} options={HodlHodl.navigationOptions(theme)} />
      <WalletsStack.Screen name="HodlHodlViewOffer" component={HodlHodlViewOffer} options={HodlHodlViewOffer.navigationOptions(theme)} />
      <WalletsStack.Screen name="CPFP" component={CPFP} options={CPFP.navigationOptions(theme)} />
      <WalletsStack.Screen name="RBFBumpFee" component={RBFBumpFee} options={RBFBumpFee.navigationOptions(theme)} />
      <WalletsStack.Screen name="RBFCancel" component={RBFCancel} options={RBFCancel.navigationOptions(theme)} />
      <WalletsStack.Screen name="Settings" component={Settings} options={Settings.navigationOptions(theme)} />
      <WalletsStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <WalletsStack.Screen name="Currency" component={Currency} options={Currency.navigationOptions(theme)} />
      <WalletsStack.Screen name="About" component={About} options={About.navigationOptions(theme)} />
      <WalletsStack.Screen name="ReleaseNotes" component={ReleaseNotes} options={ReleaseNotes.navigationOptions(theme)} />
      <WalletsStack.Screen name="Selftest" component={Selftest} options={Selftest.navigationOptions(theme)} />
      <WalletsStack.Screen name="Licensing" component={Licensing} options={Licensing.navigationOptions(theme)} />
      <WalletsStack.Screen name="DefaultView" component={DefaultView} options={DefaultView.navigationOptions(theme)} />
      <WalletsStack.Screen name="Language" component={Language} options={Language.navigationOptions(theme)} />
      <WalletsStack.Screen name="EncryptStorage" component={EncryptStorage} options={EncryptStorage.navigationOptions(theme)} />
      <WalletsStack.Screen name="GeneralSettings" component={GeneralSettings} options={GeneralSettings.navigationOptions(theme)} />
      <WalletsStack.Screen name="NetworkSettings" component={NetworkSettings} options={NetworkSettings.navigationOptions(theme)} />
      <WalletsStack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={NotificationSettings.navigationOptions(theme)}
      />
      <WalletsStack.Screen
        name="PlausibleDeniability"
        component={PlausibleDeniability}
        options={PlausibleDeniability.navigationOptions(theme)}
      />
      <WalletsStack.Screen name="LightningSettings" component={LightningSettings} options={LightningSettings.navigationOptions(theme)} />
      <WalletsStack.Screen name="ElectrumSettings" component={ElectrumSettings} options={ElectrumSettings.navigationOptions(theme)} />
      <WalletsStack.Screen name="SettingsPrivacy" component={SettingsPrivacy} options={SettingsPrivacy.navigationOptions(theme)} />
      <WalletsStack.Screen name="LNDViewInvoice" component={LNDViewInvoice} options={LNDViewInvoice.navigationOptions(theme)} />
      <WalletsStack.Screen
        name="LNDViewAdditionalInvoiceInformation"
        component={LNDViewAdditionalInvoiceInformation}
        options={LNDViewAdditionalInvoiceInformation.navigationOptions(theme)}
      />
      <WalletsStack.Screen
        name="LNDViewAdditionalInvoicePreImage"
        component={LNDViewAdditionalInvoicePreImage}
        options={LNDViewAdditionalInvoicePreImage.navigationOptions(theme)}
      />
      <WalletsStack.Screen name="Broadcast" component={Broadcast} options={Broadcast.navigationOptions(theme)} />
      <WalletsStack.Screen name="IsItMyAddress" component={IsItMyAddress} options={IsItMyAddress.navigationOptions(theme)} />
      <WalletsStack.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions(theme)} />
      <WalletsStack.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions(theme)} />
      <WalletsStack.Screen
        name="Success"
        component={Success}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </WalletsStack.Navigator>
  );
};

const AddWalletStack = createStackNavigator();
const AddWalletRoot = () => {
  const theme = useTheme();

  return (
    <AddWalletStack.Navigator screenOptions={defaultStackScreenOptions}>
      <AddWalletStack.Screen name="AddWallet" component={AddWallet} options={AddWallet.navigationOptions(theme)} />
      <AddWalletStack.Screen name="ImportWallet" component={ImportWallet} options={ImportWallet.navigationOptions(theme)} />
      <AddWalletStack.Screen name="PleaseBackup" component={PleaseBackup} options={PleaseBackup.navigationOptions(theme)} />
      <AddWalletStack.Screen
        name="PleaseBackupLNDHub"
        component={PleaseBackupLNDHub}
        options={PleaseBackupLNDHub.navigationOptions(theme)}
      />
      <AddWalletStack.Screen name="ProvideEntropy" component={ProvideEntropy} options={ProvideEntropy.navigationOptions(theme)} />
      <AddWalletStack.Screen
        name="WalletsAddMultisig"
        component={WalletsAddMultisig}
        options={WalletsAddMultisig.navigationOptions(theme)}
      />
      <AddWalletStack.Screen
        name="WalletsAddMultisigStep2"
        component={WalletsAddMultisigStep2}
        options={WalletsAddMultisigStep2.navigationOptions(theme)}
      />
      <AddWalletStack.Screen
        name="WalletsAddMultisigHelp"
        component={WalletsAddMultisigHelp}
        options={WalletsAddMultisigHelp.navigationOptions(theme)}
      />
    </AddWalletStack.Navigator>
  );
};

// CreateTransactionStackNavigator === SendDetailsStack
const SendDetailsStack = createStackNavigator();
const SendDetailsRoot = () => {
  const theme = useTheme();

  return (
    <SendDetailsStack.Navigator screenOptions={defaultStackScreenOptions}>
      <SendDetailsStack.Screen name="SendDetails" component={SendDetails} options={SendDetails.navigationOptions(theme)} />
      <SendDetailsStack.Screen name="Confirm" component={Confirm} options={Confirm.navigationOptions(theme)} />
      <SendDetailsStack.Screen
        name="PsbtWithHardwareWallet"
        component={PsbtWithHardwareWallet}
        options={PsbtWithHardwareWallet.navigationOptions(theme)}
      />
      <SendDetailsStack.Screen name="CreateTransaction" component={SendCreate} options={SendCreate.navigationOptions(theme)} />
      <SendDetailsStack.Screen name="PsbtMultisig" component={PsbtMultisig} options={PsbtMultisig.navigationOptions(theme)} />
      <SendDetailsStack.Screen
        name="PsbtMultisigQRCode"
        component={PsbtMultisigQRCode}
        options={PsbtMultisigQRCode.navigationOptions(theme)}
      />
      <SendDetailsStack.Screen
        name="Success"
        component={Success}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <SendDetailsStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <SendDetailsStack.Screen name="CoinControl" component={CoinControl} options={CoinControl.navigationOptions(theme)} />
    </SendDetailsStack.Navigator>
  );
};

const LNDCreateInvoiceStack = createStackNavigator();
const LNDCreateInvoiceRoot = () => {
  const theme = useTheme();

  return (
    <LNDCreateInvoiceStack.Navigator screenOptions={defaultStackScreenOptions}>
      <LNDCreateInvoiceStack.Screen
        name="LNDCreateInvoice"
        component={LNDCreateInvoice}
        options={LNDCreateInvoice.navigationOptions(theme)}
      />
      <LNDCreateInvoiceStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <LNDCreateInvoiceStack.Screen name="LNDViewInvoice" component={LNDViewInvoice} options={LNDViewInvoice.navigationOptions(theme)} />
      <LNDCreateInvoiceStack.Screen
        name="LNDViewAdditionalInvoiceInformation"
        component={LNDViewAdditionalInvoiceInformation}
        options={LNDViewAdditionalInvoiceInformation.navigationOptions(theme)}
      />
      <LNDCreateInvoiceStack.Screen
        name="LNDViewAdditionalInvoicePreImage"
        component={LNDViewAdditionalInvoicePreImage}
        options={LNDViewAdditionalInvoicePreImage.navigationOptions(theme)}
      />
    </LNDCreateInvoiceStack.Navigator>
  );
};

// LightningScanInvoiceStackNavigator === ScanLndInvoiceStack
const ScanLndInvoiceStack = createStackNavigator();
const ScanLndInvoiceRoot = () => {
  const theme = useTheme();

  return (
    <ScanLndInvoiceStack.Navigator screenOptions={defaultStackScreenOptions}>
      <ScanLndInvoiceStack.Screen name="ScanLndInvoice" component={ScanLndInvoice} options={ScanLndInvoice.navigationOptions(theme)} />
      <ScanLndInvoiceStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <ScanLndInvoiceStack.Screen name="Success" component={Success} options={{ headerShown: false, gestureEnabled: false }} />
      <ScanLndInvoiceStack.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions(theme)} />
      <ScanLndInvoiceStack.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions(theme)} />
    </ScanLndInvoiceStack.Navigator>
  );
};

const AztecoRedeemStack = createStackNavigator();
const AztecoRedeemRoot = () => {
  const theme = useTheme();

  return (
    <AztecoRedeemStack.Navigator screenOptions={defaultStackScreenOptions}>
      <AztecoRedeemStack.Screen name="AztecoRedeem" component={AztecoRedeem} options={AztecoRedeem.navigationOptions(theme)} />
      <AztecoRedeemStack.Screen name="SelectWallet" component={SelectWallet} options={{ headerLeft: null }} />
    </AztecoRedeemStack.Navigator>
  );
};

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
const HodlHodlLoginRoot = () => {
  const theme = useTheme();

  return (
    <HodlHodlLoginStack.Navigator name="HodlHodlLoginRoot" screenOptions={defaultStackScreenOptions}>
      <HodlHodlLoginStack.Screen name="HodlHodlLogin" component={HodlHodlLogin} options={HodlHodlLogin.navigationOptions(theme)} />
    </HodlHodlLoginStack.Navigator>
  );
};

const ReorderWalletsStack = createStackNavigator();
const ReorderWalletsStackRoot = () => {
  const theme = useTheme();

  return (
    <ReorderWalletsStack.Navigator name="ReorderWalletsRoot" screenOptions={defaultStackScreenOptions}>
      <ReorderWalletsStack.Screen name="ReorderWallets" component={ReorderWallets} options={ReorderWallets.navigationOptions(theme)} />
    </ReorderWalletsStack.Navigator>
  );
};

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

const ReceiveDetailsStack = createStackNavigator();
const ReceiveDetailsStackRoot = () => {
  const theme = useTheme();

  return (
    <ReceiveDetailsStack.Navigator name="ReceiveDetailsRoot" screenOptions={defaultStackScreenOptions} initialRouteName="ReceiveDetails">
      <RootStack.Screen name="ReceiveDetails" component={ReceiveDetails} options={ReceiveDetails.navigationOptions(theme)} />
    </ReceiveDetailsStack.Navigator>
  );
};

const WalletXpubStack = createStackNavigator();
const WalletXpubStackRoot = () => {
  const theme = useTheme();

  return (
    <WalletXpubStack.Navigator name="WalletXpubRoot" screenOptions={defaultStackScreenOptions} initialRouteName="WalletXpub">
      <WalletXpubStack.Screen name="WalletXpub" component={WalletXpub} options={WalletXpub.navigationOptions(theme)} />
    </WalletXpubStack.Navigator>
  );
};

const WalletExportStack = createStackNavigator();
const WalletExportStackRoot = () => {
  const theme = useTheme();

  return (
    <WalletExportStack.Navigator name="WalletExportRoot" screenOptions={defaultStackScreenOptions} initialRouteName="WalletExport">
      <WalletExportStack.Screen name="WalletExport" component={WalletExport} options={WalletExport.navigationOptions(theme)} />
    </WalletExportStack.Navigator>
  );
};

const LappBrowserStack = createStackNavigator();
const LappBrowserStackRoot = () => {
  const theme = useTheme();

  return (
    <LappBrowserStack.Navigator name="LappBrowserRoot" screenOptions={defaultStackScreenOptions} initialRouteName="LappBrowser">
      <LappBrowserStack.Screen name="LappBrowser" component={LappBrowser} options={LappBrowser.navigationOptions(theme)} />
    </LappBrowserStack.Navigator>
  );
};

const InitStack = createStackNavigator();
const InitRoot = () => (
  <InitStack.Navigator screenOptions={defaultScreenOptions} initialRouteName="LoadingScreenRoot">
    <InitStack.Screen name="LoadingScreenRoot" component={LoadingScreenRoot} options={{ headerShown: false, animationEnabled: false }} />
    <InitStack.Screen
      name="UnlockWithScreenRoot"
      component={UnlockWithScreenRoot}
      options={{ headerShown: false, animationEnabled: false }}
    />
    <InitStack.Screen name="ReorderWallets" component={ReorderWalletsStackRoot} options={{ headerShown: false, gestureEnabled: false }} />
    <InitStack.Screen name="DrawerRoot" component={DrawerRoot} options={{ headerShown: false, animationEnabled: false }} />
  </InitStack.Navigator>
);

const ViewEditMultisigCosignersStack = createStackNavigator();
const ViewEditMultisigCosignersRoot = () => {
  const theme = useTheme();

  return (
    <ViewEditMultisigCosignersStack.Navigator
      name="ViewEditMultisigCosignersRoot"
      screenOptions={defaultStackScreenOptions}
      initialRouteName="ViewEditMultisigCosigners"
    >
      <ViewEditMultisigCosignersStack.Screen
        name="ViewEditMultisigCosigners"
        component={ViewEditMultisigCosigners}
        options={ViewEditMultisigCosigners.navigationOptions(theme)}
      />
    </ViewEditMultisigCosignersStack.Navigator>
  );
};

const ExportMultisigCoordinationSetupStack = createStackNavigator();
const ExportMultisigCoordinationSetupRoot = () => {
  const theme = useTheme();

  return (
    <ExportMultisigCoordinationSetupStack.Navigator
      name="ExportMultisigCoordinationSetupRoot"
      screenOptions={defaultStackScreenOptions}
      initialRouteName="ExportMultisigCoordinationSetup"
    >
      <ExportMultisigCoordinationSetupStack.Screen
        name="ExportMultisigCoordinationSetup"
        component={ExportMultisigCoordinationSetup}
        options={ExportMultisigCoordinationSetup.navigationOptions(theme)}
      />
    </ExportMultisigCoordinationSetupStack.Navigator>
  );
};

const RootStack = createStackNavigator();
const Navigation = () => {
  const theme = useTheme();

  return (
    <RootStack.Navigator mode="modal" screenOptions={defaultScreenOptions} initialRouteName="LoadingScreenRoot">
      {/* stacks */}
      <RootStack.Screen name="WalletsRoot" component={WalletsRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="AddWalletRoot" component={AddWalletRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="SendDetailsRoot" component={SendDetailsRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="HodlHodlLoginRoot" component={HodlHodlLoginRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="HodlHodlMyContracts" component={HodlHodlMyContracts} options={HodlHodlMyContracts.navigationOptions(theme)} />
      <RootStack.Screen name="HodlHodlWebview" component={HodlHodlWebview} options={HodlHodlWebview.navigationOptions(theme)} />

      {/* screens */}
      <RootStack.Screen name="WalletExportRoot" component={WalletExportStackRoot} options={{ headerShown: false }} />
      <RootStack.Screen
        name="ExportMultisigCoordinationSetupRoot"
        component={ExportMultisigCoordinationSetupRoot}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="ViewEditMultisigCosignersRoot" component={ViewEditMultisigCosignersRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="WalletXpubRoot" component={WalletXpubStackRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="BuyBitcoin" component={BuyBitcoin} options={BuyBitcoin.navigationOptions(theme)} />
      <RootStack.Screen name="Marketplace" component={Marketplace} options={Marketplace.navigationOptions(theme)} />
      <RootStack.Screen name="SelectWallet" component={SelectWallet} options={{ headerLeft: null }} />
      <RootStack.Screen name="ReceiveDetailsRoot" component={ReceiveDetailsStackRoot} options={{ headerShown: false }} />
      <RootStack.Screen name="LappBrowserRoot" component={LappBrowserStackRoot} options={{ headerShown: false }} />

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
};

export default InitRoot;
