import React, { useRef, forwardRef, useEffect } from 'react';
import ToolTip from 'react-native-tooltip';
import PropTypes from 'prop-types';
import { View } from 'react-native';

const ToolTipMenu = (props, ref) => {
  const toolTip = useRef();

  const showMenu = () => {
    console.log('Showing ToolTip');
    toolTip.current?.showMenu();
  };

  const hideMenu = () => {
    console.log('Hiding ToolTip');
    toolTip.current?.hideMenu();
  };

  useEffect(() => {
    ref.current.showMenu = showMenu;
    ref.current.hideMenu = hideMenu;
  }, [ref]);

  return (
    <View ref={ref}>
      <ToolTip ref={toolTip} actions={props.actions} />
    </View>
  );
};

export default forwardRef(ToolTipMenu);
ToolTipMenu.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape).isRequired,
};
