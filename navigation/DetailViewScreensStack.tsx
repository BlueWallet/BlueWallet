import React, { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, View, Platform, PlatformColor, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from '@react-navigation/native-stack';
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
import Icon from '../components/Icon';
import SettingsButton from '../components/icons/SettingsButton';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { WalletTransactionsStatus } from '../components/Context/StorageProvider';
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
import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { ConnectionPollContext } from './ConnectionPollContext';
import ManageWallets from '../screen/wallets/ManageWallets';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import ReceiveCustomAmountSheet from '../screen/receive/ReceiveCustomAmountSheet';
import { isIOS26OrHigher } from '../components/platform';

type HeaderRightItem = ReturnType<NonNullable<NativeStackNavigationOptions['unstable_headerRightItems']>>[number];

const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));
const PaymentCodesListComponent = withLazySuspense(PaymentCodesList);

const UpdatingLabel: React.FC<{ containerStyle: object; textStyle: object }> = ({ containerStyle, textStyle }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={containerStyle}>
      <Animated.Text style={[textStyle, { opacity }]}>{loc.transactions.updating}</Animated.Text>
    </View>
  );
};

const DetailViewStackScreensStack = () => {
  const theme = useTheme();
  const navigation = useExtendedNavigation();
  const { walletTransactionUpdateStatus } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { sizeClass } = useSizeClass();
  const [electrumConnected, setElectrumConnected] = useState<boolean | null>(null);

  const pollConnection = useCallback(async () => {
    if (isElectrumDisabled) return;
    const ok = await BlueElectrum.ping();
    setElectrumConnected(ok);
  }, [isElectrumDisabled]);

  useEffect(() => {
    if (isElectrumDisabled) {
      setElectrumConnected(null);
      return;
    }
    pollConnection();
  }, [isElectrumDisabled, pollConnection]);

  useEffect(() => {
    if (isElectrumDisabled) return;
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        pollConnection();
      }
    });
    return () => subscription.remove();
  }, [isElectrumDisabled, pollConnection]);
  // When starting up in an unknown state, we optimistically rely on ping()
  // and the fast retry loop while disconnected. Slow health checks while connected
  // run only from WalletsList when that screen is focused (saves idle battery).

  useEffect(() => {
    if (isElectrumDisabled || electrumConnected !== false) return;
    const interval = setInterval(pollConnection, 3000);
    return () => clearInterval(interval);
  }, [isElectrumDisabled, electrumConnected, pollConnection]);

  const connectionPollContextValue = useMemo(() => ({ pollConnection }), [pollConnection]);

  const navigateToAddWallet = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

  const navigateToSettings = useCallback(() => {
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

  const navigateToElectrumSettings = useCallback(() => {
    const routeNames = navigation.getState()?.routeNames;
    if (routeNames?.includes('ElectrumSettings')) {
      navigation.navigate('ElectrumSettings');
    } else {
      navigation.navigate('DetailViewStackScreensStack', { screen: 'ElectrumSettings' });
    }
  }, [navigation]);

  const walletListScreenOptions = useMemo<NativeStackNavigationOptions>(() => {
    const isUpdating = walletTransactionUpdateStatus !== WalletTransactionsStatus.NONE;
    const showOffline = isElectrumDisabled;
    // When the user explicitly pulls to refresh, we always prefer showing
    // the "Updating..." pill over "Not connected" during that refresh.
    const showNotConnected = !isElectrumDisabled && electrumConnected === false && !isUpdating;
    const showUpdating = !isElectrumDisabled && isUpdating;

    const renderHeaderLeft = () => {
      if (showOffline) {
        const offlineBg = theme.dark ? theme.colors.darkGray : '#000000';
        return (
          <Pressable
            onPress={navigateToElectrumSettings}
            style={[styles.updatingLabelContainer, styles.offlineLabelRow, { backgroundColor: offlineBg }]}
          >
            <Icon name="mask" type="font-awesome-6" size={14} color="#ffffff" style={styles.offlineLabelIcon} />
            <Text style={styles.offlineLabelText}>{loc.settings.electrum_offline_mode}</Text>
          </Pressable>
        );
      }
      if (showNotConnected) {
        return (
          <Pressable
            onPress={() => {
              BlueElectrum.presentElectrumDisconnectedHelpAlert().catch(() => {
                /* alert helper failed; ignore */
              });
            }}
            style={[styles.updatingLabelContainer, { backgroundColor: theme.colors.redBG }]}
          >
            <Text style={[styles.updatingLabelText, { color: theme.colors.redText }]}>{loc.settings.electrum_connected_not}</Text>
          </Pressable>
        );
      }
      if (showUpdating) {
        return (
          <UpdatingLabel
            containerStyle={[styles.updatingLabelContainer, { backgroundColor: theme.colors.lightButton }]}
            textStyle={[styles.updatingLabelText, { color: theme.colors.foregroundColor }]}
          />
        );
      }
      return null;
    };

    if (isIOS26OrHigher) {
      // Status pills: `unstable_headerLeftItems` + `hidesSharedBackground` avoids the
      // navigation bar's shared liquid-glass chrome on the pill (solid colors only).
      return {
        title: sizeClass === SizeClass.Large ? loc.wallets.list_title : '',
        headerLargeTitle: false,
        headerTransparent: true,
        unstable_headerLeftItems: (): NativeStackHeaderItem[] => {
          const element = renderHeaderLeft();
          if (element == null) {
            return [];
          }
          return [{ type: 'custom', element, hidesSharedBackground: true }];
        },
        unstable_headerRightItems: () => {
          if (isDesktop) {
            return [];
          }
          const items: HeaderRightItem[] = [
            {
              type: 'button',
              label: loc.wallets.add_title,
              icon: { type: 'sfSymbol', name: 'plus' },
              variant: 'prominent',
              tintColor: theme.colors.headerProminentButtonBackgroundColor,
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
      headerLeft: renderHeaderLeft,
      headerRight: () => (isDesktop ? undefined : RightBarButtons),
    };
  }, [
    RightBarButtons,
    sizeClass,
    theme.colors.customHeader,
    theme.colors.headerProminentButtonBackgroundColor,
    theme.colors.foregroundColor,
    theme.colors.lightButton,
    theme.colors.redBG,
    theme.colors.redText,
    theme.colors.darkGray,
    theme.dark,
    electrumConnected,
    isElectrumDisabled,
    navigateToElectrumSettings,
    navigateToAddWallet,
    navigateToSettings,
    walletTransactionUpdateStatus,
  ]);

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

  const settingsScreenOptions = (title: string) =>
    isIOS26OrHigher ? getSettingsHeaderOptions(title) : navigationStyle(getSettingsHeaderOptions(title))(theme);

  return (
    <ConnectionPollContext.Provider value={connectionPollContextValue}>
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
                      typeof theme.colors.foregroundColor === 'string'
                        ? theme.colors.foregroundColor
                        : String(theme.colors.foregroundColor),
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
          options={navigationStyle({
            presentation: 'fullScreenModal',
            title: loc.wallets.manage_title,
            headerShown: true,
            headerStyle: {
              backgroundColor: theme.colors.customHeader,
            },
          })(theme)}
        />
        <DetailViewStack.Screen
          name="ReceiveDetails"
          component={ReceiveDetails}
          options={navigationStyle({
            title: loc.receive.header,
            closeButtonPosition: CloseButtonPosition.Left,
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
    </ConnectionPollContext.Provider>
  );
};

export default DetailViewStackScreensStack;

const styles = StyleSheet.create({
  width24: {
    width: 24,
  },
  updatingLabelContainer: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineLabelRow: {
    flexDirection: 'row',
  },
  offlineLabelIcon: {
    marginRight: 6,
  },
  offlineLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  updatingLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
