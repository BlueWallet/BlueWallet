import 'react-native-gesture-handler'; // should be on top

import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LargeScreenProvider } from './components/Context/LargeScreenProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { StorageProvider } from './components/Context/StorageProvider';
import { ElectrumProvider } from './components/Context/ElectrumProvider';

const App = () => {
  const colorScheme = useColorScheme();

  return (
    <LargeScreenProvider>
      <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
        <SafeAreaProvider>
          <ElectrumProvider>
            <StorageProvider>
              <SettingsProvider>
                <MasterView />
              </SettingsProvider>
            </StorageProvider>
          </ElectrumProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </LargeScreenProvider>
  );
};

export default App;
