import 'react-native-gesture-handler'; // should be on top

import React, { lazy, Suspense } from 'react';

import { useStorage } from './blue_modules/storage-context';
import MainRoot from './navigation';
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
