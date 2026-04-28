import React, { lazy, useCallback, useMemo } from 'react';
import { View, Platform, PlatformColor } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import HeaderRightButton from '../components/HeaderRightButton';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';
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
import { withLazySuspense } from './LazyLoadingIndicator';
import SettingsButton from '../components/icons/SettingsButton';
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
// import DefaultView from '../screen/settings/DefaultView'; // Commented out - not accessible from UI
import ElectrumSettings from '../screen/settings/ElectrumSettings';
import EncryptStorage from '../screen/settings/EncryptStorage';
import Language from '../screen/settings/Language';
import LightningSettings from '../screen/settings/LightningSettings';
import NotificationSettings from '../screen/settings/NotificationSettings';
import SelfTest from '../screen/settings/SelfTest';
import ReleaseNotes from '../screen/settings/ReleaseNotes';
import SettingsTools from '../screen/settings/SettingsTools';
import PromptPasswordConfirmationSheet from '../screen/PromptPasswordConfirmationSheet';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import getWalletTransactionsOptions from './helpers/getWalletTransactionsOptions';
import { isDesktop } from '../blue_modules/environment';
import ManageWallets from '../screen/wallets/ManageWallets';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import ReceiveCustomAmountSheet from '../screen/receive/ReceiveCustomAmountSheet';
import { isIOS26OrHigher } from '../components/platform';

// Derive the header item type from the options interface so we don't depend on a
// specific named export (`NativeStackHeaderItem`) which could be renamed across
// versions of @react-navigation/native-stack.
type HeaderRightItem = ReturnType<NonNullable<NativeStackNavigationOptions['unstable_headerRightItems']>>[number];

const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));
const PaymentCodesListComponent = withLazySuspense(PaymentCodesList);

