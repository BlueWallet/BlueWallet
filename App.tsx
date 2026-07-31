import {
  CommonActions,
  NavigationAction,
  NavigationContainer,
  NavigationContainerRef,
  NavigationState,
  ParamListBase,
  PartialState,
} from '@react-navigation/native';
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
import { getGuardedRoute, GuardedNavigationAction } from './navigation/navigationGuard';

const requiresBiometrics = ['WalletExport', 'WalletXpub', 'ViewEditMultisigCosigners', 'ExportMultisigCoordinationSetupRoot'];
const requiresWalletExportIsSaved = ['ReceiveDetails', 'WalletAddresses'];

type NavigationValidationResult = {
  allowed: boolean;
  redirect?: { name: string; params?: object };
};

const getWalletID = (params: object | undefined) => {
  const routeParams = params as { walletID?: string; params?: { walletID?: string } } | undefined;
  return routeParams?.walletID ?? routeParams?.params?.walletID;
};

const findNavigatorKeyForRoute = (
  state: NavigationState | PartialState<NavigationState> | undefined,
  routeName: string,
): string | undefined => {
  if (!state) return undefined;
  if (state.routeNames?.includes(routeName)) return state.key;

  const focusedRoute = state.routes[state.index ?? 0];
  const routes = focusedRoute ? [focusedRoute, ...state.routes.filter(route => route.key !== focusedRoute.key)] : state.routes;

  for (const route of routes) {
    const navigatorKey = findNavigatorKeyForRoute(route.state, routeName);
    if (navigatorKey) return navigatorKey;
  }

  return undefined;
};

const Navigation = ({ colorScheme }: { colorScheme: ReturnType<typeof useColorScheme> }) => {
  const { wallets, saveToDisk } = useStorage();
  const { isBiometricUseEnabled } = useBiometrics();

  const validateNavigation = useCallback(
    async (screenName: string, params: object | undefined): Promise<NavigationValidationResult> => {
      // Navigation initiated by the scanner already has its own validation flow.
      if (navigationRef.getCurrentRoute()?.name === 'ScanQRCode') return { allowed: true };

      if (requiresBiometrics.includes(screenName) && (await isBiometricUseEnabled())) {
        if (!(await unlockWithBiometrics())) {
          return { allowed: false };
        }
      }

      if (requiresWalletExportIsSaved.includes(screenName)) {
        const walletID = getWalletID(params);
        const wallet = wallets.find(item => item.getID() === walletID);

        if (wallet && !wallet.getUserHasSavedExport()) {
          try {
            await presentWalletExportReminder();
            wallet.setUserHasSavedExport(true);
            await saveToDisk();
          } catch {
            return { allowed: false, redirect: { name: 'WalletExport', params: { walletID } } };
          }
        }
      }

      if (screenName === 'ScanQRCode') {
        await requestCameraAuthorization();
      }

      return { allowed: true };
    },
    [isBiometricUseEnabled, saveToDisk, wallets],
  );

  const handleUnhandledAction = useCallback(
    (action: Readonly<NavigationAction>) => {
      const guardedRoute = getGuardedRoute(action);
      if (!guardedRoute) {
        console.error('Unhandled navigation action', action);
        return;
      }

      const navigatorKey = findNavigatorKeyForRoute(navigationRef.getRootState(), guardedRoute.name);

      validateNavigation(guardedRoute.name, guardedRoute.params)
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
