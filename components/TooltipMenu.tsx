import React, { useCallback, useMemo } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { MenuView, MenuAction, NativeActionEvent, MenuPreviewConfig } from '@react-native-menu/menu';
import { ToolTipMenuProps, Action } from './types';
import { useSettings } from '../hooks/context/useSettings';

const ToolTipMenu = (props: ToolTipMenuProps) => {
  const {
    title = '',
    isMenuPrimaryAction = false,
    disabled = false,
    onPress,
    buttonStyle,
    onPressMenuItem,
    children,
    isButton = false,
    renderPreview,
    ...restProps
  } = props;

  const { language } = useSettings();

  // Map Menu Items for RN Menu (supports subactions and displayInline)
  const mapMenuItemForMenuView = useCallback((action: Action): MenuAction | null => {
    if (!action.id) return null;

    // Check for subactions
    const subactions =
      action.subactions?.map(subaction => {
        const subMenuItem: MenuAction = {
          id: subaction.id.toString(),
          title: subaction.text,
          subtitle: subaction.subtitle,
          image: subaction.icon?.iconValue ? subaction.icon.iconValue : undefined,
          imageColor: subaction.imageColor,
          attributes: { disabled: subaction.disabled, destructive: subaction.destructive, hidden: subaction.hidden },
        };
        if ('menuState' in subaction) {
          if (typeof subaction.menuState === 'boolean') {
            subMenuItem.state = subaction.menuState ? 'on' : 'off';
          } else {
            subMenuItem.state = subaction.menuState;
          }
        }
        if (subaction.subactions && subaction.subactions.length > 0) {
          const deepSubactions = subaction.subactions.map(deepSub => {
            const deepMenuItem: MenuAction = {
              id: deepSub.id.toString(),
              title: deepSub.text,
              subtitle: deepSub.subtitle,
              image: deepSub.icon?.iconValue ? deepSub.icon.iconValue : undefined,
              imageColor: deepSub.imageColor,
              attributes: { disabled: deepSub.disabled, destructive: deepSub.destructive, hidden: deepSub.hidden },
            };
            if ('menuState' in deepSub) {
              if (typeof deepSub.menuState === 'boolean') {
                deepMenuItem.state = deepSub.menuState ? 'on' : 'off';
              } else {
                deepMenuItem.state = deepSub.menuState;
              }
            }
            return deepMenuItem;
          });
          subMenuItem.subactions = deepSubactions;
        }
        return subMenuItem;
      }) || [];

    const menuItem: MenuAction = {
      id: action.id.toString(),
      title: action.text,
      subtitle: action.subtitle,
      image: action.icon?.iconValue ? action.icon.iconValue : undefined,
      imageColor: action.imageColor,
      attributes: { disabled: action.disabled, destructive: action.destructive, hidden: action.hidden },
      displayInline: action.displayInline || false,
    };
    if ('menuState' in action) {
      if (typeof action.menuState === 'boolean') {
        menuItem.state = action.menuState ? 'on' : 'off';
      } else {
        menuItem.state = action.menuState;
      }
    }
    if (subactions.length > 0) {
      menuItem.subactions = subactions;
    }
    return menuItem;
  }, []);

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

  const handlePressMenuItemForMenuView = useCallback(
    ({ nativeEvent }: NativeActionEvent) => {
      onPressMenuItem(nativeEvent.event);
    },
    [onPressMenuItem],
  );

  // Setup preview config for iOS
  const previewConfig: MenuPreviewConfig | undefined = useMemo(() => {
    if (Platform.OS === 'ios' && renderPreview) {
      return {
        previewType: 'CUSTOM',
        previewSize: 'STRETCH'
      };
    }
    return undefined;
  }, [renderPreview]);
  
  // Setup event handlers for menu show/hide
  const handleMenuOpen = useCallback(() => {
    if (props.onMenuWillShow) {
      props.onMenuWillShow();
    }
  }, [props.onMenuWillShow]);

  const handleMenuClose = useCallback(() => {
    if (props.onMenuWillHide) {
      props.onMenuWillHide();
    }
  }, [props.onMenuWillHide]);

  const renderMenuView = () => {
    return (
      <MenuView
        title={title}
        isAnchoredToRight
        onPressAction={handlePressMenuItemForMenuView}
        onOpenMenu={handleMenuOpen}
        onCloseMenu={handleMenuClose}
        actions={Platform.OS === 'ios' ? menuViewItemsIOS : menuViewItemsAndroid}
        shouldOpenOnLongPress={!isMenuPrimaryAction}
        // Add preview support for iOS
        previewConfig={previewConfig}
        renderPreview={renderPreview}
        // @ts-ignore: Not exposed in types
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
        accessibilityRole={props.accessibilityRole}
        accessibilityLanguage={language}
      >
        {isMenuPrimaryAction || isButton ? (
          <TouchableOpacity style={buttonStyle} disabled={disabled} onPress={onPress} {...restProps}>
            {children}
          </TouchableOpacity>
        ) : (
          children
        )}
      </MenuView>
    );
  };

  return props.actions.length > 0 ? renderMenuView() : null;
};

export default ToolTipMenu;