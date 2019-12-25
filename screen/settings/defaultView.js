import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem } from '../../BlueComponents';
import OnAppLaunch from '../../class/onAppLaunch';
import { useNavigation } from 'react-navigation-hooks';
const BlueApp = require('../../BlueApp');

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
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
      <View>
        <BlueListItem
          title="View All Wallets"
          hideChevron
          switchButton
          swithchEnabled={BlueApp.getWallets().length > 0}
          switched={viewAllWalletsEnabled}
          onSwitch={onViewAllWalletsSwitchValueChanged}
        />
        {!viewAllWalletsEnabled && (
          <BlueListItem title="Default into" component={TouchableOpacity} onPress={selectWallet} rightTitle={defaultWalletLabel} />
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
