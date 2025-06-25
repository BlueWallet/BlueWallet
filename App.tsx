import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { useColorScheme, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';
import { StorageProvider } from './components/Context/StorageProvider';
import LinkingConfig, { updateWalletContext } from './navigation/LinkingConfig';

// Fallback component shown when React Navigation is resolving deep links
const FallbackComponent = () => <Text>Loading deep link...</Text>;

const App = () => {
  const colorScheme = useColorScheme();

  useLogger(navigationRef);

  return (
    <SizeClassProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}
        linking={LinkingConfig}
        fallback={<FallbackComponent />}
      >
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
