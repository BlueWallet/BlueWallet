import React, { forwardRef } from 'react';
import { ContextMenuView, ContextMenuButton } from 'react-native-ios-context-menu';
import PropTypes from 'prop-types';
import { TouchableOpacity } from 'react-native';

const ToolTipMenu = (props, ref) => {
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

  const buttonStyle = props.buttonStyle;
  return isButton ? (
    <ContextMenuButton
      ref={ref}
      disabled={disabled}
      onPressMenuItem={({ nativeEvent }) => {
        props.onPressMenuItem(nativeEvent.actionKey);
      }}
      isMenuPrimaryAction={isMenuPrimaryAction}
      menuConfig={{
        menuTitle,
        menuItems,
      }}
      style={buttonStyle}
    >
      {props.onPress ? (
        <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
          {props.children}
        </TouchableOpacity>
      ) : (
        props.children
      )}
    </ContextMenuButton>
  ) : props.onPress ? (
    <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
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
    </TouchableOpacity>
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

export default forwardRef(ToolTipMenu);
ToolTipMenu.propTypes = {
  actions: PropTypes.object.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  onPressMenuItem: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
  isButton: PropTypes.bool,
  renderPreview: PropTypes.element,
  onPress: PropTypes.func,
  previewValue: PropTypes.string,
  disabled: PropTypes.bool,
};
