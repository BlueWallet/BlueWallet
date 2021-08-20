import React from 'react';
import { ContextMenuView } from 'react-native-ios-context-menu';
import PropTypes from 'prop-types';

const ToolTipMenu = (props, ref) => {
  const menuItems = props.actions.map(action => ({
    actionKey: action.id,
    actionTitle: action.text,
    actionOnPress: action.onPress,
    icon: action.icon,
    menuOptions: action.menuOptions,
    menuTitle: action.menuTitle,
  }));
  const menuTitle = props.title ?? '';
  const submenu = props.submenu;
  return (
    <ContextMenuView
      onPressMenuItem={({ nativeEvent }) => {
        props.onPress(nativeEvent.actionKey);
      }}
      menuConfig={{
        menuTitle,
        menuItems: menuItems.concat(submenu),
      }}
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
};
