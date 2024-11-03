import React, { lazy, Suspense } from 'react';
import MainRoot from '../navigation';
import { useStorage } from '../hooks/context/useStorage';
import DevMenu from '../components/DevMenu';
import useDeviceQuickActions from '../hooks/useDeviceQuickActions';
import useMenuElements from '../hooks/useMenuElements';
const CompanionDelegates = lazy(() => import('../components/CompanionDelegates'));

const MasterView = () => {
  const { walletsInitialized } = useStorage();
  useDeviceQuickActions();
  useMenuElements();

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
