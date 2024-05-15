import 'react-native-gesture-handler'; // should be on top
import React, { Suspense, lazy, useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import MainRoot from './navigation';
import { useStorage } from './blue_modules/storage-context';
import Biometric from './class/biometrics';
const CompanionDelegates = lazy(() => import('./components/CompanionDelegates'));
const { SplashScreen } = NativeModules;

const MasterView = () => {
  const { walletsInitialized } = useStorage();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Call hide to setup the listener on the native side
      SplashScreen?.addObserver();
    }
  }, []);

  return (
    <>
      <Biometric />
      <MainRoot />
      {walletsInitialized && (
        <Suspense>
          <CompanionDelegates />
        </Suspense>
      )}
    </>
  );
};

export default MasterView;
