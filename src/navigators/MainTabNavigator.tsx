import React from 'react';
import { createBottomTabNavigator } from 'react-navigation';

import { images } from 'app/assets';
import { BottomTabBarIcon, BottomTabBarComponent } from 'app/components';
import { Route } from 'app/consts';
import i18n from 'app/locale';
import { ContactListScreen } from 'app/screens';
import { palette } from 'app/styles';

import { DashboardNavigator } from './DashboardNavigator';
import { SettingsNavigator } from './SettingsNavigator';

export const MainTabNavigator = createBottomTabNavigator(
  {
    [Route.Dashboard]: {
      screen: DashboardNavigator,
      navigationOptions: {
        title: 'Dashboard',
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.dashboard : images.dashboardInactive} />
        ),
      },
    },
    [Route.ContactList]: {
      screen: ContactListScreen,
      navigationOptions: {
        title: i18n.contactList.bottomNavigationLabel,
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.addressBook : images.addressBookInactive} />
        ),
      },
    },
    [Route.Settings]: {
      screen: SettingsNavigator,
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
      // @ts-ignore
      keyboardHidesTabBar: true,
      activeTintColor: palette.secondary,
      inactiveTintColor: palette.textWhiteMuted,
    },
  },
);
