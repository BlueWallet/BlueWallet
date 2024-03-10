import { DrawerNavigationOptions, createDrawerNavigator } from '@react-navigation/drawer';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext, useMemo } from 'react';
import { Dimensions, I18nManager, Platform, useWindowDimensions } from 'react-native';

import PlausibleDeniability from './screen/PlausibleDeniability';
import Selftest from './screen/selftest';
import Currency from './screen/settings/Currency';
import GeneralSettings from './screen/settings/GeneralSettings';
import Licensing from './screen/settings/Licensing';
import NetworkSettings from './screen/settings/NetworkSettings';
import Settings from './screen/settings/Settings';
import About from './screen/settings/about';
import DefaultView from './screen/settings/defaultView';
import ElectrumSettings from './screen/settings/electrumSettings';
import EncryptStorage from './screen/settings/encryptStorage';
import Language from './screen/settings/language';
import LightningSettings from './screen/settings/lightningSettings';
import NotificationSettings from './screen/settings/notificationSettings';
import ReleaseNotes from './screen/settings/releasenotes';
import Tools from './screen/settings/tools';

import AddWallet from './screen/wallets/add';
import WalletsAddMultisig from './screen/wallets/addMultisig';
import WalletsAddMultisigHelp, { WalletAddMultisigHelpNavigationOptions } from './screen/wallets/addMultisigHelp';
import WalletsAddMultisigStep2 from './screen/wallets/addMultisigStep2';
import WalletAddresses from './screen/wallets/addresses';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import ExportMultisigCoordinationSetup from './screen/wallets/exportMultisigCoordinationSetup';
import GenerateWord from './screen/wallets/generateWord';
import ImportWallet from './screen/wallets/import';
import ImportCustomDerivationPath from './screen/wallets/importCustomDerivationPath';
import ImportWalletDiscovery from './screen/wallets/importDiscovery';
import ImportSpeed from './screen/wallets/importSpeed';
import WalletsList from './screen/wallets/list';
import PleaseBackup from './screen/wallets/pleaseBackup';
import PleaseBackupLNDHub from './screen/wallets/pleaseBackupLNDHub';
import PleaseBackupLdk from './screen/wallets/pleaseBackupLdk';
import ProvideEntropy from './screen/wallets/provideEntropy';
import ReorderWallets from './screen/wallets/reorderWallets';
import SelectWallet from './screen/wallets/selectWallet';
import SignVerify from './screen/wallets/signVerify';
import WalletTransactions from './screen/wallets/transactions';
import ViewEditMultisigCosigners from './screen/wallets/viewEditMultisigCosigners';
import WalletXpub from './screen/wallets/xpub';

import CPFP from './screen/transactions/CPFP';
import RBFBumpFee from './screen/transactions/RBFBumpFee';
import RBFCancel from './screen/transactions/RBFCancel';
import TransactionDetails from './screen/transactions/details';
import TransactionStatus from './screen/transactions/transactionStatus';

import AztecoRedeem from './screen/receive/aztecoRedeem';
import ReceiveDetails from './screen/receive/details';

import ScanQRCode from './screen/send/ScanQRCode';
import Broadcast from './screen/send/broadcast';
import CoinControl from './screen/send/coinControl';
import Confirm from './screen/send/confirm';
import SendCreate from './screen/send/create';
import SendDetails from './screen/send/details';
import IsItMyAddress from './screen/send/isItMyAddress';
import PsbtMultisig from './screen/send/psbtMultisig';
import PsbtMultisigQRCode from './screen/send/psbtMultisigQRCode';
import PsbtWithHardwareWallet from './screen/send/psbtWithHardwareWallet';
import Success from './screen/send/success';

