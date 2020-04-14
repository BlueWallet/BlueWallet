import React from 'react';
import { createBottomTabNavigator } from 'react-navigation';

import MainBottomTabs from '../../MainBottomTabs';
import { AddressBookNavigator } from './AddressBookNavigator';
import { BottomTabBarIcon, BottomTabBarComponent } from 'components';
import { images } from 'assets';
import { palette } from 'styles';
import { Route } from 'consts';

export const MainTabNavigator = createBottomTabNavigator(
  {
    [Route.Dashboard]: {
      screen: MainBottomTabs,
      navigationOptions: {
        title: 'Dashboard',
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.dashboard : images.dashboardInactive} />
        ),
      },
    },
    [Route.AddressBook]: {
      screen: AddressBookNavigator,
      navigationOptions: {
        title: 'Address book',
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.addressBook : images.addressBookInactive} />
        ),
      },
    },
    [Route.Settings]: {
      screen: AddressBookNavigator,
      navigationOptions: {
        title: 'Settings',
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.settings : images.settingsInactive} />
        ),
      },
    },
  },
  {
    tabBarComponent: props => <BottomTabBarComponent {...props} />,
    tabBarOptions: {
      activeTintColor: palette.secondary,
      inactiveTintColor: palette.textWhiteMuted,
    },
  },
);
