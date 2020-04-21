import React from 'react';
import { createBottomTabNavigator } from 'react-navigation';

import { images } from 'app/assets';
import { BottomTabBarIcon, BottomTabBarComponent } from 'app/components';
import { Route } from 'app/consts';
import i18n from 'app/locale';
import { ContactListScreen } from 'app/screens';
import { palette } from 'app/styles';

import MainBottomTabs from '../../MainBottomTabs';
import SettingsScreen from '../../screen/settings/settings';

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
      screen: SettingsScreen,
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