import UnlockWith from './UnlockWith';
import { isDesktop, isHandset, isTablet } from './blue_modules/environment';
import navigationStyle from './components/navigationStyle';
import { useTheme } from './components/themes';
import loc from './loc';
import LappBrowser from './screen/lnd/browser';
import LdkInfo from './screen/lnd/ldkInfo';
import LdkOpenChannel from './screen/lnd/ldkOpenChannel';
import LNDCreateInvoice from './screen/lnd/lndCreateInvoice';
import LNDViewAdditionalInvoiceInformation from './screen/lnd/lndViewAdditionalInvoiceInformation';
import LNDViewAdditionalInvoicePreImage from './screen/lnd/lndViewAdditionalInvoicePreImage';
import LNDViewInvoice from './screen/lnd/lndViewInvoice';
import LnurlAuth from './screen/lnd/lnurlAuth';
import LnurlPay from './screen/lnd/lnurlPay';
import LnurlPaySuccess from './screen/lnd/lnurlPaySuccess';
import ScanLndInvoice from './screen/lnd/scanLndInvoice';
import SettingsPrivacy from './screen/settings/SettingsPrivacy';
import DrawerList from './screen/wallets/drawerList';
import LdkViewLogs from './screen/wallets/ldkViewLogs';
import PaymentCode from './screen/wallets/paymentCode';
import PaymentCodesList from './screen/wallets/paymentCodesList';
import { BlueStorageContext } from './blue_modules/storage-context';

const WalletsStack = createNativeStackNavigator();

const WalletsRoot = () => {
  const theme = useTheme();

  return (
    <WalletsStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <WalletsStack.Screen name="WalletsList" component={WalletsList} options={WalletsList.navigationOptions(theme)} />
      <WalletsStack.Screen name="WalletTransactions" component={WalletTransactions} options={WalletTransactions.navigationOptions(theme)} />
      <WalletsStack.Screen name="LdkOpenChannel" component={LdkOpenChannel} options={LdkOpenChannel.navigationOptions(theme)} />
      <WalletsStack.Screen name="LdkInfo" component={LdkInfo} options={LdkInfo.navigationOptions(theme)} />
      <WalletsStack.Screen name="WalletDetails" component={WalletDetails} options={WalletDetails.navigationOptions(theme)} />
      <WalletsStack.Screen name="LdkViewLogs" component={LdkViewLogs} options={LdkViewLogs.navigationOptions(theme)} />
      <WalletsStack.Screen name="TransactionDetails" component={TransactionDetails} options={TransactionDetails.navigationOptions(theme)} />
      <WalletsStack.Screen name="TransactionStatus" component={TransactionStatus} options={TransactionStatus.navigationOptions(theme)} />
      <WalletsStack.Screen name="CPFP" component={CPFP} options={CPFP.navigationOptions(theme)} />
      <WalletsStack.Screen name="RBFBumpFee" component={RBFBumpFee} options={RBFBumpFee.navigationOptions(theme)} />
      <WalletsStack.Screen name="RBFCancel" component={RBFCancel} options={RBFCancel.navigationOptions(theme)} />
      <WalletsStack.Screen name="Settings" component={Settings} options={Settings.navigationOptions(theme)} />
      <WalletsStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <WalletsStack.Screen name="Currency" component={Currency} options={navigationStyle({ title: loc.settings.currency })(theme)} />
      <WalletsStack.Screen name="About" component={About} options={About.navigationOptions(theme)} />
      <WalletsStack.Screen name="ReleaseNotes" component={ReleaseNotes} options={ReleaseNotes.navigationOptions(theme)} />
      <WalletsStack.Screen name="Selftest" component={Selftest} options={Selftest.navigationOptions(theme)} />
      <WalletsStack.Screen name="Licensing" component={Licensing} options={Licensing.navigationOptions(theme)} />
      <WalletsStack.Screen name="DefaultView" component={DefaultView} options={DefaultView.navigationOptions(theme)} />
      <WalletsStack.Screen name="Language" component={Language} options={navigationStyle({ title: loc.settings.language })(theme)} />
      <WalletsStack.Screen name="EncryptStorage" component={EncryptStorage} options={EncryptStorage.navigationOptions(theme)} />
      <WalletsStack.Screen
        name="GeneralSettings"
        component={GeneralSettings}
        options={navigationStyle({ title: loc.settings.general })(theme)}
      />
      <WalletsStack.Screen name="NetworkSettings" component={NetworkSettings} options={NetworkSettings.navigationOptions(theme)} />
      <WalletsStack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={NotificationSettings.navigationOptions(theme)}
      />
      <WalletsStack.Screen
        name="PlausibleDeniability"
        component={PlausibleDeniability}
        options={navigationStyle({ title: loc.plausibledeniability.title })(theme)}
      />
      <WalletsStack.Screen name="LightningSettings" component={LightningSettings} options={LightningSettings.navigationOptions(theme)} />
      <WalletsStack.Screen name="ElectrumSettings" component={ElectrumSettings} options={ElectrumSettings.navigationOptions(theme)} />
      <WalletsStack.Screen name="SettingsPrivacy" component={SettingsPrivacy} options={SettingsPrivacy.navigationOptions(theme)} />
      <WalletsStack.Screen name="Tools" component={Tools} options={Tools.navigationOptions(theme)} />
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
      <WalletsStack.Screen name="GenerateWord" component={GenerateWord} options={GenerateWord.navigationOptions(theme)} />
      <WalletsStack.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions(theme)} />
      <WalletsStack.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions(theme)} />
      <WalletsStack.Screen name="LnurlAuth" component={LnurlAuth} options={LnurlAuth.navigationOptions(theme)} />
      <WalletsStack.Screen
        name="Success"
        component={Success}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <WalletsStack.Screen name="WalletAddresses" component={WalletAddresses} options={WalletAddresses.navigationOptions(theme)} />
    </WalletsStack.Navigator>
  );
};

