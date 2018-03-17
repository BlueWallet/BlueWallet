/** @type {AppStorage} */
import './shim.js'
import React from 'react'
import { Text, ScrollView, StyleSheet } from 'react-native'
import { DrawerNavigator, SafeAreaView } from 'react-navigation'
import MainBottomTabs from './MainBottomTabs'

require('./BlueApp')

if (!Error.captureStackTrace) { // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {}
}

const pkg = require('./package.json')

// <DrawerItems {...props} />

const CustomDrawerContentComponent = (props) => (
  <ScrollView>
    <SafeAreaView style={styles.container} forceInset={{ top: 'always', horizontal: 'never' }}>

      <Text onPress={() => props.navigation.navigate('AddWallet')} style={styles.heading}> {pkg.name} v{pkg.version}</Text>
    </SafeAreaView>
  </ScrollView>
)

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    flex: 1
  },
  heading: {
    textAlign: 'center',
    color: 'black',
    fontWeight: 'bold',
    fontSize: 20
  }
})

/* import scanQrWifLegacyAddress from './screen/wallets/scanQrWifLegacyAddress'
import scanQrWifSegwitP2SHAddress from './screen/wallets/scanQrWifSegwitP2SHAddress' */

const TabsInDrawer = DrawerNavigator({
  MainBottomTabs: {
    screen: MainBottomTabs,
    navigationOptions: {
      drawer: () => ({
        label: 'Tabs'
      })
    }
  }

  /* SecondaryBottomTabs: {
    screen: SecondaryBottomTabs,
    path: 'chat/aaa',
    navigationOptions: {
      drawer: () => ({
        label: 'SecondaryBottomTabs',
        icon: ({ tintColor }) => (
          <MaterialIcons
            name="filter-2"
            size={24}
            style={{ color: tintColor }}
          />
        ),
      }),
    },
  }, */

}, {
  contentComponent: CustomDrawerContentComponent,
  drawerOpenRoute: 'DrawerOpen',
  drawerCloseRoute: 'DrawerClose',
  drawerToggleRoute: 'DrawerToggle'

})

export default TabsInDrawer
