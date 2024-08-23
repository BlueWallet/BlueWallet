import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { isDesktop } from '../blue_modules/environment';
import HeaderRightButton from '../components/HeaderRightButton';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';
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
import WalletAddresses from '../screen/wallets/WalletAddresses';
import WalletDetails from '../screen/wallets/details';
import GenerateWord from '../screen/wallets/generateWord';
import SelectWallet from '../screen/wallets/SelectWallet';
import WalletTransactions from '../screen/wallets/transactions';
import WalletsList from '../screen/wallets/WalletsList';
import { NavigationDefaultOptions, NavigationFormModalOptions, StatusBarLightOptions, DetailViewStack } from './index'; // Importing the navigator
import AddWalletStack from './AddWalletStack';
import AztecoRedeemStackRoot from './AztecoRedeemStack';
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
import PaymentCodesListComponent from './LazyLoadPaymentCodeStack';
import LNDCreateInvoiceRoot from './LNDCreateInvoiceStack';
import ReceiveDetailsStackRoot from './ReceiveDetailsStack';
import ScanLndInvoiceRoot from './ScanLndInvoiceStack';
import ScanQRCodeStackRoot from './ScanQRCodeStack';
import SendDetailsStack from './SendDetailsStack';
import SignVerifyStackRoot from './SignVerifyStack';
import ViewEditMultisigCosignersStackRoot from './ViewEditMultisigCosignersStack';
import WalletExportStack from './WalletExportStack';
import WalletXpubStackRoot from './WalletXpubStack';
import PlusIcon from '../components/icons/PlusIcon';
import SettingsButton from '../components/icons/SettingsButton';
import ExportMultisigCoordinationSetupStack from './ExportMultisigCoordinationSetupStack';
import ManageWallets from '../screen/wallets/ManageWallets';
import getWalletTransactionsOptions from './helpers/getWalletTransactionsOptions';
import { RouteProp } from '@react-navigation/native';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';

type walletTransactionsRouteProp = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

const walletTransactionsOptions = ({ route }: { route: walletTransactionsRouteProp }) => getWalletTransactionsOptions({ route });

