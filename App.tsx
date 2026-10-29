import {
  CommonActions,
  NavigationAction,
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
  StackActions,
} from '@react-navigation/native';
import React, { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';
import { StorageProvider } from './components/Context/StorageProvider';
import { useStorage } from './hooks/context/useStorage';
import { unlockWithBiometrics, useBiometrics } from './hooks/useBiometrics';
import { presentWalletExportReminder } from './helpers/presentWalletExportReminder';
import { requestCameraAuthorization } from './helpers/scan-qr';
import presentAlert from './components/Alert';
import triggerHapticFeedback, { HapticFeedbackTypes } from './blue_modules/hapticFeedback';
import loc from './loc';
import {
  findNavigatorKeyForRoute,
  getGuardRedirectActions,
  getGuardedRoute,
  GuardedRoute,
  GuardedNavigationAction,
  validateGuardedRoute,
} from './navigation/navigationGuard';
import { linking } from './navigation/linking';

const Navigation = ({ colorScheme }: { colorScheme: ReturnType<typeof useColorScheme> }) => {
  const { wallets, walletsInitialized, saveToDisk } = useStorage();
  const { isBiometricUseEnabled } = useBiometrics();

  const validateNavigation = useCallback(
    (route: GuardedRoute) =>
      validateGuardedRoute(route, {
        currentRouteName: navigationRef.getCurrentRoute()?.name,
        isBiometricUseEnabled,
        unlockWithBiometrics,
        wallets,
        saveToDisk,
        presentWalletExportReminder,
        requestCameraAuthorization,
      }),
    [isBiometricUseEnabled, saveToDisk, wallets],
  );

  const handleUnhandledAction = useCallback(
    (action: Readonly<NavigationAction>) => {
      const guardedRoute = getGuardedRoute(action);
      if (!guardedRoute) {
        console.error('Unhandled navigation action', action);
        return;
      }

      const actionRouteName =
        action.payload && 'name' in action.payload && typeof action.payload.name === 'string' ? action.payload.name : undefined;
      const navigatorKey =
        actionRouteName === guardedRoute.name ? findNavigatorKeyForRoute(navigationRef.getRootState(), guardedRoute.name) : undefined;

      validateNavigation(guardedRoute)
        .then(result => {
          if (result.failure) {
            triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
            const isShortcut = guardedRoute.name === 'AppShortcut';
            presentAlert({
              title: loc.errors.error,
              message:
                result.failure === 'missingSendWallet'
                  ? loc.send.details_wallet_before_tx
                  : result.failure === 'missingLightningWallet'
                    ? loc.wallets.no_ln_wallet_error
                    : loc.wallets.select_no_bitcoin,
              ...(isShortcut
                ? {
                    buttons: [
                      {
                        text: loc.wallets.add_title,
                        onPress: () => {
                          const nextAction =
                            navigationRef.getCurrentRoute()?.name === 'AppShortcut'
                              ? StackActions.replace('AddWalletRoot')
                              : CommonActions.navigate('AddWalletRoot');
                          navigationRef.dispatch(nextAction);
                        },
                      },
                      {
                        text: loc._.ok,
                        style: 'cancel' as const,
                        onPress: () => {
                          if (navigationRef.getCurrentRoute()?.name === 'AppShortcut') {
                            navigationRef.dispatch(StackActions.popTo('DrawerRoot'));
                          }
                        },
                      },
                    ],
                  }
                : {}),
            });
            return;
          }

          if (!result.allowed && !result.redirect) return;

          const nextActions = result.redirect
            ? getGuardRedirectActions(
                result.redirect,
                guardedRoute.name === 'AppShortcut' && navigationRef.getCurrentRoute()?.name === 'AppShortcut',
              )
            : [{ action, targetRouteName: guardedRoute.name }];

          for (const { action: nextAction, targetRouteName } of nextActions) {
            const targetNavigatorKey = result.redirect
              ? findNavigatorKeyForRoute(navigationRef.getRootState(), targetRouteName)
              : navigatorKey;

            navigationRef.dispatch({
              ...nextAction,
              ...(targetNavigatorKey ? { target: targetNavigatorKey } : {}),
              navigationGuardValidated: true,
            } as GuardedNavigationAction);
          }
        })
        .catch(error => console.error('Navigation validation failed', error));
    },
    [validateNavigation],
  );

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  return (
    <NavigationContainer
      // Shortcut links must be resolved after the storage/unlock flow has
      // registered the wallet screens they target. Remounting also makes
      // React Navigation read the native initial URL again after unlock.
      key={walletsInitialized ? 'wallets' : 'unlock'}
      ref={navigationRef}
      linking={walletsInitialized ? linking : undefined}
      theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}
      onUnhandledAction={handleUnhandledAction}
    >
      <MasterView />
    </NavigationContainer>
  );
};

const App = () => {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <StorageProvider>
        <SettingsProvider>
          <Navigation colorScheme={colorScheme} />
        </SettingsProvider>
      </StorageProvider>
    </SafeAreaProvider>
  );
};

export default App;
