import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { StorageProvider } from './components/Context/StorageProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import { useLogger } from '@react-navigation/devtools';
import { useStorage } from './hooks/context/useStorage';
import { navigationRef } from './NavigationService';
import MasterView from './navigation/MasterView';
import { createBlueWalletLinking } from './navigation/linking';
import type { TDeepLinkContext } from './navigation/linking/types';

const AppNavigation = () => {
  const colorScheme = useColorScheme();
  const { wallets, addWallet, saveToDisk, setSharedCosigner } = useStorage();

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  const deepLinkContext: TDeepLinkContext = useMemo(
    () => ({
      wallets,
      addWallet,
      saveToDisk,
      setSharedCosigner,
    }),
    [wallets, addWallet, saveToDisk, setSharedCosigner],
  );

  // Store context in a ref so the linking object can always read the latest
  // wallets/context without the linking prop itself changing. This prevents
  // React Navigation's useLinking from re-subscribing on every wallet update,
  // which caused race conditions (POP undoing notification navigation).
  const deepLinkContextRef = useRef<TDeepLinkContext>(deepLinkContext);
  useEffect(() => {
    deepLinkContextRef.current = deepLinkContext;
  }, [deepLinkContext]);

  const linking = useMemo(() => createBlueWalletLinking(deepLinkContextRef), []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
      <MasterView />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <SizeClassProvider>
      <SafeAreaProvider>
        <StorageProvider>
          <SettingsProvider>
            <AppNavigation />
          </SettingsProvider>
        </StorageProvider>
      </SafeAreaProvider>
    </SizeClassProvider>
  );
};

export default App;
