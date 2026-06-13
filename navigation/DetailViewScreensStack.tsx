import React, { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommonActions, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNotificationsEnabled } from '../blue_modules/notifications';
import { Animated, AppState, View, Platform, PlatformColor, Text, StyleSheet, Pressable } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';
import WalletsList from '../screen/wallets/WalletsList';
import WalletDetails from '../screen/wallets/WalletDetails';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import { DetailViewStack } from './index';
import { withLazySuspense } from './LazyLoadingIndicator';
import Icon from '../components/Icon';
import SettingsButton from '../components/icons/SettingsButton';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { WalletTransactionsStatus } from '../components/Context/StorageProvider';
import WalletTransactions from '../screen/wallets/WalletTransactions';
import AddWalletButton from '../components/AddWalletButton';
// import DefaultView from '../screen/settings/DefaultView'; // Commented out - not accessible from UI
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import getWalletTransactionsOptions from './helpers/getWalletTransactionsOptions';
import { isDesktop } from '../blue_modules/environment';
import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { ConnectionPollContext } from './ConnectionPollContext';

const LNDViewAdditionalInvoicePreImage = lazy(() => import('../screen/lnd/lndViewAdditionalInvoicePreImage'));
const LNDViewInvoice = lazy(() => import('../screen/lnd/lndViewInvoice'));
const LnurlAuth = lazy(() => import('../screen/lnd/lnurlAuth'));
const LnurlPay = lazy(() => import('../screen/lnd/lnurlPay'));
const LnurlPaySuccess = lazy(() => import('../screen/lnd/lnurlPaySuccess'));
const Broadcast = lazy(() => import('../screen/send/Broadcast'));
const IsItMyAddress = lazy(() => import('../screen/settings/IsItMyAddress'));
const Success = lazy(() => import('../screen/send/success'));
const CPFP = lazy(() => import('../screen/transactions/CPFP'));
const RBFBumpFee = lazy(() => import('../screen/transactions/RBFBumpFee'));
const RBFCancel = lazy(() => import('../screen/transactions/RBFCancel'));
const TransactionStatus = lazy(() => import('../screen/transactions/TransactionStatus'));
const WalletAddresses = lazy(() => import('../screen/wallets/WalletAddresses'));
const GenerateWord = lazy(() => import('../screen/wallets/generateWord'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const Settings = lazy(() => import('../screen/settings/Settings'));
const Currency = lazy(() => import('../screen/settings/Currency'));
const GeneralSettings = lazy(() => import('../screen/settings/GeneralSettings'));
const PlausibleDeniability = lazy(() => import('../screen/PlausibleDeniability'));
const Licensing = lazy(() => import('../screen/settings/Licensing'));
const NetworkSettings = lazy(() => import('../screen/settings/NetworkSettings'));
const SettingsBlockExplorer = lazy(() => import('../screen/settings/SettingsBlockExplorer'));
const About = lazy(() => import('../screen/settings/About'));
const ElectrumSettings = lazy(() => import('../screen/settings/ElectrumSettings'));
const EncryptStorage = lazy(() => import('../screen/settings/EncryptStorage'));
const Language = lazy(() => import('../screen/settings/Language'));
const NotificationSettings = lazy(() => import('../screen/settings/NotificationSettings'));
const SelfTest = lazy(() => import('../screen/settings/SelfTest'));
const ReleaseNotes = lazy(() => import('../screen/settings/ReleaseNotes'));
const SettingsTools = lazy(() => import('../screen/settings/SettingsTools'));
const PromptPasswordConfirmationSheet = lazy(() => import('../screen/PromptPasswordConfirmationSheet'));
const ManageWallets = lazy(() => import('../screen/wallets/ManageWallets'));
const ReceiveCustomAmountSheet = lazy(() => import('../screen/receive/ReceiveCustomAmountSheet'));
const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));
const LightningSettings = lazy(() => import('../screen/settings/LightningSettings'));

