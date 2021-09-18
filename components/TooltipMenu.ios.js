import React from 'react';
import { ContextMenuView, ContextMenuButton } from 'react-native-ios-context-menu';
import PropTypes from 'prop-types';
import QRCodeComponent from './QRCodeComponent';

const ToolTipMenu = props => {
  const menuItems = props.actions.map(action => {
    const item = {
      actionKey: action.id,
      actionTitle: action.text,
      actionOnPress: action.onPress,
      icon: action.icon,
      menuOptions: action.menuOptions,
      menuTitle: action.menuTitle,
    };
    item.menuState = action.menuStateOn ? 'on' : 'off';

    if (action.disabled) {
      item.menuAttributes = ['disabled'];
    }
    return item;
  });
  const menuTitle = props.title ?? '';
  const submenu = props.submenu;
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
        menuItems: menuItems.concat(submenu),
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
        menuItems: menuItems.concat(submenu),
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
  submenu: PropTypes.object,
  children: PropTypes.node.isRequired,
  onPress: PropTypes.func.isRequired,
  isMenuPrimaryAction: PropTypes.bool,
  isButton: PropTypes.bool,
  previewQRCode: PropTypes.bool,
  previewValue: PropTypes.string,
};
