import { LinkingOptions, NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';
import { StorageProvider } from './components/Context/StorageProvider';
import { DetailViewStackParamList } from './navigation/DetailViewStackParamList';

const toBitcoinUri = (path: string) => {
  const normalizedPath = path.trim().replace(/^\/+/, '');
  if (!normalizedPath) {
    return undefined;
  }

  if (/^bitcoin:/i.test(normalizedPath)) {
    return normalizedPath;
  }

  return `bitcoin:${normalizedPath}`;
};

const linkingConfig: LinkingOptions<DetailViewStackParamList>['config'] = {
  screens: {
    SendDetailsRoot: {
      screens: {
        SendDetails: 'send',
      },
    },
  },
};

const linking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: ['bitcoin:', 'bitcoin://', 'bluewallet:bitcoin:'],
  config: linkingConfig,
  getStateFromPath: path => {
    const uri = toBitcoinUri(path);
    if (!uri) {
      return undefined;
    }

    return {
      routes: [
        {
          name: 'SendDetailsRoot',
          state: {
            routes: [
              {
                name: 'SendDetails',
                params: { uri },
              },
            ],
          },
        },
      ],
    };
  },
};

const App = () => {
  const colorScheme = useColorScheme();

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  return (
    <SizeClassProvider>
      <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme} linking={linking}>
        <SafeAreaProvider>
          <StorageProvider>
            <SettingsProvider>
              <MasterView />
            </SettingsProvider>
          </StorageProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </SizeClassProvider>
  );
};

export default App;
