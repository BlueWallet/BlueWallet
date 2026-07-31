import { NavigationContainer, NavigationContainerRef, ParamListBase, Route } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
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

const requiresBiometrics = ['WalletExport', 'WalletXpub', 'ViewEditMultisigCosigners', 'ExportMultisigCoordinationSetupRoot'];
const requiresWalletExportIsSaved = ['ReceiveDetails', 'WalletAddresses'];

type NavigationRoute = Route<string, object | undefined>;

const Navigation = ({ colorScheme }: { colorScheme: ReturnType<typeof useColorScheme> }) => {
  const { wallets, saveToDisk } = useStorage();
  const { isBiometricUseEnabled } = useBiometrics();
  const currentRouteRef = useRef<NavigationRoute | undefined>(undefined);
  const validationIdRef = useRef(0);
  const skipNextStateChangeRef = useRef(false);

  const getWalletID = (params: object | undefined) => {
    const routeParams = params as { walletID?: string; params?: { walletID?: string } } | undefined;
    return routeParams?.walletID ?? routeParams?.params?.walletID;
  };

  const returnToPreviousRoute = useCallback((routeKey: string, validationId: number) => {
    if (validationId !== validationIdRef.current || navigationRef.getCurrentRoute()?.key !== routeKey) return;

    skipNextStateChangeRef.current = true;
    navigationRef.goBack();
  }, []);

  const validateRoute = useCallback(
    async (previousRoute: NavigationRoute | undefined, route: NavigationRoute, validationId: number) => {
      // Navigation initiated by the scanner already has its own validation flow.
      if (previousRoute?.name === 'ScanQRCode') return;

      if (requiresBiometrics.includes(route.name) && (await isBiometricUseEnabled())) {
        if (!(await unlockWithBiometrics())) {
          returnToPreviousRoute(route.key, validationId);
          return;
        }
      }

      if (requiresWalletExportIsSaved.includes(route.name)) {
        const walletID = getWalletID(route.params);
        const wallet = wallets.find(item => item.getID() === walletID);

        if (wallet && !wallet.getUserHasSavedExport()) {
          try {
            await presentWalletExportReminder();
            wallet.setUserHasSavedExport(true);
            await saveToDisk();
          } catch {
            if (validationId !== validationIdRef.current || navigationRef.getCurrentRoute()?.key !== route.key) return;

            // WalletExport was reached through the reminder, so don't run a second validation for it.
            skipNextStateChangeRef.current = true;
            navigationRef.navigate('WalletExport', { walletID });
          }
          return;
        }
      }

      if (route.name === 'ScanQRCode' && validationId === validationIdRef.current && navigationRef.getCurrentRoute()?.key === route.key) {
        await requestCameraAuthorization();
      }
    },
    [isBiometricUseEnabled, returnToPreviousRoute, saveToDisk, wallets],
  );

  const handleReady = useCallback(() => {
    currentRouteRef.current = navigationRef.getCurrentRoute();
  }, []);

  const handleStateChange = useCallback(() => {
    const route = navigationRef.getCurrentRoute();
    if (!route || route.key === currentRouteRef.current?.key) return;

    const previousRoute = currentRouteRef.current;
    currentRouteRef.current = route;
    const validationId = ++validationIdRef.current;

    if (skipNextStateChangeRef.current) {
      skipNextStateChangeRef.current = false;
      return;
    }

    validateRoute(previousRoute, route, validationId).catch(error => console.error('Navigation validation failed', error));
  }, [validateRoute]);

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}
      onReady={handleReady}
      onStateChange={handleStateChange}
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
