import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import ContextMenu, { ContextMenuAction } from 'react-native-context-menu-view';
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
    enableAndroidRipple = true,
    enableIOSPressOpacity = false,
  } = props;

  const { language } = useSettings();
  const openedRef = useRef(false);

  const handleMenuWillShow = useCallback(() => {
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;
    onMenuWillShow?.();
  }, [onMenuWillShow]);

  const normalizeMenuState = useCallback((menuState?: Action['menuState']): boolean | undefined => {
    if (menuState === undefined) {
      return undefined;
    }
    if (menuState === 'mixed') {
      return true;
    }
    return Boolean(menuState);
  }, []);

  const mapMenuItemForMenuView = useCallback(
    (action: Action): ContextMenuAction | null => {
      if (!action?.id || action.hidden) return null;

      const mappedSubactions = (action.subactions || [])
        .map(subaction => mapMenuItemForMenuView(subaction))
        .filter((item): item is ContextMenuAction => item !== null);

      const menuItem: ContextMenuAction = {
        title: action.text,
        subtitle: action.subtitle,
        systemIcon: Platform.OS === 'ios' ? action.icon?.iconValue ?? action.image : undefined,
        icon: Platform.OS === 'android' ? action.icon?.iconValue ?? action.image : undefined,
        iconColor: typeof action.imageColor === 'string' ? action.imageColor : undefined,
        destructive: Boolean(action.destructive),
        disabled: Boolean(action.disabled),
        inlineChildren: Platform.OS === 'ios' ? action.displayInline : undefined,
      };

      const selected = normalizeMenuState(action.menuState);
      if (selected !== undefined) {
        menuItem.selected = selected;
      }

      if (mappedSubactions.length > 0) {
        menuItem.actions = mappedSubactions;
      }

      return menuItem;
    },
    [normalizeMenuState],
  );

  const menuViewItemsIOS = useMemo(() => {
    return actions
      .map(actionGroup => {
        if (Array.isArray(actionGroup) && actionGroup.length > 0) {
          const inlineActions = actionGroup.map(mapMenuItemForMenuView).filter((item): item is ContextMenuAction => item !== null);
          if (inlineActions.length === 0) return null;
          const group: ContextMenuAction = {
            title: '',
            actions: inlineActions,
            inlineChildren: true,
          };
          return group;
        }

        if (!Array.isArray(actionGroup)) {
          return mapMenuItemForMenuView(actionGroup);
        }

        return null;
      })
      .filter((item): item is ContextMenuAction => item !== null);
  }, [actions, mapMenuItemForMenuView]);

  const menuViewItemsAndroid = useMemo(() => {
    const mergedActions = actions.flat().filter(action => action.id && !action.hidden);
    return mergedActions.map(mapMenuItemForMenuView).filter((item): item is ContextMenuAction => item !== null);
  }, [actions, mapMenuItemForMenuView]);

  const handlePressMenuItemForMenuView = ({ nativeEvent }: { nativeEvent: { name?: string } }) => {
    if (nativeEvent?.name) {
      onPressMenuItem(nativeEvent.name);
    }
    openedRef.current = false;
    onMenuWillHide?.();
  };

  const renderMenuView = () => {
    if (disabled || (!isButton && !onPress)) {
      return null;
    }

    return (
      <Pressable
        android_ripple={enableAndroidRipple ? { color: '#d9d9d9', foreground: true } : undefined}
        style={({ pressed }) => {
          const base: ViewStyle[] = [styles.pressable];
          if (buttonStyle) {
            if (Array.isArray(buttonStyle)) {
              base.push(...buttonStyle);
            } else {
              base.push(buttonStyle);
            }
          }
          // Keep visual feedback on Android by default. iOS context-menu preview
          // already applies a system press effect; opt in when needed.
          const shouldApplyPressedStyle =
            pressed &&
            ((Platform.OS === 'android' && enableAndroidRipple) || (Platform.OS === 'ios' && enableIOSPressOpacity));
          if (shouldApplyPressedStyle) base.push(styles.pressed);
          return base;
        }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={!shouldOpenOnLongPress ? handleMenuWillShow : undefined}
        onLongPress={shouldOpenOnLongPress ? handleMenuWillShow : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityLanguage={language}
        testID={testID}
        hitSlop={8}
      >
        <ContextMenu
          title={title}
          previewBackgroundColor="transparent"
          onPress={handlePressMenuItemForMenuView}
          onCancel={() => {
            if (!openedRef.current) {
              return;
            }
            openedRef.current = false;
            onMenuWillHide?.();
          }}
          actions={Platform.OS === 'ios' ? menuViewItemsIOS : menuViewItemsAndroid}
          dropdownMenuMode={!shouldOpenOnLongPress}
          disabled={disabled}
          style={buttonStyle ? styles.menuViewFlex : undefined}
        >
          {children}
        </ContextMenu>
      </Pressable>
    );
  };

  return actions.length > 0 ? renderMenuView() : null;
};

export default ToolTipMenu;

const styles = StyleSheet.create({
  menuViewFlex: { flex: 1 },
  pressable: { alignSelf: 'center' },
  pressed: { opacity: 0.6 },
});
