import { DrawerNavigationOptions, createDrawerNavigator } from '@react-navigation/drawer';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext, useMemo } from 'react';
import { I18nManager, Platform } from 'react-native';
import AddWalletStack from './navigation/AddWalletStack';
import { StackActions } from '@react-navigation/native';

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
import WalletAddresses from './screen/wallets/addresses';
import WalletDetails from './screen/wallets/details';
import ExportMultisigCoordinationSetup from './screen/wallets/ExportMultisigCoordinationSetup';
import GenerateWord from './screen/wallets/generateWord';
import WalletsList from './screen/wallets/WalletsList';
import SelectWallet from './screen/wallets/selectWallet';
import SignVerify from './screen/wallets/signVerify';
import WalletTransactions from './screen/wallets/transactions';
import ViewEditMultisigCosigners from './screen/wallets/ViewEditMultisigCosigners';

import CPFP from './screen/transactions/CPFP';
import RBFBumpFee from './screen/transactions/RBFBumpFee';
import RBFCancel from './screen/transactions/RBFCancel';
import TransactionDetails from './screen/transactions/details';
import TransactionStatus from './screen/transactions/TransactionStatus';

import AztecoRedeem from './screen/receive/aztecoRedeem';

import ScanQRCode from './screen/send/ScanQRCode';
import Broadcast from './screen/send/Broadcast';
import IsItMyAddress from './screen/send/isItMyAddress';
import Success from './screen/send/success';

import UnlockWith from './screen/UnlockWith';
import { isDesktop, isHandset } from './blue_modules/environment';
import navigationStyle from './components/navigationStyle';
import { useTheme } from './components/themes';
import loc from './loc';
import LdkInfo from './screen/lnd/ldkInfo';
import LdkOpenChannel from './screen/lnd/ldkOpenChannel';
import LNDViewAdditionalInvoiceInformation from './screen/lnd/lndViewAdditionalInvoiceInformation';
import LNDViewAdditionalInvoicePreImage from './screen/lnd/lndViewAdditionalInvoicePreImage';
import LNDViewInvoice from './screen/lnd/lndViewInvoice';
import LnurlAuth from './screen/lnd/lnurlAuth';
import LnurlPay from './screen/lnd/lnurlPay';
import LnurlPaySuccess from './screen/lnd/lnurlPaySuccess';
import SettingsPrivacy from './screen/settings/SettingsPrivacy';
import DrawerList from './screen/wallets/DrawerList';
import LdkViewLogs from './screen/wallets/ldkViewLogs';
import PaymentCode from './screen/wallets/paymentCode';
import PaymentCodesList from './screen/wallets/paymentCodesList';
import { BlueStorageContext } from './blue_modules/storage-context';
import { useIsLargeScreen } from './hooks/useIsLargeScreen';
import HeaderRightButton from './components/HeaderRightButton';
import WalletExportStack from './navigation/WalletExportStack';
import SendDetailsStack from './navigation/SendDetailsStack';
import LNDCreateInvoiceRoot from './navigation/LNDCreateInvoiceStack';
import ReceiveDetailsStackRoot from './navigation/ReceiveDetailsStack';
import ScanLndInvoiceRoot from './navigation/ScanLndInvoiceStack';
import { useExtendedNavigation } from './hooks/useExtendedNavigation';
import ReorderWalletsStackRoot from './navigation/ReorderWalletsStack';
import WalletXpubStackRoot from './navigation/WalletXpubStack';

const LDKOpenChannelStack = createNativeStackNavigator();
const LDKOpenChannelRoot = () => {
  const theme = useTheme();

  return (
    <LDKOpenChannelStack.Navigator id="LDKOpenChannelRoot" screenOptions={{ headerShadowVisible: false }} initialRouteName="SelectWallet">
      <LDKOpenChannelStack.Screen
        name="SelectWallet"
        component={SelectWallet}
        options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
      />
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

const DetailViewRoot = createNativeStackNavigator();
const DetailViewStackScreensStack = () => {
  const { walletsInitialized } = useContext(BlueStorageContext);
  const theme = useTheme();
  const navigation = useExtendedNavigation();

  const popToTop = () => {
    navigation.dispatch(StackActions.popToTop());
  };

  const SaveButton = useMemo(() => <HeaderRightButton testID="Save" disabled={true} title={loc.wallets.details_save} />, []);

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
            options={navigationStyle({
              title: '',
              headerBackTitle: loc.wallets.list_title,
              navigationBarColor: theme.colors.navigationBarColor,
              headerShown: !isDesktop,
              headerStyle: {
                backgroundColor: theme.colors.customHeader,
              },
            })(theme)}
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
              headerRight: () => SaveButton,
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
          <DetailViewRoot.Screen
            name="SelectWallet"
            component={SelectWallet}
            options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
          />
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
          <DetailViewRoot.Screen
            name="LNDViewInvoice"
            component={LNDViewInvoice}
            options={navigationStyle({
              statusBarStyle: 'auto',
              headerTitle: loc.lndViewInvoice.lightning_invoice,
              headerStyle: {
                backgroundColor: theme.colors.customHeader,
              },
            })(theme)}
          />
          <DetailViewRoot.Screen
            name="LNDViewAdditionalInvoiceInformation"
            component={LNDViewAdditionalInvoiceInformation}
            options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
          />
          <DetailViewRoot.Screen
            name="LNDViewAdditionalInvoicePreImage"
            component={LNDViewAdditionalInvoicePreImage}
            options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
          />

          <DetailViewRoot.Screen
            name="Broadcast"
            component={Broadcast}
            options={navigationStyle({ title: loc.send.create_broadcast })(theme)}
          />
          <DetailViewRoot.Screen name="IsItMyAddress" component={IsItMyAddress} options={IsItMyAddress.navigationOptions(theme)} />
          <DetailViewRoot.Screen name="GenerateWord" component={GenerateWord} options={GenerateWord.navigationOptions(theme)} />
          <DetailViewRoot.Screen
            name="LnurlPay"
            component={LnurlPay}
            options={navigationStyle({
              title: '',
              closeButton: true,
              closeButtonFunc: popToTop,
            })(theme)}
          />
          <DetailViewRoot.Screen
            name="LnurlPaySuccess"
            component={LnurlPaySuccess}
            options={navigationStyle({
              title: '',
              closeButton: true,
              headerBackVisible: false,
              gestureEnabled: false,
              closeButtonFunc: popToTop,
            })(theme)}
          />
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

          <DetailViewRoot.Screen name="AddWalletRoot" component={AddWalletStack} options={NavigationFormModalOptions} />
          <DetailViewRoot.Screen
            name="SendDetailsRoot"
            component={SendDetailsStack}
            options={isDesktop ? NavigationDefaultOptionsForDesktop : NavigationDefaultOptions}
          />
          <DetailViewRoot.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewRoot.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewRoot.Screen name="AztecoRedeemRoot" component={AztecoRedeemRoot} options={NavigationDefaultOptions} />
          {/* screens */}
          <DetailViewRoot.Screen
            name="WalletExportRoot"
            component={WalletExportStack}
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

export const NavigationDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
};
export const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};
export const NavigationDefaultOptionsForDesktop: NativeStackNavigationOptions = { headerShown: false, presentation: 'fullScreenModal' };
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const MainRoot = () => {
  return isHandset ? <DetailViewStackScreensStack /> : <DrawerRoot />;
};

export default MainRoot;
