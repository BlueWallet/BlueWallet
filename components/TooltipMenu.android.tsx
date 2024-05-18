import React, { useRef, useEffect, forwardRef, Ref, useMemo, useCallback } from 'react';
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

  const handleToolTipSelection = useCallback<OnPopupMenuItemSelect>(
    (selection: PopupMenuItem) => {
      if (selection.id) {
        onPressMenuItem(selection.id);
      }
    },
    [onPressMenuItem],
  );

  useEffect(() => {
    if (ref && menuRef.current) {
      (ref as React.MutableRefObject<{ dismissMenu?: () => void }>).current.dismissMenu = dismissMenu;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const dismissMenu = useCallback(() => {
    console.log('dismissMenu Not implemented');
  }, []);

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
    showPopupMenu(menuItems, handleToolTipSelection, menuRef.current);
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
