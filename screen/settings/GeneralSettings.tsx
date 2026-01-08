import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, ListRenderItem, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
import { usePlatformStyles } from '../../theme/platformStyles';

enum SettingsPrivacySection {
  None,
  All,
  ReadClipboard,
  QuickActions,
  Widget,
  TemporaryScreenshots,
  TotalBalance,
}

interface SettingItem {
  id: string;
  title: string;
  onPress?: () => void;
  testID?: string;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  switchDisabled?: boolean;
  subtitle?: string | React.ReactNode;
  showItem: boolean;
  section?: string;
  Component?: React.ElementType;
  chevron?: boolean;
}

const GeneralSettings: React.FC = () => {
  const { wallets, isStorageEncrypted } = useStorage();
  const { colors, sizing, layout } = usePlatformStyles();
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
  const {
    isDoNotTrackEnabled,
    setDoNotTrackStorage,
    isPrivacyBlurEnabled,
    setIsPrivacyBlurEnabled,
    isWidgetBalanceDisplayAllowed,
    setIsWidgetBalanceDisplayAllowedStorage,
    isClipboardGetContentEnabled,
    setIsClipboardGetContentEnabledStorage,
    isQuickActionsEnabled,
    setIsQuickActionsEnabledStorage,
    isTotalBalanceEnabled,
    setIsTotalBalanceEnabledStorage,
    isHandOffUseEnabled,
    setIsHandOffUseEnabledAsyncStorage,
  } = useSettings();
  const [isLoading, setIsLoading] = useState<number>(SettingsPrivacySection.All);
  const [storageIsEncrypted, setStorageIsEncrypted] = useState<boolean>(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listItemContainer: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    subtitleText: {
      fontSize: 14,
      color: colors.subtitleColor,
      marginTop: 5,
    },
    sectionHeaderContainer: {
      marginTop: 32,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.titleColor,
    },
  });

  useEffect(() => {
    (async () => {
      try {
        setStorageIsEncrypted(await isStorageEncrypted());
      } catch (e) {
        console.log(e);
      }
      setIsLoading(SettingsPrivacySection.None);
    })();
  }, [isStorageEncrypted]);

  const onDoNotTrackValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.All);
      try {
        setDoNotTrackStorage(value);
        A.setOptOut(value);
      } catch (e) {
        console.debug('onDoNotTrackValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setDoNotTrackStorage],
  );

  const onQuickActionsValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.QuickActions);
      try {
        setIsQuickActionsEnabledStorage(value);
      } catch (e) {
        console.debug('onQuickActionsValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsQuickActionsEnabledStorage],
  );

  const onWidgetsTotalBalanceValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.Widget);
      try {
        setIsWidgetBalanceDisplayAllowedStorage(value);
      } catch (e) {
        console.debug('onWidgetsTotalBalanceValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsWidgetBalanceDisplayAllowedStorage],
  );

  const onTotalBalanceEnabledValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.TotalBalance);
      try {
        setIsTotalBalanceEnabledStorage(value);
      } catch (e) {
        console.debug('onTotalBalanceEnabledValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsTotalBalanceEnabledStorage],
  );

  const onTemporaryScreenshotsValueChange = useCallback(
    (value: boolean) => {
      setIsLoading(SettingsPrivacySection.TemporaryScreenshots);
      setIsPrivacyBlurEnabled(!value);
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsPrivacyBlurEnabled],
  );

  const openApplicationSettings = useCallback(() => {
    openSettings();
  }, []);

  const onHandOffUseEnabledChange = useCallback(
    async (value: boolean) => {
      await setIsHandOffUseEnabledAsyncStorage(value);
    },
    [setIsHandOffUseEnabledAsyncStorage],
  );

  const settingsItems = useCallback(() => {
    const items: SettingItem[] = [
      {
        id: 'privacySectionHeader',
        title: '',
        subtitle: '',
        section: loc.settings.privacy,
        showItem: true,
      },
      {
        id: 'readClipboard',
        title: loc.settings.privacy_read_clipboard,
        subtitle: <Text style={styles.subtitleText}>{loc.settings.privacy_clipboard_explanation}</Text>,
        isSwitch: true,
        switchValue: isClipboardGetContentEnabled,
        onSwitchValueChange: setIsClipboardGetContentEnabledStorage,
        switchDisabled: isLoading === SettingsPrivacySection.All,
        testID: 'ClipboardSwitch',
        Component: View,
        showItem: true,
      },
      {
        id: 'quickActions',
        title: loc.settings.privacy_quickactions,
        subtitle: (
          <>
            <Text style={styles.subtitleText}>{loc.settings.privacy_quickactions_explanation}</Text>
            {storageIsEncrypted && <Text style={styles.subtitleText}>{loc.settings.encrypted_feature_disabled}</Text>}
          </>
        ),
        isSwitch: true,
        switchValue: storageIsEncrypted ? false : isQuickActionsEnabled,
        onSwitchValueChange: onQuickActionsValueChange,
        switchDisabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
        testID: 'QuickActionsSwitch',
        Component: View,
        showItem: true,
      },
      {
        id: 'totalBalance',
        title: loc.total_balance_view.title,
        subtitle: <Text style={styles.subtitleText}>{loc.total_balance_view.explanation}</Text>,
        isSwitch: true,
        switchValue: isTotalBalanceEnabled,
        onSwitchValueChange: onTotalBalanceEnabledValueChange,
        switchDisabled: isLoading === SettingsPrivacySection.All || wallets.length < 2,
        testID: 'TotalBalanceSwitch',
        Component: View,
        showItem: true,
      },
    ];

    if (!isDesktop) {
      items.push({
        id: 'temporaryScreenshots',
        title: loc.settings.privacy_temporary_screenshots,
        subtitle: <Text style={styles.subtitleText}>{loc.settings.privacy_temporary_screenshots_instructions}</Text>,
        isSwitch: true,
        switchValue: !isPrivacyBlurEnabled,
        onSwitchValueChange: onTemporaryScreenshotsValueChange,
        switchDisabled: isLoading === SettingsPrivacySection.All,
        Component: View,
        showItem: true,
      });
    }

    items.push({
      id: 'doNotTrack',
      title: loc.settings.privacy_do_not_track,
      subtitle: <Text style={styles.subtitleText}>{loc.settings.privacy_do_not_track_explanation}</Text>,
      isSwitch: true,
      switchValue: isDoNotTrackEnabled,
      onSwitchValueChange: onDoNotTrackValueChange,
      switchDisabled: isLoading === SettingsPrivacySection.All,
      Component: View,
      showItem: true,
    });

    if (Platform.OS === 'ios') {
      items.push({
        id: 'widgetsSectionHeader',
        title: '',
        subtitle: '',
        section: loc.settings.widgets,
        showItem: true,
      });

      items.push({
        id: 'totalBalanceWidget',
        title: loc.settings.total_balance,
        subtitle: (
          <>
            <Text style={styles.subtitleText}>{loc.settings.total_balance_explanation}</Text>
            {storageIsEncrypted && <Text style={styles.subtitleText}>{loc.settings.encrypted_feature_disabled}</Text>}
          </>
        ),
        isSwitch: true,
        switchValue: storageIsEncrypted ? false : isWidgetBalanceDisplayAllowed,
        onSwitchValueChange: onWidgetsTotalBalanceValueChange,
        switchDisabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
        Component: View,
        showItem: true,
      });
    }

    // Continuity section (iOS only)
    if (Platform.OS === 'ios') {
      items.push({
        id: 'continuitySectionHeader',
        title: '',
        subtitle: '',
        section: loc.settings.general_continuity,
        showItem: true,
      });
      items.push({
        id: 'continuity',
        title: loc.settings.general_continuity,
        subtitle: <Text style={styles.subtitleText}>{loc.settings.general_continuity_e}</Text>,
        isSwitch: true,
        switchValue: isHandOffUseEnabled,
        onSwitchValueChange: onHandOffUseEnabledChange,
        Component: View,
        showItem: true,
      });
    }

    items.push({
      id: 'privacySystemSettings',
      title: loc.settings.privacy_system_settings,
      subtitle: '',
      chevron: true,
      onPress: openApplicationSettings,
      testID: 'PrivacySystemSettings',
      showItem: true,
    });

    return items.filter(item => item.showItem);
  }, [
    isClipboardGetContentEnabled,
    isQuickActionsEnabled,
    isTotalBalanceEnabled,
    isPrivacyBlurEnabled,
    isDoNotTrackEnabled,
    isWidgetBalanceDisplayAllowed,
    isLoading,
    storageIsEncrypted,
    wallets.length,
    styles.subtitleText,
    setIsClipboardGetContentEnabledStorage,
    onDoNotTrackValueChange,
    onQuickActionsValueChange,
    onTemporaryScreenshotsValueChange,
    onTotalBalanceEnabledValueChange,
    onWidgetsTotalBalanceValueChange,
    openApplicationSettings,
    isHandOffUseEnabled,
    onHandOffUseEnabledChange,
  ]);

  const renderItem: ListRenderItem<SettingItem> = useCallback(
    ({ item, index }) => {
      const items = settingsItems();

      // Handle section headers
      if (item.section) {
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{item.section}</Text>
          </View>
        );
      }

      // Find next non-section item to determine isLast
      const itemIndex: number = items.findIndex(i => i.id === item.id);
      let nextRegularItemIndex = itemIndex + 1;
      while (nextRegularItemIndex < items.length && items[nextRegularItemIndex].section) {
        nextRegularItemIndex++;
      }

      // System Settings should always start a new container
      const isSystemSettings = item.id === 'privacySystemSettings';
      const isBeforeSystemSettings = nextRegularItemIndex < items.length && items[nextRegularItemIndex].id === 'privacySystemSettings';

      // Continuity should always start a new container (iOS only)
      const isContinuity = item.id === 'continuity';
      const isBeforeContinuity = nextRegularItemIndex < items.length && items[nextRegularItemIndex].id === 'continuity';

      // Check if previous item was a section header (to avoid double spacing)
      const previousItem = itemIndex > 0 ? items[itemIndex - 1] : null;
      const hasSectionHeaderAbove = previousItem?.section !== undefined;

      // Check if immediate next item is a section header (means current item is last in its section)
      const immediateNextItem = itemIndex + 1 < items.length ? items[itemIndex + 1] : null;
      const immediateNextIsSectionHeader = immediateNextItem?.section !== undefined;

      const isFirst: boolean = isSystemSettings || isContinuity || itemIndex === 0 || !!items[itemIndex - 1]?.section;
      const isLast: boolean =
        isBeforeSystemSettings || isBeforeContinuity || immediateNextIsSectionHeader || nextRegularItemIndex >= items.length;

      // Apply greater corner radius to first and last items
      // Add margin top for System Settings to create spacing from previous container
      // Don't add marginTop for items that have a section header above them (they get spacing from the header)
      const containerStyle = {
        ...styles.listItemContainer,
        ...(Platform.OS === 'android' &&
          sizing.contentContainerPaddingHorizontal !== undefined && {
            paddingHorizontal: sizing.contentContainerPaddingHorizontal,
          }),
        ...(layout.showBorderRadius && {
          borderTopLeftRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderTopRightRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomLeftRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomRightRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
        }),
        ...(isSystemSettings && !hasSectionHeaderAbove && { marginTop: 32 }),
      };

      if (item.isSwitch) {
        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={containerStyle}
            isFirst={isFirst}
            isLast={isLast}
            Component={item.Component}
            bottomDivider={layout.showBorderBottom && !isLast}
            switch={{
              value: item.switchValue || false,
              onValueChange: item.onSwitchValueChange,
              disabled: item.switchDisabled,
            }}
            testID={item.testID}
          />
        );
      }

      return (
        <PlatformListItem
          title={item.title}
          subtitle={item.subtitle}
          containerStyle={containerStyle}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          isFirst={isFirst}
          isLast={isLast}
          bottomDivider={layout.showBorderBottom && !isLast}
        />
      );
    },
    [
      layout.showBorderBottom,
      layout.showBorderRadius,
      styles.listItemContainer,
      styles.sectionHeaderContainer,
      styles.sectionHeaderText,
      settingsItems,
      sizing.containerBorderRadius,
      sizing.contentContainerPaddingHorizontal,
    ],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      testID="SettingsPrivacy"
      style={styles.container}
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
      headerHeight={headerHeight}
    />
  );
};

export default GeneralSettings;
