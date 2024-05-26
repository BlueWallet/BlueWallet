import React, { forwardRef, Ref, useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { ContextMenuButton, ContextMenuView, RenderItem } from 'react-native-ios-context-menu';

import { Action, ToolTipMenuProps } from './types';

const BaseToolTipMenu = (props: ToolTipMenuProps, ref: Ref<any>) => {
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
    onPressMenuItem,
    ...restProps
  } = props;

  const menuItemMapped = useCallback(({ action, menuOptions }: { action: Action; menuOptions?: string[] }) => {
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
  }, []);

  const menuItems = useMemo(
    () =>
      props.actions.map(action => {
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
      }),
    [props.actions, menuItemMapped],
  );

  const handlePressMenuItem = useCallback(
    ({ nativeEvent }: { nativeEvent: { actionKey: string } }) => {
      onPressMenuItem(nativeEvent.actionKey);
    },
    [onPressMenuItem],
  );

  const renderContextMenuButton = () => (
    <ContextMenuButton
      ref={ref}
      onMenuWillShow={onMenuWillShow}
      onMenuWillHide={onMenuWillHide}
      useActionSheetFallback={false}
      onPressMenuItem={handlePressMenuItem}
      isMenuPrimaryAction={isMenuPrimaryAction}
      menuConfig={{
        menuTitle: title,
        menuItems,
      }}
      {...restProps}
      style={buttonStyle}
    >
      <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" {...restProps}>
        {props.children}
      </TouchableOpacity>
    </ContextMenuButton>
  );

  const renderContextMenuView = () => (
    <ContextMenuView
      ref={ref}
      lazyPreview
      shouldEnableAggressiveCleanup
      internalCleanupMode="automatic"
      onPressMenuItem={handlePressMenuItem}
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
      {onPress ? (
        <TouchableOpacity accessibilityRole="button" onPress={onPress} {...restProps}>
          {props.children}
        </TouchableOpacity>
      ) : (
        props.children
      )}
    </ContextMenuView>
  );

  return isMenuPrimaryAction && onPress ? (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" {...restProps}>
      {renderContextMenuButton()}
    </TouchableOpacity>
  ) : isButton ? (
    renderContextMenuButton()
  ) : (
    renderContextMenuView()
  );
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
