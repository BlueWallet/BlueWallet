import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  // By simply having it here, it'll re-render the UI if language is changed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useSettings();

  const styles = StyleSheet.create({
    sectionHeaderContainer: {
      height: 32,
      paddingHorizontal: 16,
      justifyContent: 'flex-end',
      paddingBottom: 8,
    },
    sectionContainer: {
      borderRadius: 10,
      marginHorizontal: 16,
    },
    firstSectionContainer: {
      borderRadius: 10,
      paddingTop: 16,
      marginHorizontal: 16,
    },
  });

  return (
    <SafeAreaScrollView testID="SettingsRoot">
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={{
            type: 'ionicon',
            name: 'settings-outline',
            color: Platform.select({
              ios: '#147EFB',
              android: '#2196F3',
            }),
            backgroundColor: Platform.select({
              ios: '#D1E3FA',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          isFirst
        />
        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={{
            type: 'ionicon',
            name: 'cash-outline',
            color: Platform.select({
              ios: '#32A852',
              android: '#4CAF50',
            }),
            backgroundColor: Platform.select({
              ios: '#DCF5E3',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
        />
        <PlatformListItem
          title={loc.settings.language}
          leftIcon={{
            type: 'ionicon',
            name: 'language-outline',
            color: Platform.select({
              ios: '#FFB340',
              android: '#FF9800',
            }),
            backgroundColor: Platform.select({
              ios: '#FFF2D9',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={{
            type: 'ionicon',
            name: 'lock-closed-outline',
            color: Platform.select({
              ios: '#FF3A30',
              android: '#F44336',
            }),
            backgroundColor: Platform.select({
              ios: '#FFE5E5',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          isFirst
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.network}
          leftIcon={{
            type: 'ionicon',
            name: 'globe-outline',
            color: Platform.select({
              ios: '#5755D6',
              android: '#673AB7',
            }),
            backgroundColor: Platform.select({
              ios: '#EAEAFB',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          isFirst
        />
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={{
            type: 'ionicon',
            name: 'construct-outline',
            color: Platform.select({
              ios: '#A2845E',
              android: '#795548',
            }),
            backgroundColor: Platform.select({
              ios: '#F5EFE7',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('ToolsScreen')}
          testID="Tools"
          chevron
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={{
            type: 'ionicon',
            name: 'information-circle-outline',
            color: Platform.select({
              ios: '#898989',
              android: '#607D8B',
            }),
            backgroundColor: Platform.select({
              ios: '#F0F0F0',
              android: 'transparent',
            }),
          }}
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          isFirst
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default Settings;
