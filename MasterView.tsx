import 'react-native-gesture-handler'; // should be on top
import React, { Suspense, lazy } from 'react';
import MainRoot from './navigation';
import { useStorage } from './blue_modules/storage-context';
const CompanionDelegates = lazy(() => import('./components/CompanionDelegates'));

const MasterView = () => {
  const { walletsInitialized } = useStorage();

  return (
    <>
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
