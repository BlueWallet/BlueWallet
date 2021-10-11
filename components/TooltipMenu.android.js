import React, { useRef, cloneElement, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import showPopupMenu from 'react-native-popup-menu-android';
import { Pressable, TouchableOpacity } from 'react-native';

const ToolTipMenu = (props, ref) => {
  const menuRef = useRef();
  const isMenuPrimaryAction = props.isMenuPrimaryAction ?? false;
  // eslint-disable-next-line react/prop-types
  const buttonStyle = props.buttonStyle ?? {};
  const handleToolTipSelection = selection => {
    props.onPressMenuItem(selection.id);
  };

  useEffect(() => {
    if (ref && ref.current) {
      ref.current.dismissMenu = dismissMenu;
    }
  }, [ref]);

  const dismissMenu = () => {
    console.log('dismissMenu Not implemented');
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

    showPopupMenu(menu, handleToolTipSelection, menuRef.current);
  };

  const child = (Array.isArray(props.children) ? props.children[0] : props.children) || null;
  return isMenuPrimaryAction ? (
    <TouchableOpacity style={buttonStyle} ref={menuRef} onPress={showMenu}>
      {child}
    </TouchableOpacity>
  ) : (
    <Pressable ref={menuRef} onLongPress={showMenu}>
      {child && cloneElement(child, { onLongPress: showMenu })}
    </Pressable>
  );
};

export default forwardRef(ToolTipMenu);
ToolTipMenu.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape).isRequired,
  children: PropTypes.node.isRequired,
  onPressMenuItem: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
};
