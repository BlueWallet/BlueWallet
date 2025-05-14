import React, { useCallback, useMemo } from 'react';
import { Platform, Pressable, TouchableOpacity } from 'react-native';
import { MenuView, MenuAction, NativeActionEvent } from '@react-native-menu/menu';
import { ToolTipMenuProps, Action } from './types';
import { useSettings } from '../hooks/context/useSettings';

const ToolTipMenu = (props: ToolTipMenuProps) => {
  const {
    title = '',
    isMenuPrimaryAction = false,
    disabled = false,
    onPress,
    buttonStyle,
    onPressMenuItem,
    children,
    isButton = false,
    ...restProps
  } = props;

  const { language } = useSettings();

  // Map Menu Items for RN Menu (supports subactions and displayInline)
  const mapMenuItemForMenuView = useCallback((action: Action): MenuAction | null => {
    if (!action.id) return null;

    // Check for subactions
    const subactions =
      action.subactions?.map(subaction => {
        const subMenuItem: MenuAction = {
          id: subaction.id.toString(),
          title: subaction.text,
          subtitle: subaction.subtitle,
          image: subaction.icon?.iconValue ? subaction.icon.iconValue : undefined,
          attributes: { disabled: subaction.disabled, destructive: subaction.destructive, hidden: subaction.hidden },
        };
        if ('menuState' in subaction) {
          subMenuItem.state = subaction.menuState ? 'on' : 'off';
        }
        if (subaction.subactions && subaction.subactions.length > 0) {
          const deepSubactions = subaction.subactions.map(deepSub => {
            const deepMenuItem: MenuAction = {
              id: deepSub.id.toString(),
              title: deepSub.text,
              subtitle: deepSub.subtitle,
              image: deepSub.icon?.iconValue ? deepSub.icon.iconValue : undefined,
              attributes: { disabled: deepSub.disabled, destructive: deepSub.destructive, hidden: deepSub.hidden },
            };
            if ('menuState' in deepSub) {
              deepMenuItem.state = deepSub.menuState ? 'on' : 'off';
            }
            return deepMenuItem;
          });
          subMenuItem.subactions = deepSubactions;
        }
        return subMenuItem;
      }) || [];

    const menuItem: MenuAction = {
      id: action.id.toString(),
      title: action.text,
      subtitle: action.subtitle,
      image: action.icon?.iconValue ? action.icon.iconValue : undefined,
      attributes: { disabled: action.disabled, destructive: action.destructive, hidden: action.hidden },
      displayInline: action.displayInline || false,
    };
    if ('menuState' in action) {
      menuItem.state = action.menuState ? 'on' : 'off';
    }
    if (subactions.length > 0) {
      menuItem.subactions = subactions;
    }
    return menuItem;
  }, []);

  const menuViewItemsIOS = useMemo(() => {
    return props.actions
      .map(actionGroup => {
        if (Array.isArray(actionGroup) && actionGroup.length > 0) {
          return {
            id: actionGroup[0].id.toString(),
            title: '',
            subactions: actionGroup
              .filter(action => action.id)
              .map(mapMenuItemForMenuView)
              .filter(item => item !== null) as MenuAction[],
            displayInline: true,
          };
        } else if (!Array.isArray(actionGroup) && actionGroup.id) {
          return mapMenuItemForMenuView(actionGroup);
        }
        return null;
      })
      .filter(item => item !== null) as MenuAction[];
  }, [props.actions, mapMenuItemForMenuView]);

  const menuViewItemsAndroid = useMemo(() => {
    const mergedActions = props.actions.flat().filter(action => action.id);
    return mergedActions.map(mapMenuItemForMenuView).filter(item => item !== null) as MenuAction[];
  }, [props.actions, mapMenuItemForMenuView]);

  const handlePressMenuItemForMenuView = useCallback(
    ({ nativeEvent }: NativeActionEvent) => {
      onPressMenuItem(nativeEvent.event);
    },
    [onPressMenuItem],
  );

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      buttonStyle,
      {
        opacity: pressed ? 0.7 : 1,
        ...(Platform.OS === 'ios' && {
          backgroundColor: pressed ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        }),
        ...(Platform.OS === 'android' && {
          backgroundColor: pressed ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        }),
      },
    ],
    [buttonStyle],
  );

  const renderMenuView = () => {
    return (
      <MenuView
        title={title}
        isAnchoredToRight
        onPressAction={handlePressMenuItemForMenuView}
        actions={Platform.OS === 'ios' ? menuViewItemsIOS : menuViewItemsAndroid}
        shouldOpenOnLongPress={!isMenuPrimaryAction}
        // @ts-ignore: Not exposed in types
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
        accessibilityRole={props.accessibilityRole}
        accessibilityLanguage={language}
      >
        {isMenuPrimaryAction || isButton ? (
          <Pressable
            style={getPressableStyle}
            disabled={disabled}
            onPress={onPress}
            android_ripple={Platform.OS === 'android' ? { color: 'rgba(0, 0, 0, 0.1)' } : undefined}
            {...restProps}
          >
            {children}
          </Pressable>
        ) : (
          children
        )}
      </MenuView>
    );
  };

  return props.actions.length > 0 ? renderMenuView() : null;
};

export default ToolTipMenu;
