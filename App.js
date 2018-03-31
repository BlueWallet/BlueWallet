import './shim.js';
import React from 'react';
import PropTypes from 'prop-types';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { DrawerNavigator, SafeAreaView } from 'react-navigation';
import MainBottomTabs from './MainBottomTabs';
import Selftest from './screen/selftest';
import About from './screen/about';

require('./BlueApp');

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

const pkg = require('./package.json');

// <DrawerItems {...props} />

const CustomDrawerContentComponent = props => (
  <ScrollView>
    <SafeAreaView
      style={styles.container}
      forceInset={{ top: 'always', horizontal: 'never' }}
    >
      <Text
        onPress={() => props.navigation.navigate('AddWallet')}
        style={styles.heading}
      >
        {' '}
        {pkg.name} v{pkg.version}
      </Text>
    </SafeAreaView>
  </ScrollView>
);

CustomDrawerContentComponent.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    flex: 1,
  },
  heading: {
    textAlign: 'center',
    color: 'black',
    fontWeight: 'bold',
    fontSize: 20,
  },
});

const TabsInDrawer = DrawerNavigator(
  {
    MainBottomTabs: {
      screen: MainBottomTabs,
      navigationOptions: {
        drawer: () => ({
          label: 'Tabs',
        }),
      },
    },
    Selftest: {
      screen: Selftest,
      navigationOptions: {},
    },
    About: {
      screen: About,
      navigationOptions: {},
    },
  },
  {
    contentComponent: CustomDrawerContentComponent,
    drawerOpenRoute: 'DrawerOpen',
    drawerCloseRoute: 'DrawerClose',
    drawerToggleRoute: 'DrawerToggle',
  },
);

export default TabsInDrawer;
