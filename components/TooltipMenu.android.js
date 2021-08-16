import React, { useRef, cloneElement } from 'react';
import PropTypes from 'prop-types';
import showPopupMenu from 'react-native-popup-menu-android';
import { Pressable } from 'react-native';

const ToolTipMenu = props => {
  const ref = useRef();
  const handleToolTipSelection = selection => {
    props.onPress(selection.id);
  };

  const showMenu = () => {
    let actions = props.actions.map(action => ({ id: action.id, label: action.text }));
    if (props.submenu) {
      actions = actions.concat(props.submenu.menuItems.map(action => ({ id: action.actionKey, label: action.actionTitle })));
    }
    showPopupMenu(actions, handleToolTipSelection, ref.current);
  };

  const child = (Array.isArray(props.children) ? props.children[0] : props.children) || null;

  return <Pressable ref={ref}>{child && cloneElement(child, { onLongPress: showMenu })}</Pressable>;
};

export default ToolTipMenu;
ToolTipMenu.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape).isRequired,
  children: PropTypes.node,
  submenu: PropTypes.any,
  onPress: PropTypes.func.isRequired(),
};
