import React, { useMemo } from 'react';
import { StyleSheet, View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  // Standard Android header is 56dp + status bar height
  // For older Android versions, use a fallback if StatusBar.currentHeight is not available
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
      marginBottom: sizing.sectionContainerMarginBottom,
    },
    itemContainer: {
      backgroundColor: platformColors.cardBackground,
      marginHorizontal: 0,
    },
    lastItemWithNotifications: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
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
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer} headerHeight={headerHeight}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.block_explorer}
          leftIcon={{
            type: 'font-awesome-5',
            name: 'search',
            color: colors.buttonAlternativeTextColor,
            backgroundColor: platformColors.blueIconBg,
          }}
          containerStyle={[
            styles.itemContainer,
            layout.showBorderRadius && {
              borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
              borderTopRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
          onPress={navigateToBlockExplorerSettings}
          testID="BlockExplorerSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />

        <PlatformListItem
          title={loc.settings.network_electrum}
          leftIcon={{
            type: 'font-awesome-5',
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
            type: 'font-awesome-5',
            name: 'bolt',
            color: colors.lnborderColor,
            backgroundColor: platformColors.yellowIconBg,
          }}
          containerStyle={[
            styles.itemContainer,
            !isNotificationsCapable
              ? layout.showBorderRadius && {
                  borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
                  borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
                }
              : styles.lastItemWithNotifications,
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
              type: 'font-awesome-5',
              name: 'bell',
              color: colors.redText,
              backgroundColor: platformColors.redIconBg,
            }}
            containerStyle={[
              styles.itemContainer,
              layout.showBorderRadius && {
                borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
                borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
              },
            ]}
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
