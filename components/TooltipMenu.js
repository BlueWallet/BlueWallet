import React, { forwardRef, useEffect } from 'react';
import { View } from 'react-native';

const ToolTipMenu = (props, ref) => {
  const showMenu = () => {
    console.log('not implemented');
  };

  const hideMenu = () => {
    console.log('not implemented');
  };

  useEffect(() => {
    ref.current.showMenu = showMenu;
    ref.current.hideMenu = hideMenu;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return <View ref={ref} />;
};

export default forwardRef(ToolTipMenu);
