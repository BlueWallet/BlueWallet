import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';

import HeaderMenuButton from './HeaderMenuButton';
import { mapActionGroupsToNativeHeaderMenuItems, mapActionsToNativeHeaderMenuItems } from './nativeHeaderMenuItems';
import { Action } from './types';
import loc from '../loc';

type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;
type HeaderItemsGetter = NonNullable<NativeStackNavigationOptions['unstable_headerRightItems']>;

type HeaderMenuOptions = {
  headerRight: HeaderRightRenderer;
  unstable_headerRightItems: HeaderItemsGetter;
};

type HeaderMenuOptionsParams = {
  actions: Action[] | Action[][];
  onPressMenuItem: (id: string) => void;
  disabled?: boolean;
  preserveGroups?: boolean;
  identifier?: string;
  title?: string;
  accessibilityLabel?: string;
};

export const createEllipsisHeaderMenuOptions = ({
  actions,
  onPressMenuItem,
  disabled = false,
  preserveGroups = false,
  identifier = 'HeaderMenuButton',
  title = '',
  accessibilityLabel,
}: HeaderMenuOptionsParams): HeaderMenuOptions => {
  const resolvedAccessibilityLabel = accessibilityLabel || title || loc.wallets.more_info;
  const hasGroups = Array.isArray(actions[0]);
  const nativeHeaderMenuItems = hasGroups
    ? mapActionGroupsToNativeHeaderMenuItems(actions as Action[][], onPressMenuItem, preserveGroups)
    : mapActionsToNativeHeaderMenuItems(actions as Action[], onPressMenuItem);

  return {
    headerRight: () =>
      React.createElement(HeaderMenuButton, { onPressMenuItem, actions, disabled, title, accessibilityLabel: resolvedAccessibilityLabel }),
    unstable_headerRightItems: () => [
      {
        type: 'menu',
        label: title,
        icon: { type: 'sfSymbol', name: 'ellipsis' },
        identifier,
        accessibilityLabel: resolvedAccessibilityLabel,
        menu: {
          title,
          items: nativeHeaderMenuItems,
        },
      },
    ],
  };
};
