import React, { lazy, Suspense } from 'react';
import { useStorage } from '../hooks/context/useStorage';
import DevMenu from '../components/DevMenu';
import MainRoot from './index';
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
