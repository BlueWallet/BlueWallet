import { DrawerNavigationOptions, createDrawerNavigator } from '@react-navigation/drawer';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext, useMemo } from 'react';
import { I18nManager, Platform } from 'react-native';

import PlausibleDeniability from './screen/PlausibleDeniability';
import Selftest from './screen/selftest';
import Currency from './screen/settings/Currency';
import GeneralSettings from './screen/settings/GeneralSettings';
import Licensing from './screen/settings/Licensing';
import NetworkSettings from './screen/settings/NetworkSettings';
import Settings from './screen/settings/Settings';
import About from './screen/settings/about';
import DefaultView from './screen/settings/DefaultView';
import ElectrumSettings from './screen/settings/electrumSettings';
import EncryptStorage from './screen/settings/encryptStorage';
import Language from './screen/settings/Language';
import LightningSettings from './screen/settings/lightningSettings';
import NotificationSettings from './screen/settings/notificationSettings';
import ReleaseNotes from './screen/settings/releasenotes';
import Tools from './screen/settings/tools';

import AddWallet from './screen/wallets/Add';
import WalletsAddMultisig from './screen/wallets/addMultisig';
import WalletsAddMultisigHelp, { WalletAddMultisigHelpNavigationOptions } from './screen/wallets/addMultisigHelp';
import WalletsAddMultisigStep2 from './screen/wallets/addMultisigStep2';
import WalletAddresses from './screen/wallets/addresses';
import WalletDetails from './screen/wallets/details';
import WalletExport from './screen/wallets/export';
import ExportMultisigCoordinationSetup from './screen/wallets/ExportMultisigCoordinationSetup';
import GenerateWord from './screen/wallets/generateWord';
import ImportWallet from './screen/wallets/import';
import ImportCustomDerivationPath from './screen/wallets/importCustomDerivationPath';
import ImportWalletDiscovery from './screen/wallets/importDiscovery';
import ImportSpeed from './screen/wallets/importSpeed';
import WalletsList from './screen/wallets/WalletsList';
import PleaseBackup from './screen/wallets/PleaseBackup';
import PleaseBackupLNDHub from './screen/wallets/pleaseBackupLNDHub';
import PleaseBackupLdk from './screen/wallets/pleaseBackupLdk';
import ProvideEntropy from './screen/wallets/provideEntropy';
import ReorderWallets from './screen/wallets/reorderWallets';
import SelectWallet from './screen/wallets/selectWallet';
import SignVerify from './screen/wallets/signVerify';
import WalletTransactions from './screen/wallets/transactions';
import ViewEditMultisigCosigners from './screen/wallets/ViewEditMultisigCosigners';
import WalletXpub from './screen/wallets/xpub';

import CPFP from './screen/transactions/CPFP';
import RBFBumpFee from './screen/transactions/RBFBumpFee';
import RBFCancel from './screen/transactions/RBFCancel';
import TransactionDetails from './screen/transactions/details';
import TransactionStatus from './screen/transactions/TransactionStatus';

import AztecoRedeem from './screen/receive/aztecoRedeem';
import ReceiveDetails from './screen/receive/details';

import ScanQRCode from './screen/send/ScanQRCode';
import Broadcast from './screen/send/Broadcast';
import CoinControl from './screen/send/coinControl';
import Confirm from './screen/send/confirm';
import SendCreate from './screen/send/create';
import SendDetails from './screen/send/details';
import IsItMyAddress from './screen/send/isItMyAddress';
import PsbtMultisig from './screen/send/psbtMultisig';
import PsbtMultisigQRCode from './screen/send/psbtMultisigQRCode';
import PsbtWithHardwareWallet from './screen/send/psbtWithHardwareWallet';
import Success from './screen/send/success';

import UnlockWith from './screen/UnlockWith';
import { isDesktop, isHandset } from './blue_modules/environment';
import navigationStyle from './components/navigationStyle';
import { useTheme } from './components/themes';
import loc from './loc';
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
import DrawerList from './screen/wallets/DrawerList';
import LdkViewLogs from './screen/wallets/ldkViewLogs';
import PaymentCode from './screen/wallets/paymentCode';
import PaymentCodesList from './screen/wallets/paymentCodesList';
import { BlueStorageContext } from './blue_modules/storage-context';
import { useIsLargeScreen } from './hooks/useIsLargeScreen';
import { HeaderRightButton } from './components/HeaderRightButton';

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

const DrawerListContent = (props: any) => {
  return <DrawerList {...props} />;
};

