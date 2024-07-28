import 'react-native-gesture-handler'; // should be on top

import React, { lazy, Suspense } from 'react';
import MainRoot from './navigation';
import { useStorage } from './hooks/context/useStorage';
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
