import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem } from '../../BlueComponents';
import loc from '../../loc';

const NetworkSettings = () => {
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  const navigateToElectrumSettings = () => {
    navigate('ElectrumSettings');
  };

  const navigateToLightningSettings = () => {
    navigate('LightningSettings');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueListItem title={loc.settings.network_electrum} onPress={navigateToElectrumSettings} chevron />
        <BlueListItem title={loc.settings.lightning_settings} onPress={navigateToLightningSettings} chevron />
        <BlueListItem title={loc.settings.network_broadcast} onPress={navigateToBroadcast} chevron />
      </ScrollView>
    </SafeBlueArea>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.network }));

export default NetworkSettings;
