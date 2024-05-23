import React, { forwardRef, Ref, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';

import showPopupMenu, { OnPopupMenuItemSelect, PopupMenuItem } from '../blue_modules/showPopupMenu.android';
import { ToolTipMenuProps } from './types';

const dismissMenu = () => {
  console.log('dismissMenu Not implemented');
};
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

  const handleToolTipSelection = useCallback<OnPopupMenuItemSelect>(
    (selection: PopupMenuItem) => {
      if (selection.id) {
        onPressMenuItem(selection.id);
      }
    },
    [onPressMenuItem],
  );

  useEffect(() => {
    // @ts-ignore: fix later
    if (ref && ref.current) {
      // @ts-ignore: fix later
      ref.current.dismissMenu = dismissMenu;
    }
  }, [ref]);

  const menuItems = useMemo(() => {
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
    return menu;
  }, [actions]);

  const showMenu = useCallback(() => {
    if (menuRef.current) {
      showPopupMenu(menuItems, handleToolTipSelection, menuRef.current);
    }
  }, [menuItems, handleToolTipSelection]);

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