const AddWalletStack = createNativeStackNavigator();
const AddWalletRoot = () => {
  const theme = useTheme();

  return (
    <AddWalletStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <AddWalletStack.Screen
        name="AddWallet"
        component={AddWallet}
        options={navigationStyle({
          closeButton: true,
          headerBackVisible: false,
          title: loc.wallets.add_title,
        })(theme)}
      />
      <AddWalletStack.Screen name="ImportWallet" component={ImportWallet} options={ImportWallet.navigationOptions(theme)} />
      <AddWalletStack.Screen
        name="ImportWalletDiscovery"
        component={ImportWalletDiscovery}
        options={ImportWalletDiscovery.navigationOptions(theme)}
      />
      <AddWalletStack.Screen
        name="ImportCustomDerivationPath"
        component={ImportCustomDerivationPath}
        options={ImportCustomDerivationPath.navigationOptions(theme)}
      />
      <AddWalletStack.Screen name="ImportSpeed" component={ImportSpeed} options={ImportSpeed.navigationOptions(theme)} />
      <AddWalletStack.Screen
        name="PleaseBackup"
        component={PleaseBackup}
        options={navigationStyle({
          gestureEnabled: false,
          headerBackVisible: false,
          title: loc.pleasebackup.title,
        })(theme)}
      />
      <AddWalletStack.Screen
        name="PleaseBackupLNDHub"
        component={PleaseBackupLNDHub}
        options={PleaseBackupLNDHub.navigationOptions(theme)}
      />
      <AddWalletStack.Screen name="PleaseBackupLdk" component={PleaseBackupLdk} options={PleaseBackupLdk.navigationOptions(theme)} />
      <AddWalletStack.Screen name="ProvideEntropy" component={ProvideEntropy} options={ProvideEntropy.navigationOptions(theme)} />
      <AddWalletStack.Screen
        name="WalletsAddMultisig"
        component={WalletsAddMultisig}
        options={WalletsAddMultisig.navigationOptions(theme)}
        initialParams={WalletsAddMultisig.initialParams}
      />
      <AddWalletStack.Screen
        name="WalletsAddMultisigStep2"
        component={WalletsAddMultisigStep2}
        options={WalletsAddMultisigStep2.navigationOptions(theme)}
      />
      <AddWalletStack.Screen
        name="WalletsAddMultisigHelp"
        component={WalletsAddMultisigHelp}
        options={WalletAddMultisigHelpNavigationOptions}
      />
    </AddWalletStack.Navigator>
  );
};

