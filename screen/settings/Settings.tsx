import React from 'react';
import { View, StyleSheet, Platform, PlatformColor } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.select({
      ios: PlatformColor('systemGroupedBackground'),
      android: PlatformColor('@android:color/background_light'),
    }),
  },
  sectionHeaderContainer: {
    height: 32,
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  sectionContainer: {
    marginHorizontal: 16,
  },
  firstSectionContainer: {
    paddingTop: 16,
    marginHorizontal: 16,
  },
});

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  // By simply having it here, it'll re-render the UI if language is changed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useSettings();

  return (
    <SafeAreaScrollView testID="SettingsRoot" style={styles.container}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'settings-outline' : 'cog',
            color: Platform.select({
              ios: PlatformColor('systemBlue'),
              android: PlatformColor('@android:color/holo_blue_light'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(0, 122, 255, 0.12)',
              android: 'rgba(51, 181, 229, 0.12)',
            }),
          }}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          bottomDivider
          isFirst
        />
        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'cash-outline' : 'money-bill-alt',
            color: Platform.select({
              ios: PlatformColor('systemGreen'),
              android: PlatformColor('@android:color/holo_green_light'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(52, 199, 89, 0.12)',
              android: 'rgba(153, 204, 0, 0.12)',
            }),
          }}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider
        />
        <PlatformListItem
          title={loc.settings.language}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'language-outline' : 'language',
            color: Platform.select({
              ios: PlatformColor('systemOrange'),
              android: PlatformColor('@android:color/holo_orange_light'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(255, 149, 0, 0.12)',
              android: 'rgba(255, 187, 51, 0.12)',
            }),
          }}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          bottomDivider={false}
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'lock-closed-outline' : 'lock',
            color: Platform.select({
              ios: PlatformColor('systemRed'),
              android: PlatformColor('@android:color/holo_red_light'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(255, 59, 48, 0.12)',
              android: 'rgba(255, 68, 68, 0.12)',
            }),
          }}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.network}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'globe-outline' : 'globe',
            color: Platform.select({
              ios: PlatformColor('systemIndigo'),
              android: PlatformColor('@android:color/holo_purple'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(88, 86, 214, 0.12)',
              android: 'rgba(170, 102, 204, 0.12)',
            }),
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider
          isFirst
        />
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'construct-outline' : 'tools',
            color: Platform.select({
              ios: PlatformColor('systemBrown'),
              android: PlatformColor('@android:color/holo_orange_dark'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(162, 132, 94, 0.12)',
              android: 'rgba(255, 140, 0, 0.12)',
            }),
          }}
          onPress={() => navigate('ToolsScreen')}
          testID="Tools"
          chevron
          bottomDivider={false}
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'information-circle-outline' : 'info-circle',
            color: Platform.select({
              ios: PlatformColor('systemGray'),
              android: PlatformColor('@android:color/darker_gray'),
            }) as unknown as string,
            backgroundColor: Platform.select({
              ios: 'rgba(142, 142, 147, 0.12)',
              android: 'rgba(170, 170, 170, 0.12)',
            }),
          }}
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default Settings;