const LNDViewAdditionalInvoicePreImageComponent = withLazySuspense(LNDViewAdditionalInvoicePreImage);
const LNDViewInvoiceComponent = withLazySuspense(LNDViewInvoice);
const LnurlAuthComponent = withLazySuspense(LnurlAuth);
const LnurlPayComponent = withLazySuspense(LnurlPay);
const LnurlPaySuccessComponent = withLazySuspense(LnurlPaySuccess);
const BroadcastComponent = withLazySuspense(Broadcast);
const IsItMyAddressComponent = withLazySuspense(IsItMyAddress);
const SuccessComponent = withLazySuspense(Success);
const CPFPComponent = withLazySuspense(CPFP);
const RBFBumpFeeComponent = withLazySuspense(RBFBumpFee);
const RBFCancelComponent = withLazySuspense(RBFCancel);
const TransactionStatusComponent = withLazySuspense(TransactionStatus);
const WalletAddressesComponent = withLazySuspense(WalletAddresses);
const GenerateWordComponent = withLazySuspense(GenerateWord);
const SelectWalletComponent = withLazySuspense(SelectWallet);
const SettingsComponent = withLazySuspense(Settings);
const CurrencyComponent = withLazySuspense(Currency);
const GeneralSettingsComponent = withLazySuspense(GeneralSettings);
const PlausibleDeniabilityComponent = withLazySuspense(PlausibleDeniability);
const LicensingComponent = withLazySuspense(Licensing);
const NetworkSettingsComponent = withLazySuspense(NetworkSettings);
const SettingsBlockExplorerComponent = withLazySuspense(SettingsBlockExplorer);
const AboutComponent = withLazySuspense(About);
const ElectrumSettingsComponent = withLazySuspense(ElectrumSettings);
const EncryptStorageComponent = withLazySuspense(EncryptStorage);
const LanguageComponent = withLazySuspense(Language);
const NotificationSettingsComponent = withLazySuspense(NotificationSettings);
const SelfTestComponent = withLazySuspense(SelfTest);
const ReleaseNotesComponent = withLazySuspense(ReleaseNotes);
const SettingsToolsComponent = withLazySuspense(SettingsTools);
const PromptPasswordConfirmationSheetComponent = withLazySuspense(PromptPasswordConfirmationSheet);
const ManageWalletsComponent = withLazySuspense(ManageWallets);
const ReceiveCustomAmountSheetComponent = withLazySuspense(ReceiveCustomAmountSheet);
const PaymentCodesListComponent = withLazySuspense(PaymentCodesList);
const LightningSettingsComponent = withLazySuspense(LightningSettings);

const WalletsListWithPreloader = ({ hasWallets }: { hasWallets: boolean }) => {
  const navigation = useExtendedNavigation();
  const isFocused = useIsFocused();
  const hasPreloadedSettingsRef = useRef(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasCustomElectrumServers, setHasCustomElectrumServers] = useState(false);

  // Check notification status on mount
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const enabled = await isNotificationsEnabled();
        setNotificationsEnabled(enabled);
      } catch (e) {
        setNotificationsEnabled(false);
      }
    };
    checkNotifications();
  }, []);

  // Check for custom Electrum servers on mount
  useEffect(() => {
    const checkCustomServers = async () => {
      try {
        const storedPeers = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_SERVER_HISTORY);
        setHasCustomElectrumServers(storedPeers ? JSON.parse(storedPeers).length > 0 : false);
      } catch (e) {
        setHasCustomElectrumServers(false);
      }
    };
    checkCustomServers();
  }, []);

  useEffect(() => {
    if (!isFocused || !hasWallets || hasPreloadedSettingsRef.current) {
      return;
    }

    if (__DEV__) {
      console.debug('[WalletsListWithPreloader] Dispatching Settings preload', {
        notificationsEnabled,
        hasCustomElectrumServers,
      });
    }

    navigation.dispatch(CommonActions.preload('Settings'));

    if (notificationsEnabled) {
      navigation.dispatch(CommonActions.preload('NotificationSettings'));
    }

    if (hasCustomElectrumServers) {
      navigation.dispatch(CommonActions.preload('ElectrumSettings'));
    }

    hasPreloadedSettingsRef.current = true;
  }, [isFocused, hasWallets, navigation, notificationsEnabled, hasCustomElectrumServers]);

  return <WalletsList />;
};

const FocusedSettingsScreen = () => {
  const isFocused = useIsFocused();
  return isFocused ? <SettingsComponent /> : null;
};

const FocusedNotificationSettingsScreen = () => {
  const isFocused = useIsFocused();
  return isFocused ? <NotificationSettingsComponent /> : null;
};

