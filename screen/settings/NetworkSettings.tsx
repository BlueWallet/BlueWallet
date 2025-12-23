import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import PlatformListItem from '../../components/PlatformListItem';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformStyles } from '../../theme/platformStyles';
import { useTheme } from '../../components/themes';

const NetworkSettings: React.FC = () => {
  const navigation = useExtendedNavigation();
  const { colors: platformColors, sizing, layout } = usePlatformStyles();
  const { colors } = useTheme();
  const isNotificationsCapable = Platform.OS !== 'web';

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
    itemContainer: {
      backgroundColor: platformColors.cardBackground,
    },
    firstItem: {
      borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
      borderTopRightRadius: sizing.containerBorderRadius * 1.5,
    },
    lastItemWithNotifications: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    lastItemWithoutNotifications: {
      borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
      borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
    },
    notificationsItem: {
      borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
      borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
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
          containerStyle={[styles.itemContainer, styles.firstItem]}
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
          containerStyle={styles.itemContainer}
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
          containerStyle={[
            styles.itemContainer,
            !isNotificationsCapable ? styles.lastItemWithoutNotifications : styles.lastItemWithNotifications,
          ]}
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
            containerStyle={[styles.itemContainer, styles.notificationsItem]}
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