// CreateTransactionStackNavigator === SendDetailsStack
const SendDetailsStack = createNativeStackNavigator();
const SendDetailsRoot = () => {
  const theme = useTheme();

  return (
    <SendDetailsStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <SendDetailsStack.Screen
        name="SendDetails"
        component={SendDetails}
        options={SendDetails.navigationOptions(theme)}
        initialParams={SendDetails.initialParams}
      />
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

const LNDCreateInvoiceStack = createNativeStackNavigator();
const LNDCreateInvoiceRoot = () => {
  const theme = useTheme();

  return (
    <LNDCreateInvoiceStack.Navigator screenOptions={{ headerShadowVisible: false }}>
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
const ScanLndInvoiceStack = createNativeStackNavigator();
const ScanLndInvoiceRoot = () => {
  const theme = useTheme();

  return (
    <ScanLndInvoiceStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <ScanLndInvoiceStack.Screen
        name="ScanLndInvoice"
        component={ScanLndInvoice}
        options={ScanLndInvoice.navigationOptions(theme)}
        initialParams={ScanLndInvoice.initialParams}
      />
      <ScanLndInvoiceStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <ScanLndInvoiceStack.Screen name="Success" component={Success} options={{ headerShown: false, gestureEnabled: false }} />
      <ScanLndInvoiceStack.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions(theme)} />
      <ScanLndInvoiceStack.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions(theme)} />
    </ScanLndInvoiceStack.Navigator>
  );
};

const LDKOpenChannelStack = createNativeStackNavigator();
const LDKOpenChannelRoot = () => {
  const theme = useTheme();

  return (
    <LDKOpenChannelStack.Navigator id="LDKOpenChannelRoot" screenOptions={{ headerShadowVisible: false }} initialRouteName="SelectWallet">
      <LDKOpenChannelStack.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
      <LDKOpenChannelStack.Screen
        name="LDKOpenChannelSetAmount"
        component={LdkOpenChannel}
        options={LdkOpenChannel.navigationOptions(theme)}
      />
      <LDKOpenChannelStack.Screen name="Success" component={Success} options={{ headerShown: false, gestureEnabled: false }} />
    </LDKOpenChannelStack.Navigator>
  );
};

const AztecoRedeemStack = createNativeStackNavigator();
const AztecoRedeemRoot = () => {
  const theme = useTheme();

  return (
    <AztecoRedeemStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <AztecoRedeemStack.Screen name="AztecoRedeem" component={AztecoRedeem} options={AztecoRedeem.navigationOptions(theme)} />
      <AztecoRedeemStack.Screen name="SelectWallet" component={SelectWallet} />
    </AztecoRedeemStack.Navigator>
  );
};

const ScanQRCodeStack = createNativeStackNavigator();
const ScanQRCodeRoot = () => (
  <ScanQRCodeStack.Navigator
    initialRouteName="ScanQRCode"
    id="ScanQRCodeRoot"
    screenOptions={{ headerShown: false, presentation: 'fullScreenModal' }}
  >
    <ScanQRCodeStack.Screen name="ScanQRCode" component={ScanQRCode} initialParams={ScanQRCode.initialParams} />
  </ScanQRCodeStack.Navigator>
);

const UnlockWithScreenStack = createNativeStackNavigator();
const UnlockWithScreenRoot = () => (
  <UnlockWithScreenStack.Navigator id="UnlockWithScreenRoot" screenOptions={{ headerShown: false, statusBarStyle: 'auto' }}>
    <UnlockWithScreenStack.Screen name="UnlockWithScreen" component={UnlockWith} />
  </UnlockWithScreenStack.Navigator>
);

const ReorderWalletsStack = createNativeStackNavigator();
const ReorderWalletsStackRoot = () => {
  const theme = useTheme();

  return (
    <ReorderWalletsStack.Navigator id="ReorderWalletsRoot" screenOptions={{ headerShadowVisible: false }}>
      <ReorderWalletsStack.Screen
        name="ReorderWalletsScreen"
        component={ReorderWallets}
        options={ReorderWallets.navigationOptions(theme)}
      />
    </ReorderWalletsStack.Navigator>
  );
};

const Drawer = createDrawerNavigator();
const DrawerRoot = () => {
  const dimensions = useWindowDimensions();
  const isLargeScreen = useMemo(() => {
    return Platform.OS === 'android' ? isTablet() : (dimensions.width >= Dimensions.get('screen').width / 2 && isTablet()) || isDesktop;
  }, [dimensions.width]);
  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: { width: isLargeScreen ? 320 : '0%' },
      drawerType: isLargeScreen ? 'permanent' : 'back',
    }),
    [isLargeScreen],
  );

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerList}>
      <Drawer.Screen
        name="Navigation"
        component={Navigation}
        options={{ headerShown: false, gestureHandlerProps: { enableTrackpadTwoFingerGesture: false } }}
      />
    </Drawer.Navigator>
  );
};

