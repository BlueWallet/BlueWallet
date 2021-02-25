import React, { forwardRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import showPopupMenu from 'react-native-popup-menu-android';

const ToolTipMenu = (props, ref) => {
  const handleToolTipSelection = selection => {
    props.onPress(selection.id);
  };

  const showMenu = () => {
    const actions = props.actions.map(action => ({ id: action.id, label: action.text }));
    showPopupMenu(actions, handleToolTipSelection, props.anchorRef.current);
  };

  useEffect(() => {
    ref.current.showMenu = showMenu;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return <View ref={ref} />;
};

export default forwardRef(ToolTipMenu);
ToolTipMenu.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape).isRequired,
  anchorRef: PropTypes.node,
  onPress: PropTypes.func.isRequired,
};
