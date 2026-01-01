import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { MenuView, MenuAction, NativeActionEvent } from '@react-native-menu/menu';
import { ToolTipMenuProps, Action } from './types';
import { useSettings } from '../hooks/context/useSettings';

const ToolTipMenu = (props: ToolTipMenuProps) => {
  const {
    title = '',
    shouldOpenOnLongPress = true,
    disabled = false,
    onPress,
    buttonStyle,
    onPressMenuItem,
    children,
    isButton = false,
    actions,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    accessibilityState,
    testID,
    onMenuWillShow,
    onMenuWillHide,
  } = props;

  const { language } = useSettings();
  const openedRef = useRef(false);

  const normalizeMenuState = useCallback((menuState?: Action['menuState']): MenuAction['state'] | undefined => {
    if (menuState === undefined) {
      return undefined;
    }
    if (menuState === 'mixed') {
      return 'mixed';
    }
    return menuState ? 'on' : 'off';
  }, []);

  const buildAttributes = useCallback((action: Action): MenuAction['attributes'] | undefined => {
    const attributes = {
      destructive: Boolean(action.destructive),
      disabled: Boolean(action.disabled),
      hidden: Boolean(action.hidden),
    };

    if (!attributes.destructive && !attributes.disabled && !attributes.hidden) {
      return undefined;
    }

    return attributes;
  }, []);

  const mapMenuItemForMenuView = useCallback(
    (action: Action): MenuAction | null => {
      if (!action?.id) return null;

      const mappedSubactions = (action.subactions || [])
        .map(subaction => mapMenuItemForMenuView(subaction))
        .filter(Boolean) as MenuAction[];

      const menuItem: MenuAction = {
        id: action.id.toString(),
        title: action.text,
        subtitle: action.subtitle,
        image: action.icon?.iconValue ?? action.image,
        imageColor: action.imageColor,
        attributes: buildAttributes(action),
        displayInline: Platform.OS === 'ios' ? action.displayInline : undefined,
      };

      const state = normalizeMenuState(action.menuState);
      if (state) {
        menuItem.state = state;
      }

      if (mappedSubactions.length > 0) {
        menuItem.subactions = mappedSubactions;
      }

      return menuItem;
    },
    [buildAttributes, normalizeMenuState],
  );

  const menuViewItemsIOS = useMemo(() => {
    return actions
      .map(actionGroup => {
        if (Array.isArray(actionGroup) && actionGroup.length > 0) {
          const inlineActions = actionGroup.map(mapMenuItemForMenuView).filter(Boolean) as MenuAction[];
          if (inlineActions.length === 0) return null;
          return {
            id: inlineActions[0].id,
            title: '',
            subactions: inlineActions,
            displayInline: true,
          } as MenuAction;
        }

        if (!Array.isArray(actionGroup)) {
          return mapMenuItemForMenuView(actionGroup);
        }

        return null;
      })
      .filter(Boolean) as MenuAction[];
  }, [actions, mapMenuItemForMenuView]);

  const menuViewItemsAndroid = useMemo(() => {
    const mergedActions = actions.flat().filter(action => action.id);
    return mergedActions.map(mapMenuItemForMenuView).filter(Boolean) as MenuAction[];
  }, [actions, mapMenuItemForMenuView]);

  const handlePressMenuItemForMenuView = ({ nativeEvent }: NativeActionEvent) => {
    if (nativeEvent?.event) {
      onPressMenuItem(nativeEvent.event);
    }
  };

  const renderMenuView = () => {
    return (
      <MenuView
        title={title}
        isAnchoredToRight
        onOpenMenu={() => {
          openedRef.current = true;
          onMenuWillShow?.();
        }}
        onCloseMenu={() => {
          if (!openedRef.current) {
            return;
          }
          openedRef.current = false;
          onMenuWillHide?.();
        }}
        onPressAction={handlePressMenuItemForMenuView}
        actions={Platform.OS === 'ios' ? menuViewItemsIOS : menuViewItemsAndroid}
        shouldOpenOnLongPress={shouldOpenOnLongPress} // Ensuring this prop is respected
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityLanguage={language}
        testID={testID}
      >
        {isButton || onPress ? (
          <TouchableOpacity
            style={buttonStyle}
            disabled={disabled}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={event => {
              onPress?.(event);
            }}
          >
            {children}
          </TouchableOpacity>
        ) : (
          children
        )}
      </MenuView>
    );
  };

  return actions.length > 0 ? renderMenuView() : null;
};

export default ToolTipMenu;
