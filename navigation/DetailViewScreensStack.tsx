import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import HeaderRightButton from '../components/HeaderRightButton';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';
import LNDViewAdditionalInvoiceInformation from '../screen/lnd/LNDViewAdditionalInvoiceInformation';
import LNDViewAdditionalInvoicePreImage from '../screen/lnd/lndViewAdditionalInvoicePreImage';
import LNDViewInvoice from '../screen/lnd/lndViewInvoice';
import LnurlAuth from '../screen/lnd/lnurlAuth';
import LnurlPay from '../screen/lnd/lnurlPay';
import LnurlPaySuccess from '../screen/lnd/lnurlPaySuccess';
import Broadcast from '../screen/send/Broadcast';
import IsItMyAddress from '../screen/settings/IsItMyAddress';
import Success from '../screen/send/success';
import CPFP from '../screen/transactions/CPFP';
import TransactionDetails from '../screen/transactions/TransactionDetails';
import RBFBumpFee from '../screen/transactions/RBFBumpFee';
import RBFCancel from '../screen/transactions/RBFCancel';
import TransactionStatus from '../screen/transactions/TransactionStatus';
import WalletAddresses from '../screen/wallets/WalletAddresses';
import WalletDetails from '../screen/wallets/WalletDetails';
import GenerateWord from '../screen/wallets/generateWord';
import SelectWallet from '../screen/wallets/SelectWallet';
import WalletsList from '../screen/wallets/WalletsList';
import { DetailViewStack } from './index';
import PaymentCodesListComponent from './LazyLoadPaymentCodeStack';
import SettingsButton from '../components/icons/SettingsButton';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import WalletTransactions from '../screen/wallets/WalletTransactions';
import AddWalletButton from '../components/AddWalletButton';
import Settings from '../screen/settings/Settings';
import Currency from '../screen/settings/Currency';
import GeneralSettings from '../screen/settings/GeneralSettings';
import PlausibleDeniability from '../screen/PlausibleDeniability';
import Licensing from '../screen/settings/Licensing';
import NetworkSettings from '../screen/settings/NetworkSettings';
import SettingsBlockExplorer from '../screen/settings/SettingsBlockExplorer';
import About from '../screen/settings/About';
import DefaultView from '../screen/settings/DefaultView';
import ElectrumSettings from '../screen/settings/ElectrumSettings';
import EncryptStorage from '../screen/settings/EncryptStorage';
import Language from '../screen/settings/Language';
import LightningSettings from '../screen/settings/LightningSettings';
import NotificationSettings from '../screen/settings/NotificationSettings';
import SelfTest from '../screen/settings/SelfTest';
import ReleaseNotes from '../screen/settings/ReleaseNotes';
import ToolsScreen from '../screen/settings/tools';
import SettingsPrivacy from '../screen/settings/SettingsPrivacy';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import getWalletTransactionsOptions from './helpers/getWalletTransactionsOptions';
import { isDesktop } from '../blue_modules/environment';
import ManageWallets from '../screen/wallets/ManageWallets';
import ReceiveDetails from '../screen/receive/ReceiveDetails';

