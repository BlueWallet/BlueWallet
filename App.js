import './shim.js';
import React from 'react';
import PropTypes from 'prop-types';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { createDrawerNavigator, SafeAreaView } from 'react-navigation';
import MainBottomTabs from './MainBottomTabs';
import Selftest from './screen/selftest';
import About from './screen/settings/about';
import PlausibleDeniability from './screen/plausibledeniability';
import Sentry from 'sentry-expo';


Sentry.enableInExpoDevelopment = true; // TODO: Remove this once Sentry is correctly setup.
Sentry.config('https://23377936131848ca8003448a893cb622@sentry.io/1295736').install();

/** @type {AppStorage} */
require('./BlueApp');

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

const pkg = require('./package.json');
const appjson = require('./app.json');

// <DrawerItems {...props} />

const CustomDrawerContentComponent = props => (
  <ScrollView>
    <SafeAreaView style={styles.container} forceInset={{ top: 'always', horizontal: 'never' }}>
      <Text onPress={() => props.navigation.navigate('About')} style={styles.heading}>
        {' '}
        {pkg.name} v{pkg.version} (build {appjson.expo.ios.buildNumber})
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

const TabsInDrawer = createDrawerNavigator(
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
    PlausibleDeniability: {
      screen: PlausibleDeniability,
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
