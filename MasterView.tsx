import 'react-native-gesture-handler'; // should be on top
import React, { Suspense, lazy } from 'react';
import MainRoot from './navigation';
import { useStorage } from './blue_modules/storage-context';
import Biometric from './class/biometrics';
const CompanionDelegates = lazy(() => import('./components/CompanionDelegates'));

const MasterView = () => {
  const { walletsInitialized } = useStorage();

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