const DetailViewStackScreensStack = () => {
  const theme = useTheme();
  const navigation = useExtendedNavigation();
  const { wallets } = useStorage();
  const { isTotalBalanceEnabled } = useSettings();
  const { sizeClass } = useSizeClass();

  const DetailButton = useMemo(() => <HeaderRightButton testID="DetailButton" disabled={true} title={loc.send.create_details} />, []);

  const navigateToAddWallet = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

  const RightBarButtons = useMemo(
    () =>
      sizeClass === SizeClass.Large ? (
        <SettingsButton />
      ) : (
        <>
          <AddWalletButton onPress={navigateToAddWallet} />
          <View style={styles.width24} />
          <SettingsButton />
        </>
      ),
    [sizeClass, navigateToAddWallet],
  );

  const useWalletListScreenOptions = useMemo<NativeStackNavigationOptions>(() => {
    const displayTitle = !isTotalBalanceEnabled || wallets.length <= 1;
    return {
      title: sizeClass === SizeClass.Large ? loc.transactions.list_title : displayTitle ? loc.wallets.wallets : '',
      navigationBarColor: theme.colors.navigationBarColor,
      headerLargeTitle: displayTitle || sizeClass === SizeClass.Compact,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.customHeader,
      },
      headerRight: () => (isDesktop ? undefined : RightBarButtons),
    };
  }, [RightBarButtons, sizeClass, isTotalBalanceEnabled, theme.colors.customHeader, theme.colors.navigationBarColor, wallets]);

  const walletListScreenOptions = useWalletListScreenOptions;

  return (
    <DetailViewStack.Navigator
      initialRouteName="WalletsList"
      screenOptions={{ headerShadowVisible: false, animationTypeForReplace: 'push' }}
    >
      <DetailViewStack.Screen name="WalletsList" component={WalletsList} options={navigationStyle(walletListScreenOptions)(theme)} />
      <DetailViewStack.Screen name="WalletTransactions" component={WalletTransactions} options={getWalletTransactionsOptions} />
      <DetailViewStack.Screen
        name="WalletDetails"
        component={WalletDetails}
        options={navigationStyle({
          headerTitle: loc.wallets.details_title,
          statusBarStyle: 'auto',
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
          statusBarStyle: 'auto',
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
          headerTitle: '',
          headerRight: () => DetailButton,
          headerBackButtonDisplayMode: 'default',
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
        initialParams={{ address: undefined }}
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

      <DetailViewStack.Screen
        name="Settings"
        component={Settings}
        options={navigationStyle({
          title: loc.settings.header,
          headerBackButtonDisplayMode: 'default',
          headerShadowVisible: false,
          headerLargeTitle: true,
          animationTypeForReplace: 'push',
        })(theme)}
      />
      <DetailViewStack.Screen name="Currency" component={Currency} options={navigationStyle({ title: loc.settings.currency })(theme)} />
      <DetailViewStack.Screen
        name="GeneralSettings"
        component={GeneralSettings}
        options={navigationStyle({ title: loc.settings.general })(theme)}
      />
      <DetailViewStack.Screen
        name="PlausibleDeniability"
        component={PlausibleDeniability}
        options={navigationStyle({ title: loc.plausibledeniability.title })(theme)}
      />
      <DetailViewStack.Screen name="Licensing" component={Licensing} options={navigationStyle({ title: loc.settings.license })(theme)} />
      <DetailViewStack.Screen
        name="NetworkSettings"
        component={NetworkSettings}
        options={navigationStyle({ title: loc.settings.network })(theme)}
      />
      <DetailViewStack.Screen
        name="SettingsBlockExplorer"
        component={SettingsBlockExplorer}
        options={navigationStyle({ title: loc.settings.block_explorer })(theme)}
      />

      <DetailViewStack.Screen name="About" component={About} options={navigationStyle({ title: loc.settings.about })(theme)} />
      <DetailViewStack.Screen
        name="DefaultView"
        component={DefaultView}
        options={navigationStyle({ title: loc.settings.default_title })(theme)}
      />
      <DetailViewStack.Screen
        name="ElectrumSettings"
        component={ElectrumSettings}
        options={navigationStyle({ title: loc.settings.electrum_settings_server })(theme)}
        initialParams={{ server: undefined }}
      />
      <DetailViewStack.Screen
        name="EncryptStorage"
        component={EncryptStorage}
        options={navigationStyle({ title: loc.settings.encrypt_title })(theme)}
      />
      <DetailViewStack.Screen name="Language" component={Language} options={navigationStyle({ title: loc.settings.language })(theme)} />
      <DetailViewStack.Screen
        name="LightningSettings"
        component={LightningSettings}
        options={navigationStyle({ title: loc.settings.lightning_settings })(theme)}
      />
      <DetailViewStack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={navigationStyle({ title: loc.settings.notifications })(theme)}
      />
      <DetailViewStack.Screen name="SelfTest" component={SelfTest} options={navigationStyle({ title: loc.settings.selfTest })(theme)} />
      <DetailViewStack.Screen
        name="ReleaseNotes"
        component={ReleaseNotes}
        options={navigationStyle({ title: loc.settings.about_release_notes })(theme)}
      />
      <DetailViewStack.Screen name="ToolsScreen" component={ToolsScreen} options={navigationStyle({ title: loc.settings.tools })(theme)} />
      <DetailViewStack.Screen
        name="SettingsPrivacy"
        component={SettingsPrivacy}
        options={navigationStyle({ title: loc.settings.privacy })(theme)}
      />
      <DetailViewStack.Screen
        name="ManageWallets"
        component={ManageWallets}
        options={{
          presentation: 'fullScreenModal',
          title: loc.wallets.manage_title,
          statusBarStyle: 'auto',
          headerShown: true,
        }}
      />
      <DetailViewStack.Screen
        name="ReceiveDetails"
        component={ReceiveDetails}
        options={navigationStyle({
          title: loc.receive.header,
          closeButtonPosition: CloseButtonPosition.Left,
          statusBarStyle: 'light',
          headerShown: true,
          presentation: 'modal',
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
