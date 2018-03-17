/**
 * @flow
 */

import React from 'react';
import { Button, ScrollView } from 'react-native';
import { SafeAreaView, StackNavigator, TabNavigator } from 'react-navigation';
import PropTypes from 'prop-types';

import Ionicons from 'react-native-vector-icons/Ionicons';

const MyNavScreen = ({ navigation, banner }) => (
  <ScrollView>
    <SafeAreaView forceInset={{ horizontal: 'always' }}>
      <SampleText>{banner}</SampleText>
      <Button
        onPress={() => navigation.navigate('Profile', { name: 'Jordan' })}
        title="Open profile screen"
      />
      <Button
        onPress={() => navigation.navigate('NotifSettings')}
        title="Open notifications screen"
      />
      <Button
        onPress={() => navigation.navigate('SettingsTab')}
        title="Go to settings tab"
      />
      <Button onPress={() => navigation.goBack(null)} title="Go back" />
    </SafeAreaView>
  </ScrollView>
);

MyNavScreen.propTypes = {
  banner: PropTypes.string,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

const MyHomeScreen = ({ navigation }) => (
  <MyNavScreen banner="Home Screen" navigation={navigation} />
);

MyHomeScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

const MyNotificationsSettingsScreen = ({ navigation }) => (
  <MyNavScreen banner="Notifications Screen" navigation={navigation} />
);

MyNotificationsSettingsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

const MySettingsScreen = ({ navigation }) => (
  <MyNavScreen banner="Settings Screen" navigation={navigation} />
);

MySettingsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

var bitcoin = require('bitcoinjs-lib');
var myString = bitcoin.ECPair.makeRandom().toWIF();

const tabBarIconMainTab = ({ tintColor, focused }) => (
  <Ionicons
    name={focused ? 'ios-home' : 'ios-home-outline'}
    size={26}
    style={{ color: tintColor }}
  />
);

tabBarIconMainTab.propTypes = {
  tintColor: PropTypes.string,
  focused: PropTypes.boolean,
};

const tabBarIconSettingsTab = ({ tintColor, focused }) => (
  <Ionicons
    name={focused ? 'ios-settings' : 'ios-settings-outline'}
    size={26}
    style={{ color: tintColor }}
  />
);

tabBarIconSettingsTab.propTypes = {
  tintColor: PropTypes.string,
  focused: PropTypes.boolean,
};

const TabNav = TabNavigator(
  {
    MainTab: {
      screen: MyHomeScreen,
      path: '/',
      navigationOptions: {
        title: 'Welcome1 ' + myString,
        tabBarLabel: 'Transactions',
        tabBarIcon: tabBarIconMainTab,
      },
    },
    SettingsTab: {
      screen: MySettingsScreen,
      path: '/settings',
      navigationOptions: {
        title: 'Settings',
        tabBarIcon: tabBarIconSettingsTab,
      },
    },
  },
  {
    tabBarPosition: 'bottom',
    animationEnabled: false,
    swipeEnabled: false,
  },
);

const SecondaryBottomTabs = StackNavigator({
  Root: {
    screen: TabNav,
  },
  NotifSettings: {
    screen: MyNotificationsSettingsScreen,
    navigationOptions: {
      title: 'Notifications',
    },
  },
});

export default SecondaryBottomTabs;
