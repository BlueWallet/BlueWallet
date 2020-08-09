import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueListItemHooks, BlueNavigationStyle } from '../../BlueComponents';
import { useNavigation, useTheme } from '@react-navigation/native';
import loc from '../../loc';

const ToolSettings = () => {
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  const navigateToExportWallets = () => {
    navigate('ExportWalletsRoot');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueListItemHooks title={loc.settings.network_broadcast} onPress={navigateToBroadcast} chevron />
        <BlueListItemHooks title={loc.wallets.export_all_title} onPress={navigateToExportWallets} />
      </ScrollView>
    </SafeBlueArea>
  );
};

ToolSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.tools,
});
export default ToolSettings;
