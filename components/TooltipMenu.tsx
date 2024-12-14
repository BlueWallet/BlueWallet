import React, { Ref, useCallback, useMemo } from 'react';
import { Platform, Pressable, TouchableOpacity } from 'react-native';
import { MenuView, MenuAction, NativeActionEvent } from '@react-native-menu/menu';
import {
  ContextMenuView,
  RenderItem,
  OnPressMenuItemEventObject,
  MenuState,
  IconConfig,
  MenuElementConfig,
} from 'react-native-ios-context-menu';
import { ToolTipMenuProps, Action } from './types';
import { useSettings } from '../hooks/context/useSettings';

const ToolTipMenu = React.memo((props: ToolTipMenuProps, ref?: Ref<any>) => {
  const {
    title = '',
    isMenuPrimaryAction = false,
    renderPreview,
    disabled = false,
    onPress,
    onMenuWillShow,
    onMenuWillHide,
    buttonStyle,
    onPressMenuItem,
    children,
    isButton = false,
    ...restProps
  } = props;

  const { language } = useSettings();

  // Map Menu Items for iOS Context Menu
  const mapMenuItemForContextMenuView = useCallback((action: Action) => {
    if (!action.id) return null;
    return {
      actionKey: action.id.toString(),
      actionTitle: action.text,
      icon: action.icon?.iconValue ? ({ iconType: 'SYSTEM', iconValue: action.icon.iconValue } as IconConfig) : undefined,
      state: action.menuState ?? undefined,
      attributes: action.disabled ? ['disabled'] : [],
    };
  }, []);

  // Map Menu Items for RN Menu (supports subactions and displayInline)
  const mapMenuItemForMenuView = useCallback((action: Action): MenuAction | null => {
    if (!action.id) return null;

    // Check for subactions
    const subactions =
      action.subactions?.map(subaction => ({
        id: subaction.id.toString(),
        title: subaction.text,
        subtitle: subaction.subtitle,
        image: subaction.icon?.iconValue ? subaction.icon.iconValue : undefined,
        state: subaction.menuState === undefined ? undefined : ((subaction.menuState ? 'on' : 'off') as MenuState),
        attributes: {
          disabled: subaction.disabled,
          destructive: subaction.destructive,
          hidden: subaction.hidden,
        },
        subactions: subaction.subactions ? subaction.subactions.map(mapMenuItemForMenuView).filter(Boolean) : undefined,
        displayInline: subaction.displayInline || false,
      })) || [];

    return {
      id: action.id.toString(),
      title: action.text,
      subtitle: action.subtitle,
      image: action.icon?.iconValue ? action.icon.iconValue : undefined,
      state: action.menuState === undefined ? undefined : ((action.menuState ? 'on' : 'off') as MenuState),
      attributes: {
        disabled: action.disabled,
        destructive: action.destructive,
        hidden: action.hidden,
      },
      subactions: subactions.length > 0 ? (subactions.filter(Boolean) as MenuAction[]) : undefined,
      displayInline: action.displayInline || false,
    };
  }, []);

  const contextMenuItems = useMemo(() => {
    const flattenedActions = props.actions.flat().filter(action => action.id);
    return flattenedActions.map(mapMenuItemForContextMenuView).filter(item => item !== null) as MenuElementConfig[];
  }, [props.actions, mapMenuItemForContextMenuView]);

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
            keepsMenuPresented: true,
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

  const handlePressMenuItemForContextMenuView = useCallback(
    (event: OnPressMenuItemEventObject) => {
      onPressMenuItem(event.nativeEvent.actionKey);
    },
    [onPressMenuItem],
  );

  const handlePressMenuItemForMenuView = useCallback(
    ({ nativeEvent }: NativeActionEvent) => {
      onPressMenuItem(nativeEvent.event);
    },
    [onPressMenuItem],
  );

  const renderContextMenuView = () => {
    return (
      <ContextMenuView
        lazyPreview
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
        accessibilityRole={props.accessibilityRole}
        accessibilityState={props.accessibilityState}
        accessibilityLanguage={language}
        shouldEnableAggressiveCleanup
        internalCleanupMode="automatic"
        onPressMenuItem={handlePressMenuItemForContextMenuView}
        onMenuWillShow={onMenuWillShow}
        onMenuWillHide={onMenuWillHide}
        useActionSheetFallback={false}
        menuConfig={{
          menuTitle: title,
          menuItems: contextMenuItems,
        }}
        {...(renderPreview
          ? {
              previewConfig: {
                previewType: 'CUSTOM',
                backgroundColor: 'white',
              },
              renderPreview: renderPreview as RenderItem,
            }
          : {})}
      >
        {onPress ? (
          <Pressable accessibilityRole="button" onPress={onPress} {...restProps}>
            {children}
          </Pressable>
        ) : (
          children
        )}
      </ContextMenuView>
    );
  };

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
          <TouchableOpacity style={buttonStyle} disabled={disabled} onPress={onPress} {...restProps}>
            {children}
          </TouchableOpacity>
        ) : (
          children
        )}
      </MenuView>
    );
  };

  return props.actions.length > 0 ? (Platform.OS === 'ios' && renderPreview ? renderContextMenuView() : renderMenuView()) : null;
});

export default ToolTipMenu;
