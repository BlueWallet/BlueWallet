import React from 'react';
import useNotifications from '../hooks/useNotifications';
import MainRoot from './index';

const DevMenu = __DEV__ ? require('../components/DevMenu').default : null;

const MasterView = () => {
  useNotifications();

  return (
    <>
      <MainRoot />
      {DevMenu ? <DevMenu /> : null}
    </>
  );
};

export default MasterView;
