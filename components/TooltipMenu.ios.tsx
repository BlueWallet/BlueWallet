import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import { ContextMenuView, ContextMenuButton } from 'react-native-ios-context-menu';
import QRCodeComponent from './QRCodeComponent';
import { TouchableOpacity, StyleProp, ViewStyle } from 'react-native';

interface MenuItem {
  actionKey: any;
  actionTitle: any;
  icon: any;
  menuOptions: any;
  menuTitle: any;
  menuState: string;
  menuAttributes?: string[];
}

interface SubMenu {
  menuOptions: any;
  menuItems: MenuItem[];
  menuTitle: string;
}

interface ToolTipMenuProps {
  actions: any[];
  title?: string;
  children: React.ReactNode;
  onPressMenuItem: (actionKey: any) => void;
  isMenuPrimaryAction?: boolean;
  isButton?: boolean;
  previewQRCode?: boolean;
  onPress?: () => void;
  previewValue?: string;
  disabled?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
}

const ToolTipMenu: ForwardRefRenderFunction<ContextMenuView, ToolTipMenuProps> = (props, ref) => {
  const menuItemMapped = ({ action, menuOptions }: { action: any; menuOptions: any }): MenuItem => {
    const item: MenuItem = {
      actionKey: action.id,
      actionTitle: action.text,
      icon: action.icon,
      menuOptions,
      menuTitle: action.menuTitle,
      menuState: action.menuStateOn ? 'on' : 'off',
    };

    if (action.disabled) {
      item.menuAttributes = ['disabled'];
    } else {
      item.menuAttributes = undefined;
    }
    return item;
  };

  const menuItems = props.actions.map(action => {
    if (Array.isArray(action)) {
      const mapped = [];
      for (const actionToMap of action) {
        mapped.push(menuItemMapped({ action: actionToMap, menuOptions: undefined })); // pass object with both action and menuOptions
      }
      const submenu: SubMenu = {
        menuOptions: ['displayInline'],
        menuItems: mapped,
        menuTitle: '',
      };
      return submenu;
    } else {
      return menuItemMapped({ action, menuOptions: undefined }); // pass object with both action and menuOptions
    }
  });
  const menuTitle = props.title ?? '';
  const isButton = !!props.isButton;
  const isMenuPrimaryAction = props.isMenuPrimaryAction ? props.isMenuPrimaryAction : false;
  const previewQRCode = props.previewQRCode ?? false;
  const previewValue = props.previewValue;
  const disabled = props.disabled ?? false;
  const buttonStyle = props.buttonStyle;
  return isButton ? (
    <ContextMenuButton
      // @ts-ignore: ref is not defined in type
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
      useActionSheetFallback={false}
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
  ) : (
    // @ts-ignore: ref is not defined in type
    <ContextMenuView
      innerRef={ref}
      internalCleanupMode="viewController"
      useActionSheetFallback={false}
      onPressMenuItem={({ nativeEvent }) => {
        props.onPressMenuItem(nativeEvent.actionKey);
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
            renderPreview: () => previewValue && <QRCodeComponent value={previewValue} isMenuAvailable={false} />,
          }
        : {})}
    >
      {props.onPress ? (
        <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
          {props.children}
        </TouchableOpacity>
      ) : (
        props.children
      )}
    </ContextMenuView>
  );
};

export default ToolTipMenu;
