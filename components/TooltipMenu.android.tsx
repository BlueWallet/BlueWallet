import React, { forwardRef, useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import { MenuView, NativeActionEvent } from '@react-native-menu/menu';
import { ToolTipMenuProps } from './types';

const BaseToolTipMenu = (props: ToolTipMenuProps, ref: any) => {
  const {
    actions,
    children,
    onPressMenuItem,
    isMenuPrimaryAction = false,
    buttonStyle = {},
    enableAndroidRipple = true,
    disabled = false,
    onPress,
    title = 'Menu',
    ...restProps
  } = props;

  console.debug('ToolTipMenu.android.tsx ref:', ref);

  const menuItems = useMemo(() => {
    return actions.flatMap(action => {
      if (Array.isArray(action)) {
        return action.map(actionToMap => ({
          id: actionToMap.id.toString(),
          title: actionToMap.text,
          titleColor: actionToMap.disabled ? 'gray' : 'black',
          image: actionToMap.icon.iconValue,
          imageColor: actionToMap.disabled ? 'gray' : 'black',
          attributes: { disabled: actionToMap.disabled },
        }));
      }
      return {
        id: action.id.toString(),
        title: action.text,
        titleColor: action.disabled ? 'gray' : 'black',
        image: action.icon.iconValue,
        imageColor: action.disabled ? 'gray' : 'black',
        attributes: { disabled: action.disabled },
      };
    });
  }, [actions]);

  const handleToolTipSelection = useCallback(
    ({ nativeEvent }: NativeActionEvent) => {
      if (nativeEvent) {
        onPressMenuItem(nativeEvent.event);
      }
    },
    [onPressMenuItem],
  );

  return (
    <MenuView title={title} onPressAction={handleToolTipSelection} actions={menuItems} shouldOpenOnLongPress={!isMenuPrimaryAction}>
      <Pressable
        {...(enableAndroidRipple ? { android_ripple: { color: 'lightgrey' } } : {})}
        disabled={disabled}
        style={buttonStyle}
        {...(isMenuPrimaryAction ? { onPress: () => {} } : { onPress })}
        {...restProps}
      >
        {children}
      </Pressable>
    </MenuView>
  );
};

const ToolTipMenu = BaseToolTipMenu;

export default forwardRef(ToolTipMenu);