const DetailViewStackScreensStack = () => {
  const theme = useTheme();
  const navigation = useExtendedNavigation();
  const { sizeClass } = useSizeClass();

  const DetailButton = useMemo(() => <HeaderRightButton testID="DetailButton" disabled={true} title={loc.send.create_details} />, []);

  const navigateToAddWallet = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

  const navigateToSettings = useCallback(() => {
    // From this component, `useNavigation()` returns the Drawer's navigation, not the
    // inner DetailViewStack's. `Settings` lives inside DrawerRoot -> DetailViewStackScreensStack
    // -> (inner) DetailViewStack, so we need the explicit nested form to reach it.
    navigation.navigate('DrawerRoot', {
      screen: 'DetailViewStackScreensStack',
      params: {
        screen: 'Settings',
      },
    });
  }, [navigation]);

  const RightBarButtons = useMemo(
    () =>
      sizeClass === SizeClass.Large ? (
        <AddWalletButton onPress={navigateToAddWallet} />
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
    if (isIOS26OrHigher) {
      // On iOS 26, render each header button as a native UIBarButtonItem via
      // `unstable_headerRightItems` with `type: 'button'` (default plain variant).
      // `sharesBackground: false` opts each item out of the shared capsule so we get
      // one circular glass button per icon at the system default size. We avoid
      // `variant: 'prominent'`, which fills the button with the system tint color
      // (solid blue) instead of the glass material we want. The legacy long-press
      // secondary menus (Import Wallet / Manage Wallets) are intentionally not
      // exposed on iOS 26 since native bar buttons can't combine a primary tap
      // action with a long-press menu.
      return {
        title: sizeClass === SizeClass.Large ? loc.wallets.list_title : '',
        headerLargeTitle: false,
        headerTransparent: true,
        unstable_headerRightItems: () => {
          if (isDesktop) {
            return [];
          }
          const items: HeaderRightItem[] = [
            {
              type: 'button',
              label: loc.wallets.add_title,
              icon: { type: 'sfSymbol', name: 'plus' },
              identifier: 'AddWalletButton',
              sharesBackground: false,
              onPress: navigateToAddWallet,
            },
          ];
          if (sizeClass !== SizeClass.Large) {
            items.push({
              type: 'button',
              label: loc.settings.default_title,
              icon: { type: 'sfSymbol', name: 'ellipsis' },
              identifier: 'SettingsButton',
              sharesBackground: false,
              onPress: navigateToSettings,
            });
          }
          return items;
        },
      };
    }
    return {
      title: sizeClass === SizeClass.Large ? loc.wallets.list_title : '',
      headerLargeTitle: false,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.customHeader,
      },
      headerRight: () => (isDesktop ? undefined : RightBarButtons),
    };
  }, [RightBarButtons, sizeClass, theme.colors.customHeader, navigateToAddWallet, navigateToSettings]);

  const walletListScreenOptions = useWalletListScreenOptions;
  const isIOSLightMode = Platform.OS === 'ios' && !theme.dark;
  const settingsCardColor = theme.colors.lightButton ?? theme.colors.modal ?? theme.colors.elevated ?? theme.colors.background;
  const settingsHeaderBackgroundColor = isIOSLightMode ? settingsCardColor : theme.colors.customHeader;

  // Consistent header configuration for all settings screens
  const getSettingsHeaderOptions = (title: string) => {
    if (isIOS26OrHigher) {
      return {
        title,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: true,
        headerBackButtonDisplayMode: 'minimal' as const,
      };
    }
    // Use PlatformColor for iOS to match the Settings component, fallback to theme color
    const titleColor = Platform.OS === 'ios' ? PlatformColor('label') : theme.colors.foregroundColor;
    // Convert PlatformColor to string for TypeScript compatibility
    const titleColorString = typeof titleColor === 'string' ? titleColor : String(titleColor);
    return {
      title,
      headerBackButtonDisplayMode: 'default' as const,
      headerBackVisible: true, // Show back button on Android
      headerShadowVisible: false,
      headerLargeTitle: false,
      headerLargeTitleStyle: undefined,
      headerTitleStyle: {
        color: titleColorString,
      },
      headerTransparent: false,
      headerBlurEffect: undefined,
      headerStyle: {
        backgroundColor: settingsHeaderBackgroundColor,
      },
    };
  };

  // On iOS 26+, bypass navigationStyle so its `headerShadowVisible: false` default
  // doesn't interfere with the native large-title shadow (`headerLargeTitleShadowVisible`).
  const settingsScreenOptions = (title: string) =>
    isIOS26OrHigher ? getSettingsHeaderOptions(title) : navigationStyle(getSettingsHeaderOptions(title))(theme);

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
        })(theme)}
      />
      <DetailViewStack.Screen
        name="TransactionDetails"
        component={TransactionDetails}
        options={navigationStyle({
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
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
          headerTitle: '',
          headerRight: () => DetailButton,
          headerBackButtonDisplayMode: 'minimal',
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
          headerTitle: loc.lndViewInvoice.lightning_invoice,
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
        })(theme)}
      />
      <DetailViewStack.Screen
        name="LNDViewAdditionalInvoicePreImage"
        component={LNDViewAdditionalInvoicePreImage}
        options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
      />

      <DetailViewStack.Screen name="Broadcast" component={Broadcast} options={settingsScreenOptions(loc.send.create_broadcast)} />
      <DetailViewStack.Screen
        name="IsItMyAddress"
        component={IsItMyAddress}
        initialParams={{ address: undefined }}
        options={settingsScreenOptions(loc.is_it_my_address.title)}
      />
      <DetailViewStack.Screen name="GenerateWord" component={GenerateWord} options={settingsScreenOptions(loc.autofill_word.title)} />
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
        options={navigationStyle({ title: loc.addresses.addresses_title })(theme)}
      />

      <DetailViewStack.Screen
        name="Settings"
        component={Settings}
        options={
          isIOS26OrHigher
            ? getSettingsHeaderOptions(loc.settings.header)
            : navigationStyle({
                title: loc.settings.header,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitle: '',
                headerShadowVisible: false,
                // headerLargeTitle is iOS-only, disable on Android for better compatibility with older versions
                headerLargeTitle: Platform.OS === 'ios',
                headerLargeTitleStyle:
                  Platform.OS === 'ios'
                    ? {
                        color:
                          typeof theme.colors.foregroundColor === 'string'
                            ? theme.colors.foregroundColor
                            : String(theme.colors.foregroundColor),
                      }
                    : undefined,
                headerTitleStyle: {
                  color:
                    typeof theme.colors.foregroundColor === 'string' ? theme.colors.foregroundColor : String(theme.colors.foregroundColor),
                },
                headerTransparent: false,
                headerBlurEffect: undefined,
                headerStyle: {
                  backgroundColor: settingsHeaderBackgroundColor,
                },
                animationTypeForReplace: 'push',
              })(theme)
        }
      />
      <DetailViewStack.Screen name="Currency" component={Currency} options={settingsScreenOptions(loc.settings.currency)} />
      <DetailViewStack.Screen name="GeneralSettings" component={GeneralSettings} options={settingsScreenOptions(loc.settings.general)} />
      <DetailViewStack.Screen
        name="PlausibleDeniability"
        component={PlausibleDeniability}
        options={settingsScreenOptions(loc.plausibledeniability.title)}
      />
      <DetailViewStack.Screen name="Licensing" component={Licensing} options={settingsScreenOptions(loc.settings.license)} />
      <DetailViewStack.Screen name="NetworkSettings" component={NetworkSettings} options={settingsScreenOptions(loc.settings.network)} />
      <DetailViewStack.Screen
        name="SettingsBlockExplorer"
        component={SettingsBlockExplorer}
        options={settingsScreenOptions(loc.settings.block_explorer)}
      />

      <DetailViewStack.Screen name="About" component={About} options={settingsScreenOptions(loc.settings.about)} />
      {/* <DetailViewStack.Screen
        name="DefaultView"
        component={DefaultView}
        options={settingsScreenOptions(loc.settings.default_title)}
      /> */}
      <DetailViewStack.Screen
        name="ElectrumSettings"
        component={ElectrumSettings}
        options={settingsScreenOptions(loc.settings.electrum_settings_server)}
        initialParams={{ server: undefined }}
      />
      <DetailViewStack.Screen
        name="EncryptStorage"
        component={EncryptStorage}
        options={settingsScreenOptions(loc.settings.encrypt_title)}
      />
      <DetailViewStack.Screen name="Language" component={Language} options={settingsScreenOptions(loc.settings.language)} />
      <DetailViewStack.Screen
        name="LightningSettings"
        component={LightningSettings}
        options={settingsScreenOptions(loc.settings.lightning_settings)}
      />
      <DetailViewStack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={settingsScreenOptions(loc.settings.notifications)}
      />
      <DetailViewStack.Screen name="SelfTest" component={SelfTest} options={settingsScreenOptions(loc.settings.selfTest)} />
      <DetailViewStack.Screen
        name="ReleaseNotes"
        component={ReleaseNotes}
        options={settingsScreenOptions(loc.settings.about_release_notes)}
      />
      <DetailViewStack.Screen name="SettingsTools" component={SettingsTools} options={settingsScreenOptions(loc.settings.tools)} />
      <DetailViewStack.Screen
        name="PromptPasswordConfirmationSheet"
        component={PromptPasswordConfirmationSheet}
        options={navigationStyle({
          title: loc.settings.password,
          presentation: 'formSheet',
          sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.9],
          sheetGrabberVisible: true,
          closeButtonPosition: CloseButtonPosition.Right,
          headerBackButtonDisplayMode: 'minimal',
        })(theme)}
      />
      <DetailViewStack.Screen
        name="ManageWallets"
        component={ManageWallets}
        options={{
          presentation: 'fullScreenModal',
          title: loc.wallets.manage_title,
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
      <DetailViewStack.Screen
        name="ReceiveCustomAmount"
        component={ReceiveCustomAmountSheet}
        options={navigationStyle({
          presentation: 'formSheet',
          sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.9],
          headerTitle: loc.receive.details_setAmount,
          sheetGrabberVisible: true,
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
    </DetailViewStack.Navigator>
  );
};

export default DetailViewStackScreensStack;

const styles = {
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  width24: {
    width: 24,
  },
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
};
