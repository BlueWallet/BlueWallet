import 'react-native-gesture-handler'; // should be on top
import React, { Suspense, lazy, useEffect } from 'react';
import { NativeModules, Platform, UIManager, useColorScheme, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './NavigationService';
import { BlueDefaultTheme, BlueDarkTheme } from './components/themes';
import { NavigationProvider } from './components/NavigationProvider';
import MainRoot from './navigation';
import { useStorage } from './blue_modules/storage-context';
import Biometric from './class/biometrics';
const CompanionDelegates = lazy(() => import('./components/CompanionDelegates'));
const { SplashScreen } = NativeModules;

LogBox.ignoreLogs(['Require cycle:', 'Battery state `unknown` and monitoring disabled, this is normal for simulators and tvOS.']);

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const App = () => {
  const { walletsInitialized } = useStorage();
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
          <Biometric />
          <MainRoot />

          {/* {walletsInitialized && (
            <Suspense>
              <CompanionDelegates />
            </Suspense>
          )} */}
        </SafeAreaProvider>
      </NavigationProvider>
    </NavigationContainer>
  );
};

export default App;
