import React, { useRef, useEffect, forwardRef, Ref } from 'react';
import { Pressable, View } from 'react-native';
import showPopupMenu, { OnPopupMenuItemSelect, PopupMenuItem } from '../blue_modules/showPopupMenu.android';
import { ToolTipMenuProps } from './types';

const BaseToolTipMenu = (props: ToolTipMenuProps, ref: Ref<{ dismissMenu?: () => void }>) => {
  const menuRef = useRef<View>(null);
  const {
    actions,
    children,
    onPressMenuItem,
    isMenuPrimaryAction = false,
    buttonStyle = {},
    enableAndroidRipple = true,
    disabled = false,
    onPress,
    ...restProps
  } = props;

  const handleToolTipSelection: OnPopupMenuItemSelect = (selection: PopupMenuItem) => {
    if (selection.id) {
      onPressMenuItem(selection.id);
    }
  };

  useEffect(() => {
    if (ref && menuRef.current) {
      (ref as React.MutableRefObject<{ dismissMenu?: () => void }>).current.dismissMenu = dismissMenu;
    }
  }, [ref]);

  const dismissMenu = () => {
    console.log('dismissMenu Not implemented');
  };

  const showMenu = () => {
    const menu: { id: string; label: string }[] = [];
    actions.forEach(action => {
      if (Array.isArray(action)) {
        action.forEach(actionToMap => {
          menu.push({ id: actionToMap.id.toString(), label: actionToMap.text });
        });
      } else {
        menu.push({ id: action.id.toString(), label: action.text });
      }
    });

    showPopupMenu(menu, handleToolTipSelection, menuRef.current);
  };

  return (
    <Pressable
      {...(enableAndroidRipple ? { android_ripple: { color: 'lightgrey' } } : {})}
      ref={menuRef}
      disabled={disabled}
      style={buttonStyle}
      {...(isMenuPrimaryAction ? { onPress: showMenu } : { onPress, onLongPress: showMenu })}
      {...restProps}
    >
      {children}
    </Pressable>
  );
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
