import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef } from 'react';
import { Linking, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { StorageProvider } from './components/Context/StorageProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import { useLogger } from '@react-navigation/devtools';
import { useStorage } from './hooks/context/useStorage';
import { navigationRef } from './NavigationService';
import MasterView from './navigation/MasterView';
import { createBlueWalletLinking, navigateFromDeepLink, resolveDeepLinkUrl } from './navigation/linking';

const AppNavigation = () => {
  const colorScheme = useColorScheme();
  const { wallets, walletsInitialized, addWallet, saveToDisk, setSharedCosigner } = useStorage();
  const replayedInitialUrlRef = useRef(false);

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

  useEffect(() => {
    if (!walletsInitialized || replayedInitialUrlRef.current) {
      return;
    }

    replayedInitialUrlRef.current = true;
    let isCancelled = false;

    const replayInitialUrlAfterHydration = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl || isCancelled) {
          return;
        }

        const resolvedWithHydratedContext = await resolveDeepLinkUrl(initialUrl, deepLinkContext);
        if (!resolvedWithHydratedContext) {
          return;
        }

        const resolvedWithoutWalletContext = await resolveDeepLinkUrl(initialUrl, {
          wallets: [],
          addWallet: () => {},
          saveToDisk: () => {},
          setSharedCosigner: () => {},
        });

        if (resolvedWithHydratedContext !== resolvedWithoutWalletContext) {
          await navigateFromDeepLink(initialUrl, deepLinkContext);
        }
      } catch (error) {
        console.warn('Failed to replay initial deep link after hydration:', error);
      }
    };

    replayInitialUrlAfterHydration();

    return () => {
      isCancelled = true;
    };
  }, [walletsInitialized, deepLinkContext]);

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
