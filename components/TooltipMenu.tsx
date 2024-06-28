import React, { Ref, useCallback, useMemo } from 'react';
import { Platform, Pressable, TouchableOpacity, View } from 'react-native';
import {
  ContextMenuView,
  RenderItem,
  OnPressMenuItemEventObject,
  MenuState,
  IconConfig,
  MenuElementConfig,
} from 'react-native-ios-context-menu';
import { MenuView, MenuAction, NativeActionEvent } from '@react-native-menu/menu';
import { ToolTipMenuProps, Action } from './types';

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

  const mapMenuItemForContextMenuView = useCallback((action: Action) => {
    if (!action.id) return null;
    return {
      actionKey: action.id.toString(),
      actionTitle: action.text,
      icon: action.icon?.iconValue ? ({ iconType: 'SYSTEM', iconValue: action.icon.iconValue } as IconConfig) : undefined,
      state: action.menuStateOn ? ('on' as MenuState) : ('off' as MenuState),
      attributes: action.disabled ? ['disabled'] : [],
    };
  }, []);

  const mapMenuItemForMenuView = useCallback((action: Action): MenuAction | null => {
    if (!action.id) return null;
    return {
      id: action.id.toString(),
      title: action.text,
      image: action.menuStateOn && Platform.OS === 'android' ? 'checkbox_on_background' : action.icon?.iconValue || undefined,
      state: action.menuStateOn ? ('on' as MenuState) : undefined,
      attributes: { disabled: action.disabled },
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
    console.debug('ToolTipMenu.tsx rendering: renderContextMenuView');
    return (
      <ContextMenuView
        lazyPreview
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
    console.debug('ToolTipMenu.tsx rendering: renderMenuView');
    return (
      <View>
        <MenuView
          title={title}
          isAnchoredToRight
          onPressAction={handlePressMenuItemForMenuView}
          actions={Platform.OS === 'ios' ? menuViewItemsIOS : menuViewItemsAndroid}
          shouldOpenOnLongPress={!isMenuPrimaryAction}
        >
          {isMenuPrimaryAction || isButton ? (
            <TouchableOpacity style={buttonStyle} disabled={disabled} onPress={onPress} {...restProps}>
              {children}
            </TouchableOpacity>
          ) : (
            children
          )}
        </MenuView>
      </View>
    );
  };

  return props.actions.length > 0 ? (Platform.OS === 'ios' && renderPreview ? renderContextMenuView() : renderMenuView()) : null;
});

export default ToolTipMenu;