const Drawer = createDrawerNavigator();
const DrawerRoot = () => {
  const isLargeScreen = useIsLargeScreen();

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: { width: isLargeScreen ? 320 : '0%' },
      drawerType: isLargeScreen ? 'permanent' : 'back',
    }),
    [isLargeScreen],
  );

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerListContent}>
      <Drawer.Screen
        name="DetailViewStackScreensStack"
        component={DetailViewStackScreensStack}
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

const DetailViewRoot = createNativeStackNavigator();
const DetailViewStackScreensStack = () => {
  const { walletsInitialized } = useContext(BlueStorageContext);
  const theme = useTheme();

  const SaveButton = useMemo(() => {
    return <HeaderRightButton testID="Save" disabled={true} title={loc.wallets.details_save} />;
  }, []);

  return (
    <DetailViewRoot.Navigator
      initialRouteName="UnlockWithScreen"
      screenOptions={{ headerShadowVisible: false, animationTypeForReplace: 'push' }}
    >
      {!walletsInitialized ? (
        <DetailViewRoot.Screen
          name="UnlockWithScreen"
          component={UnlockWith}
          options={{ headerShown: false, statusBarStyle: 'auto', autoHideHomeIndicator: true }}
        />
      ) : (
        <DetailViewRoot.Group>
          <DetailViewRoot.Screen
            name="WalletsList"
            component={WalletsList}
            options={navigationStyle({ title: '', headerBackTitle: loc.wallets.list_title })(theme)}
          />
          <DetailViewRoot.Screen
            name="WalletTransactions"
            component={WalletTransactions}
            options={WalletTransactions.navigationOptions(theme)}
          />
          <DetailViewRoot.Screen name="LdkOpenChannel" component={LdkOpenChannel} options={LdkOpenChannel.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="LdkInfo" component={LdkInfo} options={LdkInfo.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="WalletDetails"
            component={WalletDetails}
            options={navigationStyle({
              headerTitle: loc.wallets.details_title,
              statusBarStyle: 'auto',
              headerRight: () => SaveButton,
            })(theme)}
          />
          <DetailViewRoot.Screen name="LdkViewLogs" component={LdkViewLogs} options={LdkViewLogs.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="TransactionDetails"
            component={TransactionDetails}
            options={TransactionDetails.navigationOptions(theme)}
          />
          <DetailViewRoot.Screen
            name="TransactionStatus"
            component={TransactionStatus}
            initialParams={{
              hash: undefined,
              walletID: undefined,
            }}
            options={navigationStyle({
              title: '',
              statusBarStyle: 'auto',
              headerStyle: {
                backgroundColor: theme.colors.customHeader,
              },
            })(theme)}
          />
          <DetailViewRoot.Screen name="CPFP" component={CPFP} options={CPFP.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="RBFBumpFee" component={RBFBumpFee} options={RBFBumpFee.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="RBFCancel" component={RBFCancel} options={RBFCancel.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="Settings"
            component={Settings}
            options={navigationStyle({
              headerTransparent: true,
              title: Platform.select({ ios: loc.settings.header, default: '' }),
              headerLargeTitle: true,
            })(theme)}
          />
          <DetailViewRoot.Screen name="SelectWallet" component={SelectWallet} options={SelectWallet.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="Currency" component={Currency} options={navigationStyle({ title: loc.settings.currency })(theme)} />
          <DetailViewRoot.Screen name="About" component={About} options={About.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="ReleaseNotes" component={ReleaseNotes} options={ReleaseNotes.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="Selftest" component={Selftest} options={Selftest.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="Licensing" component={Licensing} options={Licensing.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="DefaultView"
            component={DefaultView}
            options={navigationStyle({ title: loc.settings.default_title })(theme)}
          />

          <DetailViewRoot.Screen name="Language" component={Language} options={navigationStyle({ title: loc.settings.language })(theme)} />
          <DetailViewRoot.Screen name="EncryptStorage" component={EncryptStorage} options={EncryptStorage.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="GeneralSettings"
            component={GeneralSettings}
            options={navigationStyle({ title: loc.settings.general })(theme)}
          />
          <DetailViewRoot.Screen name="NetworkSettings" component={NetworkSettings} options={NetworkSettings.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="NotificationSettings"
            component={NotificationSettings}
            options={NotificationSettings.navigationOptions(theme)}
          />
          <DetailViewRoot.Screen
            name="PlausibleDeniability"
            component={PlausibleDeniability}
            options={navigationStyle({ title: loc.plausibledeniability.title })(theme)}
          />
          <DetailViewRoot.Screen
            name="LightningSettings"
            component={LightningSettings}
            options={LightningSettings.navigationOptions(theme)}
          />
          <DetailViewRoot.Screen name="ElectrumSettings" component={ElectrumSettings} options={ElectrumSettings.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="SettingsPrivacy"
            component={SettingsPrivacy}
            options={navigationStyle({ headerLargeTitle: true, title: loc.settings.privacy })(theme)}
          />
          <DetailViewRoot.Screen name="Tools" component={Tools} options={Tools.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="LNDViewInvoice" component={LNDViewInvoice} options={LNDViewInvoice.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="LNDViewAdditionalInvoiceInformation"
            component={LNDViewAdditionalInvoiceInformation}
            options={LNDViewAdditionalInvoiceInformation.navigationOptions(theme)}
          />
          <DetailViewRoot.Screen
            name="LNDViewAdditionalInvoicePreImage"
            component={LNDViewAdditionalInvoicePreImage}
            options={LNDViewAdditionalInvoicePreImage.navigationOptions(theme)}
          />

          <DetailViewRoot.Screen
            name="Broadcast"
            component={Broadcast}
            options={navigationStyle({ title: loc.send.create_broadcast })(theme)}
          />
          <DetailViewRoot.Screen name="IsItMyAddress" component={IsItMyAddress} options={IsItMyAddress.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="GenerateWord" component={GenerateWord} options={GenerateWord.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="LnurlPay" component={LnurlPay} options={LnurlPay.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="LnurlPaySuccess" component={LnurlPaySuccess} options={LnurlPaySuccess.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="LnurlAuth" component={LnurlAuth} options={LnurlAuth.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="Success"
            component={Success}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <DetailViewRoot.Screen name="WalletAddresses" component={WalletAddresses} options={WalletAddresses.navigationOptions(theme)} />

          <DetailViewRoot.Screen name="AddWalletRoot" component={AddWalletRoot} options={NavigationFormModalOptions} />
          <DetailViewRoot.Screen
            name="SendDetailsRoot"
            component={SendDetailsRoot}
            options={isDesktop ? NavigationDefaultOptionsForDesktop : NavigationDefaultOptions}
          />
          <DetailViewRoot.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewRoot.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewRoot.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={NavigationDefaultOptions} />
          {/* screens */}
          <DetailViewRoot.Screen
            name="WalletExportRoot"
            component={WalletExportStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewRoot.Screen
            name="ExportMultisigCoordinationSetupRoot"
            component={ExportMultisigCoordinationSetupRoot}
            options={NavigationDefaultOptions}
          />
          <DetailViewRoot.Screen
            name="ViewEditMultisigCosignersRoot"
            component={ViewEditMultisigCosignersRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions, gestureEnabled: false, fullScreenGestureEnabled: false }}
          />
          <DetailViewRoot.Screen
            name="WalletXpubRoot"
            component={WalletXpubStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewRoot.Screen
            name="SignVerifyRoot"
            component={SignVerifyStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewRoot.Screen name="ReceiveDetailsRoot" component={ReceiveDetailsStackRoot} options={NavigationDefaultOptions} />
          <DetailViewRoot.Screen name="LDKOpenChannelRoot" component={LDKOpenChannelRoot} options={NavigationDefaultOptions} />

          <DetailViewRoot.Screen
            name="ScanQRCodeRoot"
            component={ScanQRCodeRoot}
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              statusBarHidden: true,
            }}
            initialParams={ScanQRCode.initialParams}
          />

          <DetailViewRoot.Screen name="PaymentCodeRoot" component={PaymentCodeStackRoot} options={NavigationDefaultOptions} />
          <DetailViewRoot.Screen
            name="ReorderWallets"
            component={ReorderWalletsStackRoot}
            options={{
              headerShown: false,
              gestureEnabled: false,
              presentation: 'modal',
            }}
          />
        </DetailViewRoot.Group>
      )}
    </DetailViewRoot.Navigator>
  );
};

export type ViewEditMultisigCosignersStackParamsList = {
  ViewEditMultisigCosigners: { walletID: string };
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
        options={navigationStyle({
          closeButton: true,
          headerBackVisible: false,
          statusBarStyle: 'light',
          title: loc.multisig.export_coordination_setup,
        })(theme)}
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

const NavigationDefaultOptions: NativeStackNavigationOptions = { headerShown: false, presentation: 'modal' };
const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};
const NavigationDefaultOptionsForDesktop: NativeStackNavigationOptions = { headerShown: false, presentation: 'fullScreenModal' };
const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const MainRoot = () => {
  return isHandset ? <DetailViewStackScreensStack /> : <DrawerRoot />;
};

export default MainRoot;