const ReceiveDetailsStack = createNativeStackNavigator();
const ReceiveDetailsStackRoot = () => {
  const theme = useTheme();

  return (
    <ReceiveDetailsStack.Navigator id="ReceiveDetailsRoot" screenOptions={{ headerShadowVisible: false }} initialRouteName="ReceiveDetails">
      <ReceiveDetailsStack.Screen name="ReceiveDetails" component={ReceiveDetails} options={ReceiveDetails.navigationOptions(theme)} />
    </ReceiveDetailsStack.Navigator>
  );
};

const WalletXpubStack = createNativeStackNavigator();
const WalletXpubStackRoot = () => {
  const theme = useTheme();

  return (
    <WalletXpubStack.Navigator
      id="WalletXpubRoot"
      screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }}
      initialRouteName="WalletXpub"
    >
      <WalletXpubStack.Screen
        name="WalletXpub"
        component={WalletXpub}
        options={navigationStyle({
          closeButton: true,
          headerBackVisible: false,
          headerTitle: loc.wallets.xpub_title,
        })(theme)}
      />
    </WalletXpubStack.Navigator>
  );
};

const SignVerifyStack = createNativeStackNavigator();
const SignVerifyStackRoot = () => {
  const theme = useTheme();

  return (
    <SignVerifyStack.Navigator
      id="SignVerifyRoot"
      screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }}
      initialRouteName="SignVerify"
    >
      <SignVerifyStack.Screen name="SignVerify" component={SignVerify} options={SignVerify.navigationOptions(theme)} />
    </SignVerifyStack.Navigator>
  );
};

const WalletExportStack = createNativeStackNavigator();
const WalletExportStackRoot = () => {
  const theme = useTheme();

  return (
    <WalletExportStack.Navigator
      id="WalletExportRoot"
      screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }}
      initialRouteName="WalletExport"
    >
      <WalletExportStack.Screen name="WalletExport" component={WalletExport} options={WalletExport.navigationOptions(theme)} />
    </WalletExportStack.Navigator>
  );
};

const LappBrowserStack = createNativeStackNavigator();
const LappBrowserStackRoot = () => {
  const theme = useTheme();

  return (
    <LappBrowserStack.Navigator id="LappBrowserRoot" screenOptions={{ headerShadowVisible: false }} initialRouteName="LappBrowser">
      <LappBrowserStack.Screen name="LappBrowser" component={LappBrowser} options={LappBrowser.navigationOptions(theme)} />
    </LappBrowserStack.Navigator>
  );
};

const InitStack = createNativeStackNavigator();
const InitRoot = () => {
  const { walletsInitialized } = useContext(BlueStorageContext);
  return (
    <InitStack.Navigator initialRouteName="UnlockWithScreenRoot" screenOptions={{ animationTypeForReplace: 'push' }}>
      {!walletsInitialized ? (
        <InitStack.Screen name="UnlockWithScreenRoot" component={UnlockWithScreenRoot} options={{ headerShown: false }} />
      ) : (
        <InitStack.Screen
          name={isHandset ? 'Navigation' : 'DrawerRoot'}
          component={isHandset ? Navigation : DrawerRoot}
          options={{ headerShown: false }}
        />
      )}
    </InitStack.Navigator>
  );
};

export type ViewEditMultisigCosignersStackParamsList = {
  ViewEditMultisigCosigners: { walletId: string };
};

const ViewEditMultisigCosignersStack = createNativeStackNavigator<ViewEditMultisigCosignersStackParamsList>();
const ViewEditMultisigCosignersRoot = () => {
  const theme = useTheme();

  return (
    <ViewEditMultisigCosignersStack.Navigator
      id="ViewEditMultisigCosignersRoot"
      initialRouteName="ViewEditMultisigCosigners"
      screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }}
    >
      <ViewEditMultisigCosignersStack.Screen
        name="ViewEditMultisigCosigners"
        component={ViewEditMultisigCosigners}
        options={ViewEditMultisigCosigners.navigationOptions(theme)}
      />
    </ViewEditMultisigCosignersStack.Navigator>
  );
};

