import 'react-native-gesture-handler'; // should be on top
import React, { useEffect } from 'react';
import { NativeModules, Platform, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './NavigationService';
import { BlueDefaultTheme, BlueDarkTheme } from './components/themes';
import { NavigationProvider } from './components/NavigationProvider';
import { BlueStorageProvider } from './blue_modules/storage-context';
import MasterView from './MasterView';
import { SettingsProvider } from './components/Context/SettingsContext';
const { SplashScreen } = NativeModules;

const App = () => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Call hide to setup the listener on the native side
      SplashScreen?.addObserver();
    }
  }, []);

  return (
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
  );
};

export default App;
