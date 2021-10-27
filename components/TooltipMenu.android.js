import React, { useRef, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity } from 'react-native';
import showPopupMenu from '../blue_modules/showPopupMenu';

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
  return (
    <TouchableOpacity
      style={buttonStyle}
      ref={menuRef}
      {...(isMenuPrimaryAction ? { onPress: showMenu } : { onPress: props.onPress, onLongPress: showMenu })}
    >
      {child}
    </TouchableOpacity>
  );
};

export default forwardRef(ToolTipMenu);
ToolTipMenu.propTypes = {
  actions: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  onPressMenuItem: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
  onPress: PropTypes.func,
};
