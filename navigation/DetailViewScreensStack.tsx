import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { I18nManager, Platform, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';

import { isDesktop } from '../blue_modules/environment';
import HeaderRightButton from '../components/HeaderRightButton';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';
import LdkInfo from '../screen/lnd/ldkInfo';
import LNDViewAdditionalInvoiceInformation from '../screen/lnd/lndViewAdditionalInvoiceInformation';
import LNDViewAdditionalInvoicePreImage from '../screen/lnd/lndViewAdditionalInvoicePreImage';
import LNDViewInvoice from '../screen/lnd/lndViewInvoice';
import LnurlAuth from '../screen/lnd/lnurlAuth';
import LnurlPay from '../screen/lnd/lnurlPay';
import LnurlPaySuccess from '../screen/lnd/lnurlPaySuccess';
import Broadcast from '../screen/send/Broadcast';
import IsItMyAddress from '../screen/send/isItMyAddress';
import Success from '../screen/send/success';
import CPFP from '../screen/transactions/CPFP';
import TransactionDetails from '../screen/transactions/TransactionDetails';
import RBFBumpFee from '../screen/transactions/RBFBumpFee';
import RBFCancel from '../screen/transactions/RBFCancel';
import TransactionStatus from '../screen/transactions/TransactionStatus';
import WalletAddresses from '../screen/wallets/addresses';
import WalletDetails from '../screen/wallets/details';
import GenerateWord from '../screen/wallets/generateWord';
import LdkViewLogs from '../screen/wallets/ldkViewLogs';
import SelectWallet from '../screen/wallets/selectWallet';
import WalletTransactions from '../screen/wallets/transactions';
import WalletsList from '../screen/wallets/WalletsList';
import {
  NavigationDefaultOptions,
  NavigationDefaultOptionsForDesktop,
  NavigationFormModalOptions,
  StatusBarLightOptions,
  DetailViewStack,
} from './index'; // Importing the navigator
import AddWalletStack from './AddWalletStack';
import AztecoRedeemStackRoot from './AztecoRedeemStack';
import ExportMultisigCoordinationSetupStackRoot from './ExportMultisigCoordinationSetupStack';
import {
  AboutComponent,
  CurrencyComponent,
  DefaultViewComponent,
  ElectrumSettingsComponent,
  EncryptStorageComponent,
  GeneralSettingsComponent,
  LanguageComponent,
  LicensingComponent,
  LightningSettingsComponent,
  NetworkSettingsComponent,
  NotificationSettingsComponent,
  PlausibleDeniabilityComponent,
  ReleaseNotesComponent,
  SelfTestComponent,
  SettingsComponent,
  SettingsPrivacyComponent,
  ToolsComponent,
} from './LazyLoadSettingsStack';
import LDKOpenChannelRoot from './LDKOpenChannelStack';
import LNDCreateInvoiceRoot from './LNDCreateInvoiceStack';
import PaymentCodeStackRoot from './PaymentCodeStack';
import ReceiveDetailsStackRoot from './ReceiveDetailsStack';
import ReorderWalletsStackRoot from './ReorderWalletsStack';
import ScanLndInvoiceRoot from './ScanLndInvoiceStack';
import ScanQRCodeStackRoot from './ScanQRCodeStack';
import SendDetailsStack from './SendDetailsStack';
import SignVerifyStackRoot from './SignVerifyStack';
import ViewEditMultisigCosignersStackRoot from './ViewEditMultisigCosignersStack';
import WalletExportStack from './WalletExportStack';
import WalletXpubStackRoot from './WalletXpubStack';
import { StackActions } from '@react-navigation/native';

const DetailViewStackScreensStack = () => {
  const theme = useTheme();
  const navigation = useExtendedNavigation();

  const popToTop = () => {
    navigation.dispatch(StackActions.popToTop());
  };

  const SaveButton = useMemo(() => <HeaderRightButton testID="Save" disabled={true} title={loc.wallets.details_save} />, []);

  const useWalletListScreenOptions = useMemo<NativeStackNavigationOptions>(() => {
    const SettingsButton = (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.more}
        testID="SettingsButton"
        onPress={() => navigation.navigate('Settings')}
      >
        <Icon size={22} name="more-horiz" type="material" color={theme.colors.foregroundColor} />
      </TouchableOpacity>
    );

    return {
      title: '',
      headerBackTitle: loc.wallets.list_title,
      navigationBarColor: theme.colors.navigationBarColor,
      headerShown: !isDesktop,
      headerStyle: {
        backgroundColor: theme.colors.customHeader,
      },
      headerRight: I18nManager.isRTL ? undefined : () => SettingsButton,
      headerLeft: I18nManager.isRTL ? () => SettingsButton : undefined,
    };
  }, [navigation, theme.colors.customHeader, theme.colors.foregroundColor, theme.colors.navigationBarColor]);

  const walletListScreenOptions = useWalletListScreenOptions;
  return (
    <DetailViewStack.Navigator
      initialRouteName="WalletsList"
      screenOptions={{ headerShadowVisible: false, animationTypeForReplace: 'push' }}
    >
      <DetailViewStack.Screen name="WalletsList" component={WalletsList} options={navigationStyle(walletListScreenOptions)(theme)} />
      <DetailViewStack.Screen
        name="WalletTransactions"
        component={WalletTransactions}
        options={WalletTransactions.navigationOptions(theme)}
      />
      <DetailViewStack.Screen
        name="LDKOpenChannelRoot"
        component={LDKOpenChannelRoot}
        options={navigationStyle({
          title: loc.lnd.new_channel,
          headerLargeTitle: true,
          statusBarStyle: 'auto',
          closeButton: true,
          headerBackVisible: false,
          gestureEnabled: false,
          closeButtonFunc: popToTop,
        })(theme)}
      />
      <DetailViewStack.Screen name="LdkInfo" component={LdkInfo} options={LdkInfo.navigationOptions(theme)} />
      <DetailViewStack.Screen
        name="WalletDetails"
        component={WalletDetails}
        options={navigationStyle({
          headerTitle: loc.wallets.details_title,
          statusBarStyle: 'auto',
          headerRight: () => SaveButton,
        })(theme)}
      />
      <DetailViewStack.Screen name="LdkViewLogs" component={LdkViewLogs} options={LdkViewLogs.navigationOptions(theme)} />
      <DetailViewStack.Screen
        name="TransactionDetails"
        component={TransactionDetails}
        options={TransactionDetails.navigationOptions(theme)}
      />
      <DetailViewStack.Screen
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
      <DetailViewStack.Screen name="CPFP" component={CPFP} options={CPFP.navigationOptions(theme)} />
      <DetailViewStack.Screen name="RBFBumpFee" component={RBFBumpFee} options={RBFBumpFee.navigationOptions(theme)} />
      <DetailViewStack.Screen name="RBFCancel" component={RBFCancel} options={RBFCancel.navigationOptions(theme)} />

      <DetailViewStack.Screen
        name="SelectWallet"
        component={SelectWallet}
        options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
      />
      <DetailViewStack.Screen
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
      <DetailViewStack.Screen
        name="LNDViewAdditionalInvoiceInformation"
        component={LNDViewAdditionalInvoiceInformation}
        options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
      />
      <DetailViewStack.Screen
        name="LNDViewAdditionalInvoicePreImage"
        component={LNDViewAdditionalInvoicePreImage}
        options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
      />

      <DetailViewStack.Screen
        name="Broadcast"
        component={Broadcast}
        options={navigationStyle({ title: loc.send.create_broadcast })(theme)}
      />
      <DetailViewStack.Screen name="IsItMyAddress" component={IsItMyAddress} options={IsItMyAddress.navigationOptions(theme)} />
      <DetailViewStack.Screen name="GenerateWord" component={GenerateWord} options={GenerateWord.navigationOptions(theme)} />
      <DetailViewStack.Screen
        name="LnurlPay"
        component={LnurlPay}
        options={navigationStyle({
          title: '',
          closeButton: true,
          closeButtonFunc: popToTop,
        })(theme)}
      />
      <DetailViewStack.Screen
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
      <DetailViewStack.Screen name="LnurlAuth" component={LnurlAuth} options={LnurlAuth.navigationOptions(theme)} />
      <DetailViewStack.Screen
        name="Success"
        component={Success}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <DetailViewStack.Screen name="WalletAddresses" component={WalletAddresses} options={WalletAddresses.navigationOptions(theme)} />

      <DetailViewStack.Screen name="AddWalletRoot" component={AddWalletStack} options={NavigationFormModalOptions} />
      <DetailViewStack.Screen
        name="SendDetailsRoot"
        component={SendDetailsStack}
        options={isDesktop ? NavigationDefaultOptionsForDesktop : NavigationDefaultOptions}
      />
      <DetailViewStack.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
      <DetailViewStack.Screen name="ScanLndInvoiceRoot" component={ScanLndInvoiceRoot} options={NavigationDefaultOptions} />
      <DetailViewStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemStackRoot} options={NavigationDefaultOptions} />
      {/* screens */}
      <DetailViewStack.Screen
        name="WalletExportRoot"
        component={WalletExportStack}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <DetailViewStack.Screen
        name="ExportMultisigCoordinationSetupRoot"
        component={ExportMultisigCoordinationSetupStackRoot}
        options={NavigationDefaultOptions}
      />
      <DetailViewStack.Screen
        name="Settings"
        component={SettingsComponent}
        options={navigationStyle({
          headerTransparent: true,
          title: Platform.select({ ios: loc.settings.header, default: '' }),
          headerLargeTitle: true,
          headerShadowVisible: false,
          animationTypeForReplace: 'push',
        })(theme)}
      />
      <DetailViewStack.Screen
        name="Currency"
        component={CurrencyComponent}
        options={navigationStyle({ title: loc.settings.currency })(theme)}
      />
      <DetailViewStack.Screen
        name="GeneralSettings"
        component={GeneralSettingsComponent}
        options={navigationStyle({ title: loc.settings.general })(theme)}
      />
      <DetailViewStack.Screen
        name="PlausibleDeniability"
        component={PlausibleDeniabilityComponent}
        options={navigationStyle({ title: loc.plausibledeniability.title })(theme)}
      />
      <DetailViewStack.Screen
        name="Licensing"
        component={LicensingComponent}
        options={navigationStyle({ title: loc.settings.license })(theme)}
      />
      <DetailViewStack.Screen
        name="NetworkSettings"
        component={NetworkSettingsComponent}
        options={navigationStyle({ title: loc.settings.network })(theme)}
      />
      <DetailViewStack.Screen name="About" component={AboutComponent} options={navigationStyle({ title: loc.settings.about })(theme)} />
      <DetailViewStack.Screen
        name="DefaultView"
        component={DefaultViewComponent}
        options={navigationStyle({ title: loc.settings.default_title })(theme)}
      />
      <DetailViewStack.Screen
        name="ElectrumSettings"
        component={ElectrumSettingsComponent}
        options={navigationStyle({ title: loc.settings.electrum_settings_server })(theme)}
      />
      <DetailViewStack.Screen
        name="EncryptStorage"
        component={EncryptStorageComponent}
        options={navigationStyle({ title: loc.settings.encrypt_title })(theme)}
      />
      <DetailViewStack.Screen
        name="Language"
        component={LanguageComponent}
        options={navigationStyle({ title: loc.settings.language })(theme)}
      />
      <DetailViewStack.Screen
        name="LightningSettings"
        component={LightningSettingsComponent}
        options={navigationStyle({ title: loc.settings.lightning_settings })(theme)}
      />
      <DetailViewStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsComponent}
        options={navigationStyle({ title: loc.settings.notifications })(theme)}
      />
      <DetailViewStack.Screen
        name="SelfTest"
        component={SelfTestComponent}
        options={navigationStyle({ title: loc.settings.selfTest })(theme)}
      />
      <DetailViewStack.Screen
        name="ReleaseNotes"
        component={ReleaseNotesComponent}
        options={navigationStyle({ title: loc.settings.about_release_notes })(theme)}
      />
      <DetailViewStack.Screen name="Tools" component={ToolsComponent} options={navigationStyle({ title: loc.settings.tools })(theme)} />
      <DetailViewStack.Screen
        name="SettingsPrivacy"
        component={SettingsPrivacyComponent}
        options={navigationStyle({ headerLargeTitle: true, title: loc.settings.privacy })(theme)}
      />
      <DetailViewStack.Screen
        name="ViewEditMultisigCosignersRoot"
        component={ViewEditMultisigCosignersStackRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions, gestureEnabled: false, fullScreenGestureEnabled: false }}
        initialParams={{ walletID: undefined, cosigners: undefined }}
      />
      <DetailViewStack.Screen
        name="WalletXpubRoot"
        component={WalletXpubStackRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <DetailViewStack.Screen
        name="SignVerifyRoot"
        component={SignVerifyStackRoot}
        options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
      />
      <DetailViewStack.Screen name="ReceiveDetailsRoot" component={ReceiveDetailsStackRoot} options={NavigationDefaultOptions} />
      <DetailViewStack.Screen
        name="ScanQRCodeRoot"
        component={ScanQRCodeStackRoot}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          statusBarHidden: true,
        }}
      />

      <DetailViewStack.Screen name="PaymentCodeRoot" component={PaymentCodeStackRoot} options={NavigationDefaultOptions} />
      <DetailViewStack.Screen
        name="ReorderWallets"
        component={ReorderWalletsStackRoot}
        options={{
          headerShown: false,
          gestureEnabled: false,
          presentation: 'modal',
        }}
      />
    </DetailViewStack.Navigator>
  );
};

export default DetailViewStackScreensStack;
