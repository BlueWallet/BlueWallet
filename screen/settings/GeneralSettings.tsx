import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View, ListRenderItem } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';
import {
  SettingsFlatList,
  SettingsListItem,
  SettingsListItemProps,
  SettingsSectionHeader,
  SettingsSubtitle,
} from '../../components/platform';

enum SettingsPrivacySection {
  None,
  All,
  ReadClipboard,
  QuickActions,
  Widget,
  TemporaryScreenshots,
  TotalBalance,
}

interface SettingItem extends SettingsListItemProps {
  id: string;
  section?: string;
  showItem: boolean;
}

const GeneralSettings: React.FC = () => {
  const { wallets, isStorageEncrypted } = useStorage();

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
        subtitle: <SettingsSubtitle>{loc.settings.privacy_clipboard_explanation}</SettingsSubtitle>,
        switch: {
          value: isClipboardGetContentEnabled,
          onValueChange: setIsClipboardGetContentEnabledStorage,
          disabled: isLoading === SettingsPrivacySection.All,
        },
        testID: 'ClipboardSwitch',
        Component: View,
        showItem: true,
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
        switch: {
          value: storageIsEncrypted ? false : isQuickActionsEnabled,
          onValueChange: onQuickActionsValueChange,
          disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
        },
        testID: 'QuickActionsSwitch',
        Component: View,
        showItem: true,
      },
      {
        id: 'totalBalance',
        title: loc.total_balance_view.title,
        subtitle: <SettingsSubtitle>{loc.total_balance_view.explanation}</SettingsSubtitle>,
        switch: {
          value: isTotalBalanceEnabled,
          onValueChange: onTotalBalanceEnabledValueChange,
          disabled: isLoading === SettingsPrivacySection.All || wallets.length < 2,
        },
        testID: 'TotalBalanceSwitch',
        Component: View,
        showItem: true,
      },
    ];

    if (!isDesktop) {
      items.push({
        id: 'temporaryScreenshots',
        title: loc.settings.privacy_temporary_screenshots,
        subtitle: <SettingsSubtitle>{loc.settings.privacy_temporary_screenshots_instructions}</SettingsSubtitle>,
        switch: {
          value: !isPrivacyBlurEnabled,
          onValueChange: onTemporaryScreenshotsValueChange,
          disabled: isLoading === SettingsPrivacySection.All,
        },
        Component: View,
        showItem: true,
      });
    }

    items.push({
      id: 'doNotTrack',
      title: loc.settings.privacy_do_not_track,
      subtitle: <SettingsSubtitle>{loc.settings.privacy_do_not_track_explanation}</SettingsSubtitle>,
      switch: {
        value: isDoNotTrackEnabled,
        onValueChange: onDoNotTrackValueChange,
        disabled: isLoading === SettingsPrivacySection.All,
      },
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
            <SettingsSubtitle>{loc.settings.total_balance_explanation}</SettingsSubtitle>
            {storageIsEncrypted && <SettingsSubtitle>{loc.settings.encrypted_feature_disabled}</SettingsSubtitle>}
          </>
        ),
        switch: {
          value: storageIsEncrypted ? false : isWidgetBalanceDisplayAllowed,
          onValueChange: onWidgetsTotalBalanceValueChange,
          disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
        },
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
        subtitle: <SettingsSubtitle>{loc.settings.general_continuity_e}</SettingsSubtitle>,
        switch: {
          value: isHandOffUseEnabled,
          onValueChange: onHandOffUseEnabledChange,
        },
        Component: View,
        showItem: true,
      });
    }

    items.push({
      id: 'privacySystemSettings',
      title: loc.settings.privacy_system_settings,
      subtitle: '',
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
    ({ item }) => {
      const { id, section, ...listItemProps } = item;
      const items = settingsItems();

      if (section) {
        return <SettingsSectionHeader title={section} />;
      }

      const itemIndex = items.findIndex(i => i.id === id);
      let nextRegularItemIndex = itemIndex + 1;
      while (nextRegularItemIndex < items.length && items[nextRegularItemIndex].section) {
        nextRegularItemIndex++;
      }

      const isSystemSettings = id === 'privacySystemSettings';
      const isBeforeSystemSettings = nextRegularItemIndex < items.length && items[nextRegularItemIndex].id === 'privacySystemSettings';
      const isContinuity = id === 'continuity';
      const isBeforeContinuity = nextRegularItemIndex < items.length && items[nextRegularItemIndex].id === 'continuity';

      const previousItem = itemIndex > 0 ? items[itemIndex - 1] : null;
      const hasSectionHeaderAbove = previousItem?.section !== undefined;
      const immediateNextItem = itemIndex + 1 < items.length ? items[itemIndex + 1] : null;
      const immediateNextIsSectionHeader = immediateNextItem?.section !== undefined;

      const isFirst = isSystemSettings || isContinuity || itemIndex === 0 || !!items[itemIndex - 1]?.section;
      const isLast = isBeforeSystemSettings || isBeforeContinuity || immediateNextIsSectionHeader || nextRegularItemIndex >= items.length;
      const position = isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle';
      const spacingTop = isSystemSettings && !hasSectionHeaderAbove;

      return <SettingsListItem {...listItemProps} position={position} spacingTop={spacingTop} />;
    },
    [settingsItems],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  return (
    <SettingsFlatList
      testID="SettingsPrivacy"
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default GeneralSettings;
