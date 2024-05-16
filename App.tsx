import 'react-native-gesture-handler'; // should be on top
import React from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './NavigationService';
import { BlueDefaultTheme, BlueDarkTheme } from './components/themes';
import { NavigationProvider } from './components/NavigationProvider';
import { BlueStorageProvider } from './blue_modules/storage-context';
import MasterView from './MasterView';
import { SettingsProvider } from './components/Context/SettingsContext';
import { LargeScreenProvider } from './components/Context/LargeScreenProvider';

const App = () => {
  const colorScheme = useColorScheme();

  return (
    <LargeScreenProvider>
      <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
        <NavigationProvider>
          <SafeAreaProvider>
            <BlueStorageProvider>
              <SettingsProvider>
                <MasterView />
              </SettingsProvider>
            </BlueStorageProvider>
          </SafeAreaProvider>
        </NavigationProvider>
      </NavigationContainer>
    </LargeScreenProvider>
  );
};

export default App;
