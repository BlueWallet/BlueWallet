import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';

import HeaderMenuButton from './HeaderMenuButton';
import { mapActionGroupsToNativeHeaderMenuItems, mapActionsToNativeHeaderMenuItems } from './nativeHeaderMenuItems';
import { Action } from './types';

type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;
type HeaderItemsGetter = NonNullable<NativeStackNavigationOptions['unstable_headerRightItems']>;

type HeaderMenuOptions = {
  headerRight: HeaderRightRenderer;
  unstable_headerRightItems: HeaderItemsGetter;
};

type HeaderMenuOptionsParams = {
  actions: Action[] | Action[][];
  onPressMenuItem: (id: string) => void;
  preserveGroups?: boolean;
  identifier?: string;
  title?: string;
};

export const createEllipsisHeaderMenuOptions = ({
  actions,
  onPressMenuItem,
  preserveGroups = false,
  identifier = 'HeaderMenuButton',
  title = '',
}: HeaderMenuOptionsParams): HeaderMenuOptions => {
  const hasGroups = Array.isArray(actions[0]);
  const nativeHeaderMenuItems = hasGroups
    ? mapActionGroupsToNativeHeaderMenuItems(actions as Action[][], onPressMenuItem, preserveGroups)
    : mapActionsToNativeHeaderMenuItems(actions as Action[], onPressMenuItem);

  return {
    headerRight: () => React.createElement(HeaderMenuButton, { onPressMenuItem, actions }),
    unstable_headerRightItems: () => [
      {
        type: 'menu',
        label: title,
        icon: { type: 'sfSymbol', name: 'ellipsis' },
        identifier,
        menu: {
          title,
          items: nativeHeaderMenuItems,
        },
      },
    ],
  };
};
