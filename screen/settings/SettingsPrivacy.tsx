/**
 * @deprecated This screen's functionality has been merged into GeneralSettings.tsx
 * This file is kept for backwards compatibility and may be used in tests.
 * New code should use GeneralSettings.tsx instead.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';
import { usePlatformTheme } from '../../theme';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';

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
  subtitle: React.ReactNode;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  switchDisabled?: boolean;
  onPress?: () => void;
  testID?: string;
  chevron?: boolean;
  section?: string;
  Component?: React.ElementType;
}

const SettingsPrivacy: React.FC = () => {
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const { isStorageEncrypted, wallets } = useStorage();
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
  } = useSettings();
  const [isLoading, setIsLoading] = useState<number>(SettingsPrivacySection.All);
  const [storageIsEncrypted, setStorageIsEncrypted] = useState<boolean>(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    subtitleText: {
      fontSize: 14,
      color: platformColors.subtitleColor,
      marginTop: 5,
    },
    sectionHeaderContainer: {
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: platformColors.titleColor,
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

  const settingsItems = useCallback((): SettingItem[] => {
    const items: SettingItem[] = [
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
    });

    if (Platform.OS === 'ios') {
      items.push({
        id: 'sectionHeader',
        title: 'widgets',
        subtitle: '',
        section: loc.settings.widgets,
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
      });
    }

    items.push({
      id: 'privacySystemSettings',
      title: loc.settings.privacy_system_settings,
      subtitle: '',
      chevron: true,
      onPress: openApplicationSettings,
      testID: 'PrivacySystemSettings',
    });

    return items;
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
  ]);

  interface RenderItemProps {
    item: SettingItem;
    index: number;
    separators: {
      highlight: () => void;
      unhighlight: () => void;
      updateProps: (select: 'leading' | 'trailing', newProps: object) => void;
    };
  }

  const renderItem = useCallback(
    (props: RenderItemProps): JSX.Element => {
      const item: SettingItem = props.item;
      const items: SettingItem[] = settingsItems();

      // Handle section headers
      if (item.section) {
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{item.section}</Text>
          </View>
        );
      }

      // Find next non-section item to determine isLast
      const index: number = items.findIndex(i => i.id === item.id);
      let nextRegularItemIndex = index + 1;
      while (nextRegularItemIndex < items.length && items[nextRegularItemIndex].section) {
        nextRegularItemIndex++;
      }

      const isFirst: boolean = index === 0 || !!items[index - 1].section;
      const isLast: boolean = nextRegularItemIndex >= items.length || !!items[nextRegularItemIndex].section;

      // Apply greater corner radius to first and last items
      const containerStyle = {
        ...styles.listItemContainer,
        ...(layout.showBorderRadius && {
          borderTopLeftRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderTopRightRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomLeftRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomRightRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
        }),
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
    ],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      style={styles.container}
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default SettingsPrivacy;
