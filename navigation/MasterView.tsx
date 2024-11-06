import React from 'react';
import MainRoot from '../navigation';
import DevMenu from '../components/DevMenu';
import { NavigationContainer, getStateFromPath } from '@react-navigation/native';
import { useColorScheme, DeviceEventEmitter, Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlueDarkTheme, BlueDefaultTheme } from '../components/themes';
import { navigationRef } from '../NavigationService';
import { useStorage } from '../hooks/context/useStorage';
import DeviceQuickActions from '../components/DeviceQuickActions';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';

const MasterView = () => {
  const { setIsNavigationReady } = useStorage();
  const colorScheme = useColorScheme();

  const linking = {
    prefixes: ['bluewallet://', 'blue:'],
    config: {
      screens: {
        WalletTransactions: {
          path: 'wallet/:walletID',
          parse: {
            walletID: (walletID) => walletID,
          },
        },
        ElectrumSettings: 'setelectrumserver',
        LightningSettings: 'setlndhuburl',
        AztecoRedeemRoot: 'azteco/redeem',
        ImportWallet: 'import/wallet',
      },
    },
    getInitialURL: async () => {
      const url = await Linking.getInitialURL();
      if (url) return url;

      const action = await DeviceQuickActions.popInitialShortcutAction();
      if (action && action.userInfo.url) {
        return action.userInfo.url;
      }
      return null;
    },
    subscribe: (listener) => {
      const onReceiveURL = ({ url }) => listener(url);
      const linkingSubscription = Linking.addEventListener('url', onReceiveURL);

      const shortcutSubscription = DeviceEventEmitter.addListener('quickActionShortcut', (data) => {
        if (data.userInfo.url) {
          listener(data.userInfo.url);
        }
      });

      return () => {
        linkingSubscription.remove();
        shortcutSubscription.remove();
      };
    },
    getStateFromPath(path, config) {
      if (DeeplinkSchemaMatch.hasSchema(path)) {
        const { navigateTo, params } = DeeplinkSchemaMatch.getNavigationDetails(path);
        return {
          routes: [{ name: navigateTo, params }],
        };
      }

      // Fallback to the default `getStateFromPath`
      return getStateFromPath(path, config);
    },
  };

  const onReady = () => {
    setIsNavigationReady(true);
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}
      onReady={onReady}
      linking={linking}
    >
      <SafeAreaProvider>
        <MainRoot />
      </SafeAreaProvider>
      {__DEV__ && <DevMenu />}
    </NavigationContainer>
  );
};

export default MasterView;