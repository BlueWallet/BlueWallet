import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { useSettings } from './hooks/context/useSettings';
import { BlueDarkTheme, BlueDefaultTheme } from './components/themes';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';
import { StorageProvider } from './components/Context/StorageProvider';
import { BackupReminderHost } from './components/BackupReminder';
import { AppDialogHost } from './components/AppDialog';

// Lives inside SettingsProvider so it can read the user's theme preference
// (system / light / dark) and apply it to the navigation container.
const ThemedNavigation = () => {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettings();

  useLogger(navigationRef as unknown as React.RefObject<NavigationContainerRef<ParamListBase>>);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && colorScheme === 'dark');

  return (
    <NavigationContainer ref={navigationRef} theme={isDark ? BlueDarkTheme : BlueDefaultTheme}>
      <MasterView />
      {/* Inside the navigation container, for the theme. */}
      <BackupReminderHost />
      {/* Last, so a message shows over everything, the backup reminder included. */}
      <AppDialogHost />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <SizeClassProvider>
      <SafeAreaProvider>
        <StorageProvider>
          <SettingsProvider>
            <ThemedNavigation />
          </SettingsProvider>
        </StorageProvider>
      </SafeAreaProvider>
    </SizeClassProvider>
  );
};

export default App;
