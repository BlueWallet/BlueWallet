import React, { useRef, cloneElement } from 'react';
import PropTypes from 'prop-types';
import showPopupMenu from 'react-native-popup-menu-android';
import { Pressable, TouchableOpacity } from 'react-native';

const ToolTipMenu = props => {
  const ref = useRef();
  const isMenuPrimaryAction = props.isMenuPrimaryAction ?? false;
  // eslint-disable-next-line react/prop-types
  const buttonStyle = props.buttonStyle ?? {};
  const handleToolTipSelection = selection => {
    props.onPress(selection.id);
  };

  const showMenu = () => {
    const menu = [];
    for (const actions of props.actions) {
      if (Array.isArray(actions)) {
        for (const actionToMap of actions) {
          menu.push({ id: actionToMap.id, label: actionToMap.text });
        }
      } else {
        menu.push({ id: actions.id, label: actions.text });
      }
    }

    showPopupMenu(menu, handleToolTipSelection, ref.current);
  };

  const child = (Array.isArray(props.children) ? props.children[0] : props.children) || null;
  return isMenuPrimaryAction ? (
    <TouchableOpacity style={buttonStyle} ref={ref} onPress={showMenu}>
      {child}
    </TouchableOpacity>
  ) : (
    <Pressable ref={ref} onLongPress={showMenu}>
      {child && cloneElement(child, { onLongPress: showMenu })}
    </Pressable>
  );
};

export default ToolTipMenu;
ToolTipMenu.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape).isRequired,
  children: PropTypes.node.isRequired,
  onPress: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
};
