import React, { Ref, useCallback, useMemo } from 'react';
import { Platform, Pressable, TouchableOpacity, View } from 'react-native';
import { ContextMenuView, RenderItem, OnPressMenuItemEventObject, MenuState, IconConfig } from 'react-native-ios-context-menu';
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
    return {
      actionKey: action.id.toString(),
      actionTitle: action.text,
      icon: action.icon?.iconValue ? ({ iconType: 'SYSTEM', iconValue: action.icon.iconValue } as IconConfig) : undefined,
      state: action.menuStateOn ? ('on' as MenuState) : ('off' as MenuState),
      attributes: action.disabled ? ['disabled'] : [],
    };
  }, []);

  const mapMenuItemForMenuView = useCallback((action: Action): MenuAction => {
    return {
      id: action.id.toString(),
      title: action.text,
      image: action.menuStateOn && Platform.OS === 'android' ? 'checkbox_on_background' : action.icon?.iconValue || undefined,
      state: action.menuStateOn ? ('on' as MenuState) : undefined,
      attributes: { disabled: action.disabled },
    };
  }, []);

  const contextMenuItems = useMemo(() => {
    const flattenedActions = props.actions.flat();
    return flattenedActions.map(mapMenuItemForContextMenuView);
  }, [props.actions, mapMenuItemForContextMenuView]);

  const menuViewItemsIOS = useMemo(() => {
    return props.actions.map(actionGroup => {
      if (Array.isArray(actionGroup)) {
        return {
          id: actionGroup[0].id.toString(),
          title: '',
          subactions: actionGroup.map(mapMenuItemForMenuView),
          displayInline: true,
        };
      } else {
        return mapMenuItemForMenuView(actionGroup);
      }
    });
  }, [props.actions, mapMenuItemForMenuView]);

  const menuViewItemsAndroid = useMemo(() => {
    const mergedActions = props.actions.flat();
    return mergedActions.map(mapMenuItemForMenuView);
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

  return Platform.OS === 'ios' && renderPreview ? renderContextMenuView() : renderMenuView();
});

export default ToolTipMenu;
