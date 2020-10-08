import React, { useRef } from 'react';
import { StatusBar, View, TouchableOpacity, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { WalletsCarousel, BlueNavigationStyle, BlueHeaderDefaultMainHooks } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { AppStorage, PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import * as NavigationService from '../../NavigationService';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { useTheme, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
const EV = require('../../blue_modules/events');
const BlueApp: AppStorage = require('../../BlueApp');

const DrawerList = props => {
  console.log('drawerList rendering...');
  const walletsCarousel = useRef();
  const wallets = useRoute().params?.wallets || BlueApp.getWallets() || [];
  const height = useWindowDimensions().height;
  const { colors } = useTheme();
  const { selectedWallet } = useRoute().params || '';
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.brandingColor,
    },
  });

  const handleClick = index => {
    console.log('click', index);
    const wallet = BlueApp.wallets[index];
    if (wallet) {
      if (wallet.type === PlaceholderWallet.type) {
        Alert.alert(
          loc.wallets.add_details,
          loc.wallets.list_import_problem,
          [
            {
              text: loc.wallets.details_delete,
              onPress: () => {
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'destructive',
            },
            {
              text: loc.wallets.list_tryagain,
              onPress: () => {
                props.navigation.navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: wallet.getSecret() } });
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'default',
            },
          ],
          { cancelable: false },
        );
      } else {
        props.navigation.navigate('WalletTransactions', {
          wallet: wallet,
          key: `WalletTransactions-${wallet.getID()}`,
        });
      }
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      if (!BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
        props.navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
      }
    }
  };

  const handleLongPress = () => {
    if (BlueApp.getWallets().length > 1 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        removeClippedSubviews={false}
        data={wallets.concat(false)}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        testID="WalletsList"
        vertical
        itemHeight={190}
        sliderHeight={height}
        contentContainerCustomStyle={styles.contentContainerCustomStyle}
        inactiveSlideOpacity={1.0}
        selectedWallet={selectedWallet}
      />
    );
  };

  return (
    <DrawerContentScrollView {...props} scrollEnabled={false}>
      <View styles={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="default" />
        <SafeAreaView style={styles.root}>
          <BlueHeaderDefaultMainHooks
            leftText={loc.wallets.list_title}
            onNewWalletPress={
              !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)
                ? () => props.navigation.navigate('AddWalletRoot')
                : null
            }
          />
        </SafeAreaView>
        {renderWalletsCarousel()}
      </View>
    </DrawerContentScrollView>
  );
};

export default DrawerList;
const styles = StyleSheet.create({
  contentContainerCustomStyle: {
    paddingRight: 10,
    paddingLeft: 20,
  },
  root: {
    flex: 1,
  },
  headerTouch: {
    height: 48,
    paddingRight: 16,
    paddingLeft: 32,
    paddingVertical: 10,
  },
});

DrawerList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    addListener: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.object,
  }),
};

DrawerList.navigationOptions = ({ navigation }) => {
  return {
    ...BlueNavigationStyle(navigation, true),
    title: '',
    headerStyle: {
      backgroundColor: BlueCurrentTheme.colors.customHeader,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerRight: () => (
      <TouchableOpacity testID="SettingsButton" style={styles.headerTouch} onPress={() => NavigationService.navigate('Settings')}>
        <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueCurrentTheme.colors.foregroundColor} />
      </TouchableOpacity>
    ),
  };
};
