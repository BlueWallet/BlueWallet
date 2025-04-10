import React from 'react';
import { View, StyleSheet } from 'react-native';
import { isNotificationsCapable } from '../../blue_modules/notifications';
import PlatformListItem from '../../components/PlatformListItem';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../components/platformThemes';
import { useTheme } from '../../components/themes';

const NetworkSettings: React.FC = () => {
  const navigation = useExtendedNavigation();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: 16,
      marginBottom: sizing.sectionContainerMarginBottom,
    },
  });

  const navigateToElectrumSettings = () => {
    navigation.navigate('ElectrumSettings');
  };

  const navigateToLightningSettings = () => {
    navigation.navigate('LightningSettings');
  };

  const navigateToBlockExplorerSettings = () => {
    navigation.navigate('SettingsBlockExplorer');
  };

  const navigateToNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  return (
    <SafeAreaScrollView style={styles.container}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.block_explorer}
          leftIcon={{
            type: layout.iconType,
            name: 'search',
            color: colors.buttonAlternativeTextColor,
            backgroundColor: platformColors.blueIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={navigateToBlockExplorerSettings}
          testID="BlockExplorerSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.network_electrum}
          leftIcon={{
            type: layout.iconType,
            name: 'server',
            color: colors.successColor,
            backgroundColor: platformColors.greenIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={navigateToElectrumSettings}
          testID="ElectrumSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
        />
        <PlatformListItem
          title={loc.settings.lightning_settings}
          leftIcon={{
            type: layout.iconType,
            name: 'flash',
            color: colors.lnborderColor,
            backgroundColor: platformColors.yellowIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={navigateToLightningSettings}
          testID="LightningSettings"
          chevron
          bottomDivider={layout.showBorderBottom && isNotificationsCapable}
          isLast={!isNotificationsCapable}
        />
        {isNotificationsCapable && (
          <PlatformListItem
            title={loc.settings.notifications}
            leftIcon={{
              type: layout.iconType,
              name: 'notifications',
              color: colors.redText,
              backgroundColor: platformColors.redIconBg,
            }}
            containerStyle={{
              backgroundColor: platformColors.cardBackground,
            }}
            onPress={navigateToNotificationSettings}
            testID="NotificationSettings"
            chevron
            bottomDivider={layout.showBorderBottom}
            isLast
          />
        )}
      </View>
    </SafeAreaScrollView>
  );
};

export default NetworkSettings;