const FocusedElectrumSettingsScreen = () => {
  const isFocused = useIsFocused();
  return isFocused ? <ElectrumSettingsComponent /> : null;
};

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
  const { walletTransactionUpdateStatus, wallets } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { sizeClass } = useSizeClass();
  const [electrumConnected, setElectrumConnected] = useState<boolean | null>(null);

  // Probe connection health from the UI (e.g. WalletsList focus / 30s timer).
  // BlueElectrum.ping() reflects the result into the shared connection state, which
  // we observe via the subscription below — no need to set local state here.
  const pollConnection = useCallback(async () => {
    if (isElectrumDisabled) return;
    await BlueElectrum.ping();
  }, [isElectrumDisabled]);

  // Mirror BlueElectrum's connection state into local UI state.
  useEffect(() => {
    if (isElectrumDisabled) {
      setElectrumConnected(null);
      return;
    }
    const sync = () => setElectrumConnected(BlueElectrum.isConnected());
    sync();
    const unsubscribe = BlueElectrum.subscribeConnectionState(sync);
    // Kick off an initial probe so the header pill reflects reality after mount.
    BlueElectrum.ping().catch(() => {});
    return unsubscribe;
  }, [isElectrumDisabled]);

  // On foreground transition, proactively heal: ensureConnected() takes the fast
  // ping path when the socket is alive (no-op) and rebuilds the connection only
  // when needed. This replaces the old "ping → maybe show network alert" path that
  // could surface a false alert after iOS suspend/resume.
  useEffect(() => {
    if (isElectrumDisabled) return;
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        BlueElectrum.ensureConnected().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [isElectrumDisabled]);

  // While we believe we're disconnected, ask BlueElectrum to keep trying to
  // reconnect (silently — the red "Not connected" pill is the only UI signal).
  useEffect(() => {
    if (isElectrumDisabled || electrumConnected !== false) return;
    const interval = setInterval(() => {
      BlueElectrum.ensureConnected().catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [isElectrumDisabled, electrumConnected]);

  const connectionPollContextValue = useMemo(() => ({ pollConnection }), [pollConnection]);

  const navigateToAddWallet = useCallback(() => {
    navigation.navigate('AddWalletRoot');
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
    theme.colors.foregroundColor,
    theme.colors.lightButton,
    theme.colors.redBG,
    theme.colors.redText,
    theme.colors.darkGray,
    theme.dark,
    electrumConnected,
    isElectrumDisabled,
    navigateToElectrumSettings,
    walletTransactionUpdateStatus,
  ]);

  const isIOSLightMode = Platform.OS === 'ios' && !theme.dark;
  const settingsCardColor = theme.colors.lightButton ?? theme.colors.modal ?? theme.colors.elevated ?? theme.colors.background;
  const settingsHeaderBackgroundColor = isIOSLightMode ? settingsCardColor : theme.colors.customHeader;

  // Consistent header configuration for all settings screens
  const getSettingsHeaderOptions = (title: string) => {
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

  return (
    <ConnectionPollContext.Provider value={connectionPollContextValue}>
      <DetailViewStack.Navigator
        initialRouteName="WalletsList"
        screenOptions={{ headerShadowVisible: false, animationTypeForReplace: 'push' }}
      >
        <DetailViewStack.Screen name="WalletsList" options={navigationStyle(walletListScreenOptions)(theme)}>
          {() => <WalletsListWithPreloader hasWallets={wallets.length > 0} />}
        </DetailViewStack.Screen>
        <DetailViewStack.Screen name="WalletTransactions" component={WalletTransactions} options={getWalletTransactionsOptions} />
        <DetailViewStack.Screen
          name="WalletDetails"
          component={WalletDetails}
          options={navigationStyle({
            headerTitle: '',
            statusBarStyle: 'auto',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          })(theme)}
        />
        <DetailViewStack.Screen
          name="TransactionStatus"
          component={TransactionStatusComponent}
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
        <DetailViewStack.Screen
          name="CPFP"
          component={CPFPComponent}
          options={navigationStyle({ title: loc.transactions.cpfp_title })(theme)}
        />
        <DetailViewStack.Screen
          name="RBFBumpFee"
          component={RBFBumpFeeComponent}
          options={navigationStyle({ title: loc.transactions.rbf_title })(theme)}
        />
        <DetailViewStack.Screen
          name="RBFCancel"
          component={RBFCancelComponent}
          options={navigationStyle({ title: loc.transactions.cancel_title })(theme)}
        />
        <DetailViewStack.Screen
          name="SelectWallet"
          component={SelectWalletComponent}
          options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
        />
        <DetailViewStack.Screen
          name="LNDViewInvoice"
          component={LNDViewInvoiceComponent}
          options={navigationStyle({
            headerTitle: loc.lndViewInvoice.lightning_invoice,
            headerStyle: {
              backgroundColor: theme.colors.customHeader,
            },
          })(theme)}
        />
        <DetailViewStack.Screen
          name="LNDViewAdditionalInvoicePreImage"
          component={LNDViewAdditionalInvoicePreImageComponent}
          options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
        />

        <DetailViewStack.Screen
          name="Broadcast"
          component={BroadcastComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.send.create_broadcast))(theme)}
        />
        <DetailViewStack.Screen
          name="IsItMyAddress"
          component={IsItMyAddressComponent}
          initialParams={{ address: undefined }}
          options={navigationStyle(getSettingsHeaderOptions(loc.is_it_my_address.title))(theme)}
        />
        <DetailViewStack.Screen
          name="GenerateWord"
          component={GenerateWordComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.autofill_word.title))(theme)}
        />
        <DetailViewStack.Screen
          name="LnurlPay"
          component={LnurlPayComponent}
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
          component={LnurlPaySuccessComponent}
          options={navigationStyle({
            title: '',
            closeButtonPosition: CloseButtonPosition.Right,
            headerBackVisible: false,
            gestureEnabled: false,
          })(theme)}
        />
        <DetailViewStack.Screen name="LnurlAuth" component={LnurlAuthComponent} options={navigationStyle({ title: '' })(theme)} />
        <DetailViewStack.Screen
          name="Success"
          component={SuccessComponent}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <DetailViewStack.Screen
          name="WalletAddresses"
          component={WalletAddressesComponent}
          options={navigationStyle({ title: loc.addresses.addresses_title })(theme)}
        />

        <DetailViewStack.Screen
          name="Settings"
          component={FocusedSettingsScreen}
          options={navigationStyle({
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
              color: typeof theme.colors.foregroundColor === 'string' ? theme.colors.foregroundColor : String(theme.colors.foregroundColor),
            },
            headerTransparent: false,
            headerBlurEffect: undefined,
            headerStyle: {
              backgroundColor: settingsHeaderBackgroundColor,
            },
            animationTypeForReplace: 'push',
          })(theme)}
        />
        <DetailViewStack.Screen
          name="Currency"
          component={CurrencyComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.currency))(theme)}
        />
        <DetailViewStack.Screen
          name="GeneralSettings"
          component={GeneralSettingsComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.general))(theme)}
        />
        <DetailViewStack.Screen
          name="PlausibleDeniability"
          component={PlausibleDeniabilityComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.plausibledeniability.title))(theme)}
        />
        <DetailViewStack.Screen
          name="Licensing"
          component={LicensingComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.license))(theme)}
        />
        <DetailViewStack.Screen
          name="NetworkSettings"
          component={NetworkSettingsComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.network))(theme)}
        />
        <DetailViewStack.Screen
          name="SettingsBlockExplorer"
          component={SettingsBlockExplorerComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.block_explorer))(theme)}
        />

        <DetailViewStack.Screen
          name="About"
          component={AboutComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.about))(theme)}
        />
        {/* <DetailViewStack.Screen
        name="DefaultView"
        component={DefaultView}
        options={navigationStyle(getSettingsHeaderOptions(loc.settings.default_title))(theme)}
      /> */}
        <DetailViewStack.Screen
          name="ElectrumSettings"
          component={FocusedElectrumSettingsScreen}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.electrum_settings_server))(theme)}
          initialParams={{ server: undefined }}
        />
        <DetailViewStack.Screen
          name="EncryptStorage"
          component={EncryptStorageComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.encrypt_title))(theme)}
        />
        <DetailViewStack.Screen
          name="Language"
          component={LanguageComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.language))(theme)}
        />
        <DetailViewStack.Screen
          name="LightningSettings"
          component={LightningSettingsComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.lightning_settings))(theme)}
        />
        <DetailViewStack.Screen
          name="NotificationSettings"
          component={FocusedNotificationSettingsScreen}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.notifications))(theme)}
        />
        <DetailViewStack.Screen
          name="SelfTest"
          component={SelfTestComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.selfTest))(theme)}
        />
        <DetailViewStack.Screen
          name="ReleaseNotes"
          component={ReleaseNotesComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.about_release_notes))(theme)}
        />
        <DetailViewStack.Screen
          name="SettingsTools"
          component={SettingsToolsComponent}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.tools))(theme)}
        />
        <DetailViewStack.Screen
          name="PromptPasswordConfirmationSheet"
          component={PromptPasswordConfirmationSheetComponent}
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
          component={ManageWalletsComponent}
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
          component={ReceiveCustomAmountSheetComponent}
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
