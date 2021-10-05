import React from 'react';
import { ContextMenuView, ContextMenuButton } from 'react-native-ios-context-menu';
import PropTypes from 'prop-types';
import QRCodeComponent from './QRCodeComponent';

const ToolTipMenu = props => {
  const menuItemMapped = ({ action, menuOptions }) => {
    const item = {
      actionKey: action.id,
      actionTitle: action.text,
      actionOnPress: action.onPress,
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
  const previewQRCode = props.previewQRCode ?? false;
  const previewValue = props.previewValue;
  // eslint-disable-next-line react/prop-types
  const buttonStyle = props.buttonStyle;
  return isButton ? (
    <ContextMenuButton
      onPressMenuItem={({ nativeEvent }) => {
        props.onPress(nativeEvent.actionKey);
      }}
      isMenuPrimaryAction={isMenuPrimaryAction}
      menuConfig={{
        menuTitle,
        menuItems,
      }}
      style={buttonStyle}
    >
      {props.children}
    </ContextMenuButton>
  ) : (
    <ContextMenuView
      onPressMenuItem={({ nativeEvent }) => {
        props.onPress(nativeEvent.actionKey);
      }}
      menuConfig={{
        menuTitle,
        menuItems,
      }}
      {...(previewQRCode
        ? {
            previewConfig: {
              previewType: 'CUSTOM',
              backgroundColor: 'white',
            },
            renderPreview: () => <QRCodeComponent value={previewValue} isMenuAvailable={false} />,
          }
        : {})}
    >
      {props.children}
    </ContextMenuView>
  );
};

export default ToolTipMenu;
ToolTipMenu.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape).isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  onPress: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
  isButton: PropTypes.bool,
  previewQRCode: PropTypes.bool,
  previewValue: PropTypes.string,
};
