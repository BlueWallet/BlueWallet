import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueListItemHooks, BlueNavigationStyle } from '../../BlueComponents';
import { useNavigation, useTheme } from '@react-navigation/native';
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
        <BlueListItemHooks title={loc.settings.network_electrum} onPress={navigateToElectrumSettings} chevron />
        <BlueListItemHooks title={loc.settings.lightning_settings} onPress={navigateToLightningSettings} chevron />
        <BlueListItemHooks title={loc.settings.network_broadcast} onPress={navigateToBroadcast} chevron />
      </ScrollView>
    </SafeBlueArea>
  );
};
NetworkSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.network,
});
export default NetworkSettings;
