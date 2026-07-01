import type { NativeStackHeaderItemMenuAction, NativeStackHeaderItemMenuSubmenu } from '@react-navigation/native-stack';

import { Action } from './types';

const toNativeState = (menuState: Action['menuState']): NativeStackHeaderItemMenuAction['state'] | undefined => {
  if (menuState === undefined) return undefined;
  if (menuState === 'mixed') return 'mixed';
  return menuState ? 'on' : 'off';
};

const mapAction = (action: Action): NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu | null => {
  if (action.hidden) return null;

  if (action.subactions && action.subactions.length > 0) {
    const items = action.subactions
      .map(mapAction)
      .filter((item): item is NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu => item !== null);

    if (items.length === 0) return null;

    return {
      type: 'submenu',
      label: action.text,
      inline: action.displayInline,
      destructive: action.destructive,
      items,
    };
  }

  return {
    type: 'action',
    label: action.text,
    description: action.subtitle,
    state: toNativeState(action.menuState),
    disabled: action.disabled,
    hidden: action.hidden,
    destructive: action.destructive,
    onPress: () => {
      // Placeholder; caller will inject handlers in mapActionsToNativeHeaderMenuItems.
    },
  };
};

export const mapActionsToNativeHeaderMenuItems = (
  actions: Action[],
  onPress: (id: string) => void,
): Array<NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu> => {
  const attachHandlers = (
    action: Action,
    item: NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu,
  ): NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu => {
    if (item.type === 'action') {
      return {
        ...item,
        onPress: () => onPress(String(action.id)),
      };
    }

    return {
      ...item,
      items: (action.subactions ?? [])
        .map(subaction => {
          const subitem = mapAction(subaction);
          if (!subitem) return null;
          return attachHandlers(subaction, subitem);
        })
        .filter((subitem): subitem is NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu => subitem !== null),
    };
  };

  return actions
    .map(action => {
      const mapped = mapAction(action);
      if (!mapped) return null;
      return attachHandlers(action, mapped);
    })
    .filter((item): item is NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu => item !== null);
};
