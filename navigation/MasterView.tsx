import React from 'react';
import DevMenu from '../components/DevMenu';
import MainRoot from './index';
import useCompanionListeners from '../hooks/useCompanionListeners';

const MasterView = () => {
  // Initialize companion listeners only when wallets are initialized
  // The hook checks walletsInitialized internally, so it won't run until ready
  useCompanionListeners();

  return (
    <>
      <MainRoot />
      {__DEV__ && <DevMenu />}
    </>
  );
};

export default MasterView;
