/* eslint-disable */
import type { Element } from 'react';
import { Text, TouchableNativeFeedback, TouchableWithoutFeedback, View, findNodeHandle, UIManager } from 'react-native';

type PopupMenuItem = { id?: any; label: string };
type OnPopupMenuItemSelect = (selectedPopupMenuItem: PopupMenuItem) => void;
type PopupAnchor = Element<typeof Text | typeof TouchableNativeFeedback | typeof TouchableWithoutFeedback | typeof View>;
type PopupMenuOptions = { onCancel?: () => void };

function showPopupMenu(
  items: PopupMenuItem[],
  onSelect: OnPopupMenuItemSelect,
  anchor: PopupAnchor,
  { onCancel }: PopupMenuOptions = {},
): void {
  UIManager.showPopupMenu(
    findNodeHandle(anchor),
    items.map(item => item.label),
    function (err) {
      if (onCancel) onCancel();
    },
    function (eventName: 'dismissed' | 'itemSelected', selectedIndex?: number) {
      if (eventName === 'itemSelected') onSelect(items[selectedIndex]);
      else onCancel && onCancel();
    },
  );
}

export type { PopupMenuItem, OnPopupMenuItemSelect, PopupMenuOptions };
export default showPopupMenu;
