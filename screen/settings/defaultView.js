import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueCard, BlueListItem, BlueText } from '../../BlueComponents';
import OnAppLaunch from '../../class/on-app-launch';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const DefaultView = () => {
  const [defaultWalletLabel, setDefaultWalletLabel] = useState('');
  const [viewAllWalletsEnabled, setViewAllWalletsEnabled] = useState(true);
  const { navigate, pop } = useNavigation();
  const { wallets } = useContext(BlueStorageContext);

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
        <BlueListItem
          title={loc.settings.default_wallets}
          Component={TouchableWithoutFeedback}
          switch={{
            onValueChange: onViewAllWalletsSwitchValueChanged,
            value: viewAllWalletsEnabled,
            disabled: wallets.length <= 0,
          }}
        />
        <BlueCard>
          <BlueText>{loc.settings.default_desc}</BlueText>
        </BlueCard>
        {!viewAllWalletsEnabled && (
          <BlueListItem title={loc.settings.default_info} onPress={selectWallet} rightTitle={defaultWalletLabel} chevron />
        )}
      </View>
    </SafeBlueArea>
  );
};

DefaultView.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.default_title }));

export default DefaultView;
