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
import { TrueSheet } from '@lodev09/react-native-true-sheet';

const App = () => {
  const colorScheme = useColorScheme();

  const onReady = () => {
    // @ts-ignore: fix later
    navigationRef.current?.addListener('beforeRemove', async (e: any) => {
      if (e.data.action.type === 'NAVIGATE') {
        e.preventDefault();
        await TrueSheet.dismiss('BottomModal');
        navigationRef.current?.dispatch(e.data.action);
      }
    });
  };

  return (
    <LargeScreenProvider>
      <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme} onReady={onReady}>
        <SafeAreaProvider>
          <StorageProvider>
            <SettingsProvider>
              <MasterView />
            </SettingsProvider>
          </StorageProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </LargeScreenProvider>
  );
};

export default App;
