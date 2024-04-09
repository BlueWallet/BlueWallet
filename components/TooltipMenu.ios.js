import React, { forwardRef } from 'react';
import { ContextMenuView, ContextMenuButton } from 'react-native-ios-context-menu';
import PropTypes from 'prop-types';
import { TouchableOpacity } from 'react-native';

const BaseToolTipMenu = (props, ref) => {
  const menuItemMapped = ({ action, menuOptions }) => {
    const item = {
      actionKey: action.id,
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
      const mapped = [];
      for (const actionToMap of action) {
        mapped.push(menuItemMapped({ action: actionToMap }));
      }
      const submenu = {
        menuOptions: ['displayInline'],
        menuItems: mapped,
        menuTitle: '',
      };
      return submenu;
    } else {
      return menuItemMapped({ action });
    }
  });
  const menuTitle = props.title ?? '';
  const isButton = !!props.isButton;
  const isMenuPrimaryAction = props.isMenuPrimaryAction ? props.isMenuPrimaryAction : false;
  const renderPreview = props.renderPreview ?? undefined;
  const disabled = props.disabled ?? false;
  const onPress = props.onPress ?? undefined;
  const onMenuWillShow = props.onMenuWillShow ?? undefined;
  const onMenuWillHide = props.onMenuWillHide ?? undefined;

  const buttonStyle = props.buttonStyle;
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
          menuTitle,
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
      shouldCleanupOnComponent
      internalCleanupMode="viewController"
      onPressMenuItem={({ nativeEvent }) => {
        props.onPressMenuItem(nativeEvent.actionKey);
      }}
      useActionSheetFallback={false}
      menuConfig={{
        menuTitle,
        menuItems,
      }}
      {...(renderPreview
        ? {
            previewConfig: {
              previewType: 'CUSTOM',
              backgroundColor: 'white',
            },
            renderPreview,
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
      useActionSheetFallback={false}
      menuConfig={{
        menuTitle,
        menuItems,
      }}
      {...(renderPreview
        ? {
            previewConfig: {
              previewType: 'CUSTOM',
              backgroundColor: 'white',
            },
            renderPreview,
          }
        : {})}
    >
      {props.children}
    </ContextMenuView>
  );
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
ToolTipMenu.propTypes = {
  actions: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  onPressMenuItem: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
  isButton: PropTypes.bool,
  renderPreview: PropTypes.func,
  onPress: PropTypes.func,
  previewValue: PropTypes.string,
  disabled: PropTypes.bool,
};
