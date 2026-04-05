import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React, { useMemo } from 'react';
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

const AppNavigation = () => {
  const colorScheme = useColorScheme();
  const { wallets, addWallet, saveToDisk, setSharedCosigner } = useStorage();

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  const deepLinkContext = useMemo(
    () => ({
      wallets,
      addWallet,
      saveToDisk,
      setSharedCosigner,
    }),
    [wallets, addWallet, saveToDisk, setSharedCosigner],
  );

  const linking = useMemo(() => createBlueWalletLinking(deepLinkContext), [deepLinkContext]);

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
