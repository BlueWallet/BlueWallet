import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useMemo, useLayoutEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Linking, Image, Platform } from 'react-native';
import loc from '../../loc';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';

const Settings = () => {
  const { navigate, setOptions } = useNavigation();
  const {
    language,
    isPlatformSearchEnabled,
    setIsPlatformSearchEnabledStorage,
    isPlatformSearchAddressesEnabled,
    setIsPlatformSearchAddressesEnabledStorage,
  } = useSettings();
  const { isStorageEncrypted } = useStorage();
  const [storageIsEncrypted, setStorageIsEncrypted] = useState(true);
  const [isSearchSaving, setIsSearchSaving] = useState(false);
  const supportsSystemSearch = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 31);
  const platformSearchTitle = Platform.OS === 'android' ? loc.settings.android_system_search : loc.settings.spotlight_search;
  const platformSearchExplanation =
    Platform.OS === 'android' ? loc.settings.android_system_search_explanation : loc.settings.spotlight_search_explanation;
  const platformSearchAddressesExplanation =
    Platform.OS === 'android' ? loc.settings.android_system_search_addresses_explanation : loc.settings.spotlight_addresses_explanation;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setStorageIsEncrypted(true);
      isStorageEncrypted()
        .then(encrypted => {
          if (active) setStorageIsEncrypted(encrypted);
        })
        .catch(error => console.warn('[PlatformSearch] Unable to check storage encryption:', error));
      return () => {
        active = false;
      };
    }, [isStorageEncrypted]),
  );

  const onPlatformSearchEnabledChange = useCallback(
    async (value: boolean) => {
      setIsSearchSaving(true);
      try {
        await setIsPlatformSearchEnabledStorage(value);
      } finally {
        setIsSearchSaving(false);
      }
    },
    [setIsPlatformSearchEnabledStorage],
  );

  const openPlatformSearchMoreInfo = useCallback(() => {
    const url =
      Platform.OS === 'android' ? 'https://developer.android.com/develop/ui/views/search/appsearch' : 'https://support.apple.com/102321';
    Linking.openURL(url).catch(error => console.warn('[PlatformSearch] Unable to open platform documentation:', error));
  }, []);

  const encryptedDisabledNote = storageIsEncrypted ? `\n${loc.settings.encrypted_feature_disabled}` : '';

  useLayoutEffect(() => {
    // Only the title needs refreshing on language change; header styling comes from the route options
    setOptions({ title: loc.settings.header });
  }, [setOptions, language]);

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

  return (
    <SettingsScrollView testID="SettingsRoot">
      <SettingsSection>
        <SettingsListItem
          title={loc.settings.donate}
          subtitle={loc.settings.donate_description}
          subtitleNumberOfLines={0}
          leftAvatar={donateIcon}
          onPress={handleDonatePress}
          testID="Donate"
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.general}
          iconName="settings"
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
        />
        <SettingsListItem
          title={loc.settings.currency}
          iconName="currency"
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
        />
        <SettingsListItem
          title={loc.settings.language}
          iconName="language"
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
        />
        <SettingsListItem
          title={loc.settings.encrypt_title}
          iconName="security"
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
        />
        <SettingsListItem
          title={loc.settings.network}
          iconName="network"
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>

      {supportsSystemSearch && (
        <SettingsSection title={platformSearchTitle}>
          <SettingsListItem
            title={platformSearchTitle}
            testID="PlatformSearchEnabled"
            subtitle={`${platformSearchExplanation}${encryptedDisabledNote}`}
            switch={{
              value: storageIsEncrypted ? false : isPlatformSearchEnabled,
              onValueChange: onPlatformSearchEnabledChange,
              disabled: isSearchSaving || storageIsEncrypted,
            }}
          />
          {isPlatformSearchEnabled && !storageIsEncrypted && (
            <SettingsListItem
              title={loc.settings.platform_search_addresses}
              testID="PlatformSearchAddresses"
              subtitle={platformSearchAddressesExplanation}
              switch={{
                value: isPlatformSearchAddressesEnabled,
                onValueChange: setIsPlatformSearchAddressesEnabledStorage,
                disabled: isSearchSaving,
              }}
            />
          )}
          <SettingsListItem
            title={loc.wallets.more_info}
            onPress={openPlatformSearchMoreInfo}
            testID="PlatformSearchMoreInfo"
            bottomDivider={false}
          />
        </SettingsSection>
      )}

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.tools}
          iconName="tools"
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.about}
          iconName="about"
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>
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
});
