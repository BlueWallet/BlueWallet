import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DeeplinkSchemaMatch from './class/deeplink-schema-match';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';
import { StorageProvider } from './components/Context/StorageProvider';
import { useStorage } from './hooks/context/useStorage';
import UnlockWith from './screen/UnlockWith';

const AppContent = () => {
  const colorScheme = useColorScheme();
  const { wallets, addWallet, saveToDisk, setSharedCosigner, walletsInitialized } = useStorage();
  const pendingDeepLinkRef = useRef<string | null>(null);

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  const processDeepLink = useCallback(
    (url: string) => {
      DeeplinkSchemaMatch.navigationRouteFor({ url }, (value: [string, any]) => navigationRef.navigate(...value), {
        wallets,
        addWallet,
        saveToDisk,
        setSharedCosigner,
      });
    },
    [addWallet, saveToDisk, setSharedCosigner, wallets],
  );

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (!url || !DeeplinkSchemaMatch.hasSchema(url)) return;

      if (!walletsInitialized) {
        pendingDeepLinkRef.current = url;
        return;
      }

      processDeepLink(url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL()
      .then(url => {
        if (!url || !DeeplinkSchemaMatch.hasSchema(url)) return;

        if (!walletsInitialized) {
          pendingDeepLinkRef.current = url;
          return;
        }

        processDeepLink(url);
      })
      .catch(error => {
        console.error('[AppContent] Failed to read initial URL:', error);
      });

    return () => {
      subscription.remove();
    };
  }, [addWallet, processDeepLink, saveToDisk, setSharedCosigner, walletsInitialized, wallets]);

  useEffect(() => {
    if (!walletsInitialized || !pendingDeepLinkRef.current) return;

    const pendingUrl = pendingDeepLinkRef.current;
    pendingDeepLinkRef.current = null;

    const timer = setTimeout(() => {
      processDeepLink(pendingUrl);
    }, 0);

    return () => clearTimeout(timer);
  }, [processDeepLink, walletsInitialized, wallets]);

  if (!walletsInitialized) {
    return <UnlockWith />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
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
            <AppContent />
          </SettingsProvider>
        </StorageProvider>
      </SafeAreaProvider>
    </SizeClassProvider>
  );
};

export default App;
