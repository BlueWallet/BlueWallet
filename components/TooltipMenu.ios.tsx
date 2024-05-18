// ToolTipMenu.ios.tsx
import React, { forwardRef, Ref } from 'react';
import { ContextMenuView, ContextMenuButton, RenderItem } from 'react-native-ios-context-menu';
import { TouchableOpacity } from 'react-native';
import { ToolTipMenuProps, Action } from './types';

const BaseToolTipMenu = (props: ToolTipMenuProps, ref: Ref<any>) => {
  const menuItemMapped = ({ action, menuOptions }: { action: Action; menuOptions?: string[] }) => {
    const item: any = {
      actionKey: action.id.toString(),
      actionTitle: action.text,
      icon: action.icon,
      menuOptions,
      menuTitle: action.menuTitle,
    };
    item.menuState = action.menuStateOn ? 'on' : 'off';

    if (action.disabled) {
      item.menuAttributes = ['disabled'];
    }
    return item;
  };

  const menuItems = props.actions.map(action => {
    if (Array.isArray(action)) {
      const mapped = action.map(actionToMap => menuItemMapped({ action: actionToMap }));
      return {
        menuOptions: ['displayInline'],
        menuItems: mapped,
        menuTitle: '',
      };
    } else {
      return menuItemMapped({ action });
    }
  });

  const {
    title = '',
    isButton = false,
    isMenuPrimaryAction = false,
    renderPreview,
    disabled = false,
    onPress,
    onMenuWillShow,
    onMenuWillHide,
    buttonStyle,
  } = props;

  return isButton ? (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" style={buttonStyle}>
      <ContextMenuButton
        ref={ref}
        onMenuWillShow={onMenuWillShow}
        onMenuWillHide={onMenuWillHide}
        useActionSheetFallback={false}
        onPressMenuItem={({ nativeEvent }) => {
          props.onPressMenuItem(nativeEvent.actionKey);
        }}
        isMenuPrimaryAction={isMenuPrimaryAction}
        menuConfig={{
          menuTitle: title,
          menuItems,
        }}
      >
        {props.children}
      </ContextMenuButton>
    </TouchableOpacity>
  ) : props.onPress ? (
    <ContextMenuView
      ref={ref}
      lazyPreview
      shouldEnableAggressiveCleanup
      internalCleanupMode="automatic"
      onPressMenuItem={({ nativeEvent }) => {
        props.onPressMenuItem(nativeEvent.actionKey);
      }}
      useActionSheetFallback={false}
      menuConfig={{
        menuTitle: title,
        menuItems,
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
      <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
        {props.children}
      </TouchableOpacity>
    </ContextMenuView>
  ) : (
    <ContextMenuView
      ref={ref}
      internalCleanupMode="viewController"
      onPressMenuItem={({ nativeEvent }) => {
        props.onPressMenuItem(nativeEvent.actionKey);
      }}
      lazyPreview
      shouldEnableAggressiveCleanup
      useActionSheetFallback={false}
      menuConfig={{
        menuTitle: title,
        menuItems,
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
      {props.children}
    </ContextMenuView>
  );
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
