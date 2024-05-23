import 'react-native-gesture-handler'; // should be on top

import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlueStorageProvider } from './blue_modules/storage-context';
import { LargeScreenProvider } from './components/Context/LargeScreenProvider';
import { SettingsProvider } from './components/Context/SettingsContext';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';

const App = () => {
  const colorScheme = useColorScheme();

  return (
    <LargeScreenProvider>
      <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
        <SafeAreaProvider>
          <BlueStorageProvider>
            <SettingsProvider>
              <MasterView />
            </SettingsProvider>
          </BlueStorageProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </LargeScreenProvider>
  );
};

export default App;
