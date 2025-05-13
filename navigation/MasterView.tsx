import React from 'react';
import DevMenu from '../components/DevMenu';
import MainRoot from './index';

const MasterView = () => {
  return (
    <>
      <MainRoot />
      {__DEV__ && <DevMenu />}
    </>
  );
};

export default MasterView;
