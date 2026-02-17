import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, Platform, TouchableOpacity } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import { ToolTipMenuProps, Action } from './types';
import { useSettings } from '../hooks/context/useSettings';

type ContextMenuAction = {
  title: string;
  subtitle?: string;
  systemIcon?: string;
  icon?: string;
  iconColor?: string;
  destructive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  inlineChildren?: boolean;
  actions?: ContextMenuAction[];
};

type MenuNode = {
  id: string;
  actions?: MenuNode[];
};

type ContextMenuPressEvent = {
  nativeEvent: {
    index: number;
    indexPath?: number[];
  };
};

const normalizeTopLevelActions = (actions: Action[] | Action[][]): Action[] => {
  return actions.flatMap(actionGroup => (Array.isArray(actionGroup) ? actionGroup : [actionGroup]));
};

const isAndroidDrawable = (iconValue?: string) => Boolean(iconValue && iconValue.startsWith('ic_'));

const mapActionsToContextMenu = (
  actions: Action[],
  platform: 'ios' | 'android',
  depth = 0,
): { menuActions: ContextMenuAction[]; menuNodes: MenuNode[] } => {
  const menuActions: ContextMenuAction[] = [];
  const menuNodes: MenuNode[] = [];

  for (const action of actions) {
    if (!action || action.hidden || !action.id) continue;

    const hasInlineGroupWithoutTitle = Boolean(action.displayInline && !action.text && action.subactions?.length);
    if (hasInlineGroupWithoutTitle && depth === 0) {
      const mappedGroup = mapActionsToContextMenu(action.subactions ?? [], platform, depth);
      menuActions.push(...mappedGroup.menuActions);
      menuNodes.push(...mappedGroup.menuNodes);
      continue;
    }

    const iconValue = action.icon?.iconValue;
    const systemIcon = platform === 'ios' ? iconValue : undefined;
    const icon = platform === 'android' && isAndroidDrawable(iconValue) ? iconValue : undefined;

    const menuAction: ContextMenuAction = {
      title: action.text,
      subtitle: action.subtitle,
      systemIcon,
      icon,
      destructive: action.destructive,
      disabled: action.disabled,
      selected: action.menuState === true,
      inlineChildren: action.displayInline || false,
    };

    const menuNode: MenuNode = { id: action.id.toString() };

    if (action.subactions && action.subactions.length > 0 && depth === 0) {
      const mappedChildren = mapActionsToContextMenu(action.subactions, platform, depth + 1);
      if (mappedChildren.menuActions.length > 0) {
        menuAction.actions = mappedChildren.menuActions;
        menuNode.actions = mappedChildren.menuNodes;
      }
    }

    menuActions.push(menuAction);
    menuNodes.push(menuNode);
  }

  return { menuActions, menuNodes };
};

const resolveMenuActionId = (menuNodes: MenuNode[], indexPath: number[]): string | null => {
  let currentNodes = menuNodes;
  let currentNode: MenuNode | undefined;

  for (const index of indexPath) {
    currentNode = currentNodes[index];
    if (!currentNode) return null;
    currentNodes = currentNode.actions ?? [];
  }

  return currentNode?.id ?? null;
};

const MenuView = (props: ToolTipMenuProps) => {
  const {
    title = '',
    isMenuPrimaryAction = false,
    disabled = false,
    onPress,
    buttonStyle,
    onPressMenuItem,
    onMenuWillShow,
    onMenuWillHide,
    renderPreview,
    children,
    isButton = false,
    ...restProps
  } = props;

  const { language } = useSettings();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (isMenuPrimaryAction) {
      onMenuWillShow?.();
    }
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }, [isMenuPrimaryAction, onMenuWillShow, scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const normalizedActions = useMemo(() => normalizeTopLevelActions(props.actions), [props.actions]);

  const { menuActions, menuNodes } = useMemo(() => {
    return mapActionsToContextMenu(normalizedActions, Platform.OS === 'ios' ? 'ios' : 'android');
  }, [normalizedActions]);

  const handlePressMenuItemForMenuView = useCallback(
    ({ nativeEvent }: ContextMenuPressEvent) => {
      const indexPath = nativeEvent.indexPath ?? [nativeEvent.index];
      const actionId = resolveMenuActionId(menuNodes, indexPath);
      if (actionId) {
        onPressMenuItem(actionId);
      }
      onMenuWillHide?.();
    },
    [menuNodes, onMenuWillHide, onPressMenuItem],
  );

  const handleCancelMenu = useCallback(() => {
    onMenuWillHide?.();
  }, [onMenuWillHide]);

  const renderMenuView = () => {
    return (
      <ContextMenu
        title={title}
        onPress={handlePressMenuItemForMenuView}
        onCancel={handleCancelMenu}
        actions={menuActions}
        preview={!isMenuPrimaryAction && renderPreview ? renderPreview() : undefined}
        dropdownMenuMode={isMenuPrimaryAction}
        disabled={disabled}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
        accessibilityRole={props.accessibilityRole}
        accessibilityLanguage={language}
      >
        {isMenuPrimaryAction || isButton ? (
          <TouchableOpacity
            style={buttonStyle}
            disabled={disabled}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            {...restProps}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>
          </TouchableOpacity>
        ) : (
          children
        )}
      </ContextMenu>
    );
  };

  return menuActions.length > 0 ? renderMenuView() : null;
};

export default MenuView;
