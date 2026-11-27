import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, PlatformColor } from 'react-native';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import Broadcast from '../screen/settings/Broadcast';
import TransactionStatus from '../screen/transactions/TransactionStatus';
import WalletAddresses from '../screen/wallets/WalletAddresses';
import AddressDetails from '../screen/wallets/AddressDetails';
import WalletDetails from '../screen/wallets/WalletDetails';
import SelectWallet from '../screen/wallets/SelectWallet';
import WalletHome from '../screen/wallets/WalletHome';
import WalletTransactionHistory from '../screen/wallets/WalletTransactionHistory';
import WalletTransactionsRedirect from '../screen/wallets/WalletTransactionsRedirect';
import { DetailViewStack } from './index';
import { useSettings } from '../hooks/context/useSettings';
import Settings from '../screen/settings/Settings';
import Currency from '../screen/settings/Currency';
import GeneralSettings from '../screen/settings/GeneralSettings';
import Licensing from '../screen/settings/Licensing';
import NetworkSettings from '../screen/settings/NetworkSettings';
import NeuraiBackendEdit from '../screen/settings/NeuraiBackendEdit';
import DepinRpcEdit from '../screen/settings/DepinRpcEdit';
import SettingsBlockExplorer from '../screen/settings/SettingsBlockExplorer';
import About from '../screen/settings/About';
// import DefaultView from '../screen/settings/DefaultView'; // Commented out - not accessible from UI
import ElectrumSettings from '../screen/settings/ElectrumSettings';
import EncryptStorage from '../screen/settings/EncryptStorage';
import Language from '../screen/settings/Language';
import NotificationSettings from '../screen/settings/NotificationSettings';
import SelfTest from '../screen/settings/SelfTest';
import ReleaseNotes from '../screen/settings/ReleaseNotes';
import PromptPasswordConfirmationSheet from '../screen/PromptPasswordConfirmationSheet';
import EncryptionUpgradeSheet from '../screen/EncryptionUpgradeSheet';
import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { ConnectionPollContext } from './ConnectionPollContext';
import ManageWallets from '../screen/wallets/ManageWallets';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import ReceiveCustomAmountSheet from '../screen/receive/ReceiveCustomAmountSheet';
import SendNeurai from '../screen/send/SendNeurai';
import ConnectPair from '../screen/connect/ConnectPair';
import ConnectLogin from '../screen/connect/ConnectLogin';
import ConnectProposal from '../screen/connect/ConnectProposal';
import ConnectRequest from '../screen/connect/ConnectRequest';
import ConnectSessions from '../screen/connect/ConnectSessions';
import ImportNeurai from '../screen/wallets/ImportNeurai';

const DetailViewStackScreensStack = () => {
  const theme = useTheme();
  const { isElectrumDisabled } = useSettings();
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
        {/* The home draws its own top bar (wallet switcher and settings). */}
        <DetailViewStack.Screen
          name="WalletsList"
          component={WalletHome}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.home.wallets }}
        />
        {/* Old per-wallet links: put that wallet on the home and go back to it. */}
        <DetailViewStack.Screen
          name="WalletTransactions"
          component={WalletTransactionsRedirect}
          options={{ headerShown: false, animation: 'none' }}
        />
        <DetailViewStack.Screen
          name="WalletDetails"
          component={WalletDetails}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.wallets.details_title }}
        />
        <DetailViewStack.Screen
          name="TransactionStatus"
          component={TransactionStatus}
          initialParams={{
            hash: undefined,
            walletID: undefined,
          }}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.transactions.details_title }}
        />
        <DetailViewStack.Screen
          name="SelectWallet"
          component={SelectWallet}
          options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
        />
        {/* Draws its own header, like the settings screens. */}
        <DetailViewStack.Screen
          name="SendNeurai"
          component={SendNeurai}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.send.header }}
        />
        <DetailViewStack.Screen
          name="ImportNeurai"
          component={ImportNeurai}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.wallets.import_title }}
        />
        <DetailViewStack.Screen
          name="Broadcast"
          component={Broadcast}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.network_broadcast }}
        />
        <DetailViewStack.Screen
          name="WalletAddresses"
          component={WalletAddresses}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.addresses.addresses_title }}
        />
        <DetailViewStack.Screen
          name="AddressDetails"
          component={AddressDetails}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.addresses.address }}
        />
        {/* Opened from "See all" on the home; draws its own header, like the home. */}
        <DetailViewStack.Screen
          name="WalletTransactionHistory"
          component={WalletTransactionHistory}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.home.transactions }}
        />

        {/* Settings and Security draw their own header, like the home. */}
        <DetailViewStack.Screen
          name="Settings"
          component={Settings}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.header }}
        />
        <DetailViewStack.Screen
          name="Currency"
          component={Currency}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.currency }}
        />
        <DetailViewStack.Screen
          name="GeneralSettings"
          component={GeneralSettings}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.general }}
        />
        <DetailViewStack.Screen
          name="Licensing"
          component={Licensing}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.license))(theme)}
        />
        <DetailViewStack.Screen
          name="NetworkSettings"
          component={NetworkSettings}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.network }}
        />
        <DetailViewStack.Screen
          name="NeuraiBackendEdit"
          component={NeuraiBackendEdit}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.neurai_backend_edit_title))(theme)}
        />
        <DetailViewStack.Screen
          name="DepinRpcEdit"
          component={DepinRpcEdit}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.depin.server_title }}
        />
        {/* Neurai Connect. The three approval screens are modals: a site asking
            for a signature interrupts whatever the user was doing, and it must
            be dismissible without disturbing the stack underneath. */}
        <DetailViewStack.Screen
          name="ConnectPair"
          component={ConnectPair}
          options={{
            headerShown: false,
            presentation: 'modal',
            statusBarStyle: theme.dark ? 'light' : 'dark',
            title: loc.connect.pair_title,
          }}
        />
        <DetailViewStack.Screen
          name="ConnectLogin"
          component={ConnectLogin}
          options={{
            headerShown: false,
            presentation: 'modal',
            statusBarStyle: theme.dark ? 'light' : 'dark',
            title: loc.connect.login_title,
          }}
        />
        <DetailViewStack.Screen
          name="ConnectProposal"
          component={ConnectProposal}
          options={{
            headerShown: false,
            presentation: 'modal',
            statusBarStyle: theme.dark ? 'light' : 'dark',
            title: loc.connect.proposal_title,
          }}
        />
        <DetailViewStack.Screen
          name="ConnectRequest"
          component={ConnectRequest}
          options={{
            headerShown: false,
            presentation: 'modal',
            statusBarStyle: theme.dark ? 'light' : 'dark',
            title: loc.connect.request_title,
          }}
        />
        <DetailViewStack.Screen
          name="ConnectSessions"
          component={ConnectSessions}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.connect.sessions_screen_title }}
        />
        <DetailViewStack.Screen
          name="SettingsBlockExplorer"
          component={SettingsBlockExplorer}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.block_explorer }}
        />

        <DetailViewStack.Screen
          name="About"
          component={About}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.about }}
        />
        {/* <DetailViewStack.Screen
        name="DefaultView"
        component={DefaultView}
        options={navigationStyle(getSettingsHeaderOptions(loc.settings.default_title))(theme)}
      /> */}
        <DetailViewStack.Screen
          name="ElectrumSettings"
          component={ElectrumSettings}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.electrum_settings_server))(theme)}
          initialParams={{ server: undefined }}
        />
        <DetailViewStack.Screen
          name="EncryptStorage"
          component={EncryptStorage}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.encrypt_title }}
        />
        <DetailViewStack.Screen
          name="Language"
          component={Language}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.language }}
        />
        <DetailViewStack.Screen
          name="NotificationSettings"
          component={NotificationSettings}
          options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.settings.notifications }}
        />
        <DetailViewStack.Screen
          name="SelfTest"
          component={SelfTest}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.selfTest))(theme)}
        />
        <DetailViewStack.Screen
          name="ReleaseNotes"
          component={ReleaseNotes}
          options={navigationStyle(getSettingsHeaderOptions(loc.settings.about_release_notes))(theme)}
        />
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
          name="EncryptionUpgradeSheet"
          component={EncryptionUpgradeSheet}
          options={navigationStyle({
            title: loc.settings.encryption_upgrade_title,
            presentation: 'formSheet',
            sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.9],
            sheetGrabberVisible: true,
            headerShown: false,
          })(theme)}
        />
        <DetailViewStack.Screen
          name="ManageWallets"
          component={ManageWallets}
          options={{
            presentation: 'fullScreenModal',
            title: loc.wallets.manage_title,
            headerShown: false,
            statusBarStyle: theme.dark ? 'light' : 'dark',
          }}
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