const DetailViewStackScreensStack = () => {
  const theme = useTheme();
  const navigation = useExtendedNavigation();
  const { wallets } = useStorage();
  const { isTotalBalanceEnabled } = useSettings();

  const SaveButton = useMemo(() => <HeaderRightButton testID="SaveButton" disabled={true} title={loc.wallets.details_save} />, []);
  const DetailButton = useMemo(() => <HeaderRightButton testID="DetailButton" disabled={true} title={loc.send.create_details} />, []);

  const navigateToAddWallet = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

  const RightBarButtons = useMemo(
    () => (
      <>
        <PlusIcon accessibilityRole="button" accessibilityLabel={loc.wallets.add_title} onPress={navigateToAddWallet} />
        <View style={styles.width24} />
        <SettingsButton />
      </>
    ),
    [navigateToAddWallet],
  );

  const useWalletListScreenOptions = useMemo<NativeStackNavigationOptions>(() => {
    const displayTitle = !isTotalBalanceEnabled || wallets.length <= 1;
    return {
      title: displayTitle ? loc.wallets.wallets : '',
      navigationBarColor: theme.colors.navigationBarColor,
      headerShown: !isDesktop,
      headerLargeTitle: displayTitle,
      headerShadowVisible: false,
      headerLargeTitleShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.customHeader,
      },
      headerRight: () => RightBarButtons,
    };
  }, [RightBarButtons, isTotalBalanceEnabled, theme.colors.customHeader, theme.colors.navigationBarColor, wallets.length]);

  const walletListScreenOptions = useWalletListScreenOptions;

  return (
    <DetailViewStack.Navigator
      initialRouteName="WalletsList"
      screenOptions={{ headerShadowVisible: false, animationTypeForReplace: 'push' }}
    >
      <DetailViewStack.Screen name="WalletsList" component={WalletsList} options={navigationStyle(walletListScreenOptions)(theme)} />
      <DetailViewStack.Screen name="WalletTransactions" component={WalletTransactions} options={walletTransactionsOptions} />
      <DetailViewStack.Screen
        name="WalletDetails"
        component={WalletDetails}
        options={navigationStyle({
          headerTitle: loc.wallets.details_title,
          statusBarStyle: 'auto',
          headerRight: () => SaveButton,
        })(theme)}
      />
      <DetailViewStack.Screen
        name="TransactionDetails"
        component={TransactionDetails}
        options={navigationStyle({
          statusBarStyle: 'auto',
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
          headerTitle: loc.transactions.details_title,
          headerRight: () => DetailButton,
        })(theme)}
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
          headerRight: () => DetailButton,
          headerBackTitleStyle: { fontSize: 0 },
          headerBackTitleVisible: true,
        })(theme)}
      />
      <DetailViewStack.Screen name="CPFP" component={CPFP} options={navigationStyle({ title: loc.transactions.cpfp_title })(theme)} />
      <DetailViewStack.Screen
        name="RBFBumpFee"
        component={RBFBumpFee}
        options={navigationStyle({ title: loc.transactions.rbf_title })(theme)}
      />
      <DetailViewStack.Screen
        name="RBFCancel"
        component={RBFCancel}
        options={navigationStyle({ title: loc.transactions.cancel_title })(theme)}
      />
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
      <DetailViewStack.Screen
        name="IsItMyAddress"
        component={IsItMyAddress}
        options={navigationStyle({ title: loc.is_it_my_address.title })(theme)}
      />
      <DetailViewStack.Screen
        name="GenerateWord"
        component={GenerateWord}
        options={navigationStyle({ title: loc.autofill_word.title })(theme)}
      />
      <DetailViewStack.Screen
        name="LnurlPay"
        component={LnurlPay}
        options={navigationStyle({
          title: '',
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
      <DetailViewStack.Screen
        name="PaymentCodeList"
        component={PaymentCodesListComponent}
        options={navigationStyle({ title: loc.bip47.contacts })(theme)}
      />

      <DetailViewStack.Screen
        name="LnurlPaySuccess"
        component={LnurlPaySuccess}
        options={navigationStyle({
          title: '',
          closeButtonPosition: CloseButtonPosition.Right,
          headerBackVisible: false,
          gestureEnabled: false,
        })(theme)}
      />
      <DetailViewStack.Screen name="LnurlAuth" component={LnurlAuth} options={navigationStyle({ title: '' })(theme)} />
      <DetailViewStack.Screen
        name="Success"
        component={Success}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <DetailViewStack.Screen
        name="WalletAddresses"
        component={WalletAddresses}
        options={navigationStyle({ title: loc.addresses.addresses_title, statusBarStyle: 'auto' })(theme)}
      />

      <DetailViewStack.Screen name="AddWalletRoot" component={AddWalletStack} options={NavigationFormModalOptions} />
      <DetailViewStack.Screen name="SendDetailsRoot" component={SendDetailsStack} options={NavigationDefaultOptions} />
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
        component={ExportMultisigCoordinationSetupStack}
        options={NavigationDefaultOptions}
      />
      <DetailViewStack.Screen
        name="Settings"
        component={SettingsComponent}
        options={navigationStyle({
          headerTransparent: true,
          title: loc.settings.header,
          // workaround to deal with the flicker when headerBackTitleVisible is false
          headerBackTitleStyle: { fontSize: 0 },
          headerBackTitleVisible: true,
          headerShadowVisible: false,
          headerLargeTitle: true,
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
        options={navigationStyle({ title: loc.settings.privacy })(theme)}
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
      <DetailViewStack.Screen
        name="ManageWallets"
        component={ManageWallets}
        options={navigationStyle({
          headerBackVisible: false,
          headerLargeTitle: true,
          gestureEnabled: false,
          presentation: 'modal',
          title: loc.wallets.manage_title,
        })(theme)}
      />
    </DetailViewStack.Navigator>
  );
};

export default DetailViewStackScreensStack;

const styles = {
  width24: {
    width: 24,
  },
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
};
