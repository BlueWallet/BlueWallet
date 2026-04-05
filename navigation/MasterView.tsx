import React from 'react';
import MainRoot from './index';

const DevMenu = __DEV__ ? require('../components/DevMenu').default : null;

const MasterView = () => {
  return (
    <>
      <MainRoot />
      {DevMenu ? <DevMenu /> : null}
    </>
  );
};

export default MasterView;
