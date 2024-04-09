import React, { useRef, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Pressable } from 'react-native';
import showPopupMenu from '../blue_modules/showPopupMenu';

const BaseToolTipMenu = (props, ref) => {
  const menuRef = useRef();
  const disabled = props.disabled ?? false;
  const isMenuPrimaryAction = props.isMenuPrimaryAction ?? false;
  const enableAndroidRipple = props.enableAndroidRipple ?? true;
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

  return (
    <Pressable
      {...(enableAndroidRipple ? { android_ripple: { color: 'lightgrey' } } : {})}
      ref={menuRef}
      disabled={disabled}
      style={buttonStyle}
      {...(isMenuPrimaryAction ? { onPress: showMenu } : { onPress: props.onPress, onLongPress: showMenu })}
    >
      {props.children}
    </Pressable>
  );
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
ToolTipMenu.propTypes = {
  actions: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  children: PropTypes.node,
  onPressMenuItem: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
  onPress: PropTypes.func,
  disabled: PropTypes.bool,
};
