import React, { useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeBlueArea, BlueCard, BlueNavigationStyle, BlueListItemHooks, BlueTextHooks } from '../../BlueComponents';
import OnAppLaunch from '../../class/on-app-launch';
import loc from '../../loc';
const BlueApp = require('../../BlueApp');

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const DefaultView = () => {
  const [defaultWalletLabel, setDefaultWalletLabel] = useState('');
  const [viewAllWalletsEnabled, setViewAllWalletsEnabled] = useState(true);
  const { navigate, pop } = useNavigation();

  useEffect(() => {
    (async () => {
      const viewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
      let defaultWalletLabel = '';
      const wallet = await OnAppLaunch.getSelectedDefaultWallet();
      if (wallet) {
        defaultWalletLabel = wallet.getLabel();
      }
      setDefaultWalletLabel(defaultWalletLabel);
      setViewAllWalletsEnabled(viewAllWalletsEnabled);
    })();
  });

  const onViewAllWalletsSwitchValueChanged = async value => {
    await OnAppLaunch.setViewAllWalletsEnabled(value);
    if (value) {
      setViewAllWalletsEnabled(true);
      setDefaultWalletLabel('');
    } else {
      const selectedWallet = await OnAppLaunch.getSelectedDefaultWallet();
      setDefaultWalletLabel(selectedWallet.getLabel());
      setViewAllWalletsEnabled(false);
    }
  };

  const selectWallet = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged });
  };

  const onWalletSelectValueChanged = async wallet => {
    await OnAppLaunch.setViewAllWalletsEnabled(false);
    await OnAppLaunch.setSelectedDefaultWallet(wallet.getID());
    setDefaultWalletLabel(wallet.getLabel());
    setViewAllWalletsEnabled(false);
    pop();
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.flex}>
      <View>
        <BlueListItemHooks
          title={loc.settings.default_wallets}
          Component={TouchableWithoutFeedback}
          switch={{
            onValueChange: onViewAllWalletsSwitchValueChanged,
            value: viewAllWalletsEnabled,
            disabled: BlueApp.getWallets().length <= 0,
          }}
        />
        <BlueCard>
          <BlueTextHooks>{loc.settings.default_desc}</BlueTextHooks>
        </BlueCard>
        {!viewAllWalletsEnabled && (
          <BlueListItemHooks title={loc.settings.default_info} onPress={selectWallet} rightTitle={defaultWalletLabel} chevron />
        )}
      </View>
    </SafeBlueArea>
  );
};

DefaultView.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.default_title,
});

export default DefaultView;
