import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueListItemHooks, BlueNavigationStyle, BlueLoadingHook } from '../../BlueComponents';
import { useNavigation, useTheme } from '@react-navigation/native';
const loc = require('../../loc');
const NetworkSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const navigateToElectrumSettings = () => {
    navigate('ElectrumSettings');
  };

  const navigateToLightningSettings = () => {
    navigate('LightningSettings');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };
  return isLoading ? (
    <BlueLoadingHook />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueListItemHooks title="Electrum server" onPress={navigateToElectrumSettings} chevron />
        <BlueListItemHooks title={loc.settings.lightning_settings} onPress={navigateToLightningSettings} chevron />
        <BlueListItemHooks title="Broadcast transaction" onPress={navigateToBroadcast} chevron />
      </ScrollView>
    </SafeBlueArea>
  );
};
NetworkSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: 'Network',
});
export default NetworkSettings;
