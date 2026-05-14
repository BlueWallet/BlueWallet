import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { StorageProvider } from './components/Context/StorageProvider';
import { ModeProvider } from './src/context/ModeContext';   // ← Añadido
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';

const App = () => {
  const colorScheme = useColorScheme();

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  return (
    <ModeProvider>                     {/* ← Nuevo Provider añadido */}
      <SizeClassProvider>
        <NavigationContainer 
          ref={navigationRef} 
          theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}
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
    </ModeProvider>
  );
};

export default App;