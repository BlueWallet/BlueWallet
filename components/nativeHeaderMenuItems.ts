import { Action } from './types';
import type { NativeStackHeaderItemMenuAction, NativeStackHeaderItemMenuSubmenu } from '@react-navigation/native-stack';

type NativeHeaderMenuItem = NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu;

const toNativeState = (menuState: Action['menuState']): 'on' | 'off' | 'mixed' | undefined => {
  if (menuState === undefined) {
    return undefined;
  }
  if (menuState === 'mixed') {
    return 'mixed';
  }
  return menuState ? 'on' : 'off';
};

const toNativeIcon = (iconValue?: string): { type: 'sfSymbol'; name: string } | undefined => {
  if (!iconValue) {
    return undefined;
  }

  // Android drawable names (e.g. ic_menu_camera) are invalid SF Symbols.
  if (iconValue.startsWith('ic_')) {
    return undefined;
  }

  return { type: 'sfSymbol', name: iconValue };
};

const mapActionToNativeItem = (action: Action, onPressMenuItem: (id: string) => void): NativeHeaderMenuItem | null => {
  if (!action || action.hidden || action.id === undefined || action.id === null) {
    return null;
  }

  const id = String(action.id);
  const subItems = (action.subactions ?? [])
    .map(subaction => mapActionToNativeItem(subaction, onPressMenuItem))
    .filter((item): item is NativeHeaderMenuItem => item !== null);

  if (subItems.length > 0) {
    return {
      type: 'submenu',
      label: action.text,
      inline: action.displayInline,
      items: subItems,
    };
  }

  return {
    type: 'action',
    label: action.text,
    description: action.subtitle,
    icon: toNativeIcon(action.icon?.iconValue ?? action.image) as NativeStackHeaderItemMenuAction['icon'],
    onPress: () => onPressMenuItem(id),
    state: toNativeState(action.menuState),
    destructive: Boolean(action.destructive),
    disabled: Boolean(action.disabled),
  };
};

export const mapActionsToNativeHeaderMenuItems = (actions: Action[], onPressMenuItem: (id: string) => void): NativeHeaderMenuItem[] => {
  return actions
    .map(action => mapActionToNativeItem(action, onPressMenuItem))
    .filter((item): item is NativeHeaderMenuItem => item !== null);
};
