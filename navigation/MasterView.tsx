import 'react-native-gesture-handler'; // should be on top

import React, { lazy, Suspense } from 'react';
import MainRoot from '../navigation';
import { useStorage } from '../hooks/context/useStorage';
import DevMenu from '../components/DevMenu';
const CompanionDelegates = lazy(() => import('../components/CompanionDelegates'));

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
      {__DEV__ && <DevMenu />}
    </>
  );
};

export default MasterView;
