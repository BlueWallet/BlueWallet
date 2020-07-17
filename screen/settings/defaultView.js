import React, { useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueCard, BlueNavigationStyle, BlueListItemHooks, BlueTextHooks } from '../../BlueComponents';
import OnAppLaunch from '../../class/on-app-launch';
import { useNavigation } from '@react-navigation/native';
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
          title="View All Wallets"
          Component={TouchableWithoutFeedback}
          switch={{
            onValueChange: onViewAllWalletsSwitchValueChanged,
            value: viewAllWalletsEnabled,
            disabled: BlueApp.getWallets().length <= 0,
          }}
        />
        <BlueCard>
          <BlueTextHooks>When disabled, BlueWallet will immediately open the selected wallet at launch.</BlueTextHooks>
        </BlueCard>
        {!viewAllWalletsEnabled && (
          <BlueListItemHooks title="Default into" onPress={selectWallet} rightTitle={defaultWalletLabel} chevron />
        )}
      </View>
    </SafeBlueArea>
  );
};

DefaultView.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: 'On Launch',
});

export default DefaultView;
