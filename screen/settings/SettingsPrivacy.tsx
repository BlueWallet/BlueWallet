/**
 * @deprecated This screen's functionality has been merged into GeneralSettings.tsx
 * This file is kept for backwards compatibility and may be used in tests.
 * New code should use GeneralSettings.tsx instead.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View, ListRenderItemInfo } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';
import { SettingsFlatList, SettingsListItem, SettingsSectionHeader, SettingsSubtitle } from '../../components/platform';

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
        subtitle: <SettingsSubtitle>{loc.settings.privacy_clipboard_explanation}</SettingsSubtitle>,
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
            <SettingsSubtitle>{loc.settings.privacy_quickactions_explanation}</SettingsSubtitle>
            {storageIsEncrypted && <SettingsSubtitle>{loc.settings.encrypted_feature_disabled}</SettingsSubtitle>}
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
        subtitle: <SettingsSubtitle>{loc.total_balance_view.explanation}</SettingsSubtitle>,
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
        subtitle: <SettingsSubtitle>{loc.settings.privacy_temporary_screenshots_instructions}</SettingsSubtitle>,
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
      subtitle: <SettingsSubtitle>{loc.settings.privacy_do_not_track_explanation}</SettingsSubtitle>,
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
            <SettingsSubtitle>{loc.settings.total_balance_explanation}</SettingsSubtitle>
            {storageIsEncrypted && <SettingsSubtitle>{loc.settings.encrypted_feature_disabled}</SettingsSubtitle>}
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
    setIsClipboardGetContentEnabledStorage,
    onDoNotTrackValueChange,
    onQuickActionsValueChange,
    onTemporaryScreenshotsValueChange,
    onTotalBalanceEnabledValueChange,
    onWidgetsTotalBalanceValueChange,
    openApplicationSettings,
  ]);

  const renderItem = useCallback(
    (info: ListRenderItemInfo<SettingItem>): JSX.Element => {
      const item = info.item;
      const items: SettingItem[] = settingsItems();

      if (item.section) {
        return <SettingsSectionHeader title={item.section} />;
      }

      const index: number = items.findIndex(i => i.id === item.id);
      let nextRegularItemIndex = index + 1;
      while (nextRegularItemIndex < items.length && items[nextRegularItemIndex].section) {
        nextRegularItemIndex++;
      }

      const isFirst: boolean = index === 0 || !!items[index - 1].section;
      const isLast: boolean = nextRegularItemIndex >= items.length || !!items[nextRegularItemIndex].section;
      const position = isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle';

      if (item.isSwitch) {
        return (
          <SettingsListItem
            title={item.title}
            subtitle={item.subtitle}
            Component={item.Component}
            position={position}
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
        <SettingsListItem
          title={item.title}
          subtitle={item.subtitle}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          position={position}
        />
      );
    },
    [settingsItems],
  );

  const keyExtractor = useCallback((item: SettingItem, index: number) => `${item.id}-${index}`, []);

  return (
    <SettingsFlatList
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default SettingsPrivacy;
