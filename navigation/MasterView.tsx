import React from 'react';
import MainRoot from './index';
import useNotifications from '../hooks/useNotifications';

const DevMenu = __DEV__ ? require('../components/DevMenu').default : null;

const MasterView = () => {
  // Register native notification listeners at app startup (before unlock) so
  // cold-boot notification taps are captured using the library's public APIs.
  useNotifications({ enabled: true });

  return (
    <>
      <MainRoot />
      {DevMenu ? <DevMenu /> : null}
    </>
  );
};

export default MasterView;
