import React, { useMemo, useLayoutEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Linking, Image, Platform, NativeSyntheticEvent } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import {
  SettingsScrollView,
  SettingsSection,
  SettingsListItem,
  SettingsIconName,
  getSettingsHeaderOptions,
} from '../../components/platform';
import { useSettings } from '../../hooks/context/useSettings';
import { useTheme } from '../../components/themes';

interface SettingsItem {
  key: string;
  title: string;
  subtitle?: string;
  iconName?: SettingsIconName;
  testID: string;
  onPress: () => void;
  leftIcon?: React.ReactElement;
  searchTerms?: string[];
}

interface SettingsSectionConfig {
  key: string;
  compact?: boolean;
  items: SettingsItem[];
}

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { language } = useSettings(); // Subscribe to language changes to trigger re-render
  const { colors, dark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const isIOSLightMode = Platform.OS === 'ios' && !dark;
  const settingsCardColor = colors.lightButton ?? colors.modal ?? colors.elevated ?? colors.background;
  const settingsScreenBackgroundColor = isIOSLightMode ? settingsCardColor : colors.background;
  const settingsListItemBackgroundColor = isIOSLightMode ? colors.background : undefined;

  const handleSearchChange = useCallback((event: NativeSyntheticEvent<{ text: string }>) => {
    setSearchQuery(event.nativeEvent.text);
  }, []);

  useLayoutEffect(() => {
    setOptions({
      ...getSettingsHeaderOptions(loc.settings.header, { ...colors, background: settingsScreenBackgroundColor }, dark),
      headerSearchBarOptions: {
        hideWhenScrolling: false,
        placeholder: loc._.search,
        onChangeText: handleSearchChange,
        onClear: () => setSearchQuery(''),
        onCancelButtonPress: () => setSearchQuery(''),
      },
    });
  }, [setOptions, language, colors, settingsScreenBackgroundColor, dark, handleSearchChange]); // Include language to trigger re-render when language changes

  const handleDonatePress = useCallback(() => {
    Linking.openURL('https://donate.bluewallet.io/');
  }, []);

  const donateIcon = useMemo(
    () => (
      <View style={styles.donateIconContainer}>
        <Image source={require('../../img/bluebeast.png')} style={styles.donateIconImage} resizeMode="contain" />
      </View>
    ),
    [],
  );

  const sections = useMemo<SettingsSectionConfig[]>(
    () => [
      {
        key: 'donate',
        compact: true,
        items: [
          {
            key: 'donate',
            title: loc.settings.donate,
            subtitle: loc.settings.donate_description,
            leftIcon: donateIcon,
            onPress: handleDonatePress,
            testID: 'Donate',
          },
        ],
      },
      {
        key: 'main',
        items: [
          {
            key: 'general',
            title: loc.settings.general,
            iconName: 'settings',
            onPress: () => navigate('GeneralSettings'),
            testID: 'GeneralSettings',
          },
          {
            key: 'currency',
            title: loc.settings.currency,
            iconName: 'currency',
            onPress: () => navigate('Currency'),
            testID: 'Currency',
          },
          {
            key: 'language',
            title: loc.settings.language,
            iconName: 'language',
            onPress: () => navigate('Language'),
            testID: 'Language',
          },
          {
            key: 'security',
            title: loc.settings.encrypt_title,
            iconName: 'security',
            onPress: () => navigate('EncryptStorage'),
            testID: 'SecurityButton',
          },
          {
            key: 'network',
            title: loc.settings.network,
            iconName: 'network',
            onPress: () => navigate('NetworkSettings'),
            testID: 'NetworkSettings',
          },
        ],
      },
      {
        key: 'tools',
        items: [
          {
            key: 'tools',
            title: loc.settings.tools,
            iconName: 'tools',
            onPress: () => navigate('SettingsTools'),
            testID: 'Tools',
          },
        ],
      },
      {
        key: 'about',
        items: [
          {
            key: 'about',
            title: loc.settings.about,
            iconName: 'about',
            onPress: () => navigate('About'),
            testID: 'AboutButton',
          },
        ],
      },
    ],
    [donateIcon, handleDonatePress, navigate],
  );

  const globalSearchItems = useMemo<SettingsItem[]>(() => {
    const items: SettingsItem[] = [
      {
        key: 'search-notifications',
        title: loc.settings.notifications,
        subtitle: loc.settings.network,
        iconName: 'notifications',
        onPress: () => navigate('NotificationSettings'),
        testID: 'SearchNotificationSettings',
        searchTerms: ['notification', 'notifications', 'push'],
      },
      {
        key: 'search-block-explorer',
        title: loc.settings.block_explorer,
        subtitle: loc.settings.network,
        iconName: 'blockExplorer',
        onPress: () => navigate('SettingsBlockExplorer'),
        testID: 'SearchBlockExplorerSettings',
      },
      {
        key: 'search-electrum',
        title: loc.settings.network_electrum,
        subtitle: loc.settings.network,
        iconName: 'electrum',
        onPress: () => navigate('ElectrumSettings'),
        testID: 'SearchElectrumSettings',
      },
      {
        key: 'search-lightning',
        title: loc.settings.lightning_settings,
        subtitle: loc.settings.network,
        iconName: 'lightning',
        onPress: () => navigate('LightningSettings'),
        testID: 'SearchLightningSettings',
      },
      {
        key: 'search-self-test',
        title: loc.settings.about_selftest,
        subtitle: loc.settings.about,
        iconName: 'selfTest',
        onPress: () => navigate('SelfTest'),
        testID: 'SearchSelfTest',
      },
      {
        key: 'search-release-notes',
        title: loc.settings.about_release_notes,
        subtitle: loc.settings.about,
        iconName: 'releaseNotes',
        onPress: () => navigate('ReleaseNotes'),
        testID: 'SearchReleaseNotes',
      },
      {
        key: 'search-licensing',
        title: loc.settings.about_license,
        subtitle: loc.settings.about,
        iconName: 'licensing',
        onPress: () => navigate('Licensing'),
        testID: 'SearchLicensing',
      },
      {
        key: 'search-is-it-my-address',
        title: loc.is_it_my_address.title,
        subtitle: loc.settings.tools,
        iconName: 'search',
        onPress: () => navigate('IsItMyAddress'),
        testID: 'SearchIsItMyAddress',
      },
      {
        key: 'search-broadcast',
        title: loc.settings.network_broadcast,
        subtitle: loc.settings.tools,
        iconName: 'paperPlane',
        onPress: () => navigate('Broadcast'),
        testID: 'SearchBroadcast',
      },
      {
        key: 'search-generate-word',
        title: loc.autofill_word.title,
        subtitle: loc.settings.tools,
        iconName: 'key',
        onPress: () => navigate('GenerateWord'),
        testID: 'SearchGenerateWord',
      },
    ];

    if (Platform.OS === 'ios') {
      items.push({
        key: 'search-widgets',
        title: loc.settings.widgets,
        subtitle: loc.settings.general,
        iconName: 'settings',
        onPress: () => navigate('GeneralSettings', { targetItemId: 'widgetsSectionHeader' }),
        testID: 'SearchWidgets',
        searchTerms: ['widget', 'widgets', 'total balance'],
      });
    }

    return items.filter(item => item.title && item.subtitle);
  }, [navigate]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    const searchableSections = normalizedQuery
      ? [
          ...sections,
          {
            key: 'search-destinations',
            items: globalSearchItems,
          },
        ]
      : sections;

    if (!normalizedQuery) {
      return searchableSections;
    }

    return searchableSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
          const subtitleMatch = item.subtitle?.toLowerCase().includes(normalizedQuery) ?? false;
          const termMatch = item.searchTerms?.some(term => term.toLowerCase().includes(normalizedQuery)) ?? false;
          return titleMatch || subtitleMatch || termMatch;
        }),
      }))
      .filter(section => section.items.length > 0);
  }, [sections, normalizedQuery, globalSearchItems]);

  const hasResults = filteredSections.length > 0;

  return (
    <SettingsScrollView testID="SettingsRoot" style={{ backgroundColor: settingsScreenBackgroundColor }}>
      {hasResults ? (
        filteredSections.map(section => (
          <SettingsSection key={section.key} compact={section.compact} horizontalInset={false}>
            {section.items.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === section.items.length - 1;
              const position = isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle';

              return (
                <SettingsListItem
                  key={item.key}
                  title={item.title}
                  subtitle={item.subtitle}
                  iconName={item.iconName}
                  leftIcon={item.leftIcon}
                  onPress={item.onPress}
                  testID={item.testID}
                  chevron={!item.leftIcon}
                  position={position}
                  itemBackgroundColor={settingsListItemBackgroundColor}
                />
              );
            })}
          </SettingsSection>
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateCard}>
            <SettingsListItem
              title={loc.wallets.no_results_found}
              position="single"
              itemBackgroundColor={settingsListItemBackgroundColor}
              iconName="search"
              disabled
            />
          </View>
        </View>
      )}
    </SettingsScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  donateIconContainer: {
    padding: 4,
  },
  donateIconImage: {
    width: 48,
    height: 48,
  },
  emptyStateContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  emptyStateCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
});
