import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { BlueCard, BlueText } from '../../BlueComponents';
import OnAppLaunch from '../../class/on-app-launch';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import ListItem from '../../components/ListItem';

const DefaultView = () => {
  const [defaultWalletLabel, setDefaultWalletLabel] = useState('');
  const [viewAllWalletsEnabled, setViewAllWalletsEnabled] = useState(true);
  const { navigate, pop } = useNavigation();
  const { wallets } = useContext(BlueStorageContext);

  useEffect(() => {
    (async () => {
      const newViewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
      let newDefaultWalletLabel = '';
      const wallet = await OnAppLaunch.getSelectedDefaultWallet();
      if (wallet) {
        newDefaultWalletLabel = wallet.getLabel();
      }
      setDefaultWalletLabel(newDefaultWalletLabel);
      setViewAllWalletsEnabled(newViewAllWalletsEnabled);
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
    <ScrollView automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <View>
        <ListItem
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
          <ListItem title={loc.settings.default_info} onPress={selectWallet} rightTitle={defaultWalletLabel} chevron />
        )}
      </View>
    </ScrollView>
  );
};

DefaultView.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.default_title }));

export default DefaultView;
