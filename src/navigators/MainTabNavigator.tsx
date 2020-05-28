import React from 'react';
import { createBottomTabNavigator } from 'react-navigation';

import { images } from 'app/assets';
import { BottomTabBarIcon, BottomTabBarComponent } from 'app/components';
import { Route } from 'app/consts';
import { i18n } from 'app/locale';
import { ContactListScreen, DashboardScreen, SettingsScreen } from 'app/screens';
import { palette } from 'app/styles';

export const MainTabNavigator = createBottomTabNavigator(
  {
    [Route.Dashboard]: {
      screen: DashboardScreen,
      navigationOptions: {
        title: i18n.t('tabNavigator:dashboard'),
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.dashboard : images.dashboardInactive} />
        ),
      },
    },
    [Route.ContactList]: {
      screen: ContactListScreen,
      navigationOptions: {
        title: i18n.t('tabNavigator:addressBook'),
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <BottomTabBarIcon source={focused ? images.addressBook : images.addressBookInactive} />
        ),
      },
    },
    [Route.Settings]: {
      screen: SettingsScreen,
      navigationOptions: {
        title: i18n.t('tabNavigator:settings'),
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
