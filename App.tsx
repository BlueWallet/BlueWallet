import { CommonActions, NavigationAction, NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
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
import {
  findNavigatorKeyForRoute,
  getGuardedRoute,
  GuardedRoute,
  GuardedNavigationAction,
  validateGuardedRoute,
} from './navigation/navigationGuard';

const Navigation = ({ colorScheme }: { colorScheme: ReturnType<typeof useColorScheme> }) => {
  const { wallets, saveToDisk } = useStorage();
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
          if (!result.allowed && !result.redirect) return;

          const nextAction = result.redirect ? CommonActions.navigate(result.redirect.name, result.redirect.params) : action;
          const targetRouteName = result.redirect?.name ?? guardedRoute.name;
          const targetNavigatorKey = result.redirect
            ? findNavigatorKeyForRoute(navigationRef.getRootState(), targetRouteName)
            : navigatorKey;

          navigationRef.dispatch({
            ...nextAction,
            ...(targetNavigatorKey ? { target: targetNavigatorKey } : {}),
            navigationGuardValidated: true,
          } as GuardedNavigationAction);
        })
        .catch(error => console.error('Navigation validation failed', error));
    },
    [validateNavigation],
  );

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  return (
    <NavigationContainer
      ref={navigationRef}
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
    <SizeClassProvider>
      <SafeAreaProvider>
        <StorageProvider>
          <SettingsProvider>
            <Navigation colorScheme={colorScheme} />
          </SettingsProvider>
        </StorageProvider>
      </SafeAreaProvider>
    </SizeClassProvider>
  );
};

export default App;