const ExportMultisigCoordinationSetupStack = createNativeStackNavigator();
const ExportMultisigCoordinationSetupRoot = () => {
  const theme = useTheme();

  return (
    <ExportMultisigCoordinationSetupStack.Navigator
      id="ExportMultisigCoordinationSetupRoot"
      initialRouteName="ExportMultisigCoordinationSetup"
      screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }}
    >
      <ExportMultisigCoordinationSetupStack.Screen
        name="ExportMultisigCoordinationSetup"
        component={ExportMultisigCoordinationSetup}
        options={ExportMultisigCoordinationSetup.navigationOptions(theme)}
      />
    </ExportMultisigCoordinationSetupStack.Navigator>
  );
};

export type PaymentCodeStackParamList = {
  PaymentCode: { paymentCode: string };
  PaymentCodesList: { walletID: string };
};

const PaymentCodeStack = createNativeStackNavigator<PaymentCodeStackParamList>();

const PaymentCodeStackRoot = () => {
  return (
    <PaymentCodeStack.Navigator id="PaymentCodeRoot" screenOptions={{ headerShadowVisible: false }} initialRouteName="PaymentCode">
      <PaymentCodeStack.Screen name="PaymentCode" component={PaymentCode} options={{ headerTitle: loc.bip47.payment_code }} />
      <PaymentCodeStack.Screen
        name="PaymentCodesList"
        component={PaymentCodesList}
        options={{ headerTitle: loc.bip47.payment_codes_list }}
      />
    </PaymentCodeStack.Navigator>
  );
};

const RootStack = createNativeStackNavigator();
const NavigationDefaultOptions: NativeStackNavigationOptions = { headerShown: false, presentation: 'modal' };
const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};
const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };
const Navigation = () => {
  return (
    <RootStack.Navigator initialRouteName="UnlockWithScreenRoot" screenOptions={{ headerShadowVisible: false, statusBarStyle: 'auto' }}>
      {/* stacks */}
      <RootStack.Screen name="WalletsRoot" component={WalletsRoot} options={{ headerShown: false, statusBarTranslucent: false }} />
      <RootStack.Screen name="AddWalletRoot" component={AddWalletRoot} options={NavigationFormModalOptions} />
      <RootStack.Screen name="SendDetailsRoot" component={SendDetailsRoot} options={NavigationDefaultOptions} />
      <RootStack.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
      <RootStack.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={NavigationDefaultOptions} />
      <RootStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={NavigationDefaultOptions} />
      {/* screens */}
      <RootStack.Screen
        name="WalletExportRoot"
        component={WalletExportStackRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <RootStack.Screen
        name="ExportMultisigCoordinationSetupRoot"
        component={ExportMultisigCoordinationSetupRoot}
        options={NavigationDefaultOptions}
      />
      <RootStack.Screen
        name="ViewEditMultisigCosignersRoot"
        component={ViewEditMultisigCosignersRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <RootStack.Screen
        name="WalletXpubRoot"
        component={WalletXpubStackRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <RootStack.Screen
        name="SignVerifyRoot"
        component={SignVerifyStackRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <RootStack.Screen name="SelectWallet" component={SelectWallet} />
      <RootStack.Screen name="ReceiveDetailsRoot" component={ReceiveDetailsStackRoot} options={NavigationDefaultOptions} />
      <RootStack.Screen name="LappBrowserRoot" component={LappBrowserStackRoot} options={NavigationDefaultOptions} />
      <RootStack.Screen name="LDKOpenChannelRoot" component={LDKOpenChannelRoot} options={NavigationDefaultOptions} />

      <RootStack.Screen
        name="ScanQRCodeRoot"
        component={ScanQRCodeRoot}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          statusBarHidden: true,
        }}
        initialParams={ScanQRCode.initialParams}
      />

      <RootStack.Screen name="PaymentCodeRoot" component={PaymentCodeStackRoot} options={NavigationDefaultOptions} />
      <InitStack.Screen
        name="ReorderWallets"
        component={ReorderWalletsStackRoot}
        options={{
          headerShown: false,
          gestureEnabled: false,
          presentation: 'modal',
        }}
      />
    </RootStack.Navigator>
  );
};

export default InitRoot;
