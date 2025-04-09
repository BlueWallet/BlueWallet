import React from 'react';
import { View, StyleSheet, Platform, PlatformColor, useColorScheme } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useSettings();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const getIOSColors = () => {
    return {
      background: PlatformColor('systemGroupedBackground'),
      cardBackground: PlatformColor('secondarySystemGroupedBackground'),
      textColor: PlatformColor('label'),
      blueIcon: PlatformColor('systemBlue'),
      greenIcon: PlatformColor('systemGreen'),
      yellowIcon: PlatformColor('systemOrange'),
      redIcon: PlatformColor('systemRed'),
      grayIcon: PlatformColor('systemGray'),
    };
  };

  const getAndroidColors = (isDark: boolean) => {
    const textColor = isDark ? '#FFFFFF' : '#202124';
    return {
      background: isDark ? '#1F1F1F' : '#F3F3F3',
      cardBackground: 'transparent',
      textColor,
      blueIcon: isDark ? '#82B1FF' : '#1A73E8', // Blue
      greenIcon: isDark ? '#69F0AE' : '#0F9D58', // Green
      yellowIcon: isDark ? '#FFD600' : '#F4B400', // Yellow/Amber
      redIcon: isDark ? '#FF5252' : '#DB4437', // Red
      grayIcon: isDark ? '#BDBDBD' : '#5F6368', // Gray
    };
  };

  const iosColors = Platform.OS === 'ios' ? getIOSColors() : null;
  const androidColors = Platform.OS === 'android' ? getAndroidColors(isDarkMode) : null;

  const theme = {
    background: Platform.OS === 'ios' ? iosColors!.background : androidColors!.background,
    cardBackground: Platform.OS === 'ios' ? iosColors!.cardBackground : androidColors!.cardBackground,
    textColor: Platform.OS === 'ios' ? iosColors!.textColor : androidColors!.textColor,

    blueIcon: Platform.OS === 'ios' ? iosColors!.blueIcon : androidColors!.blueIcon,
    greenIcon: Platform.OS === 'ios' ? iosColors!.greenIcon : androidColors!.greenIcon,
    yellowIcon: Platform.OS === 'ios' ? iosColors!.yellowIcon : androidColors!.yellowIcon,
    redIcon: Platform.OS === 'ios' ? iosColors!.redIcon : androidColors!.redIcon,
    grayIcon: Platform.OS === 'ios' ? iosColors!.grayIcon : androidColors!.grayIcon,

    blueIconBg: Platform.OS === 'ios' ? 'rgba(0, 122, 255, 0.12)' : 'transparent',
    greenIconBg: Platform.OS === 'ios' ? 'rgba(52, 199, 89, 0.12)' : 'transparent',
    yellowIconBg: Platform.OS === 'ios' ? 'rgba(255, 149, 0, 0.12)' : 'transparent',
    redIconBg: Platform.OS === 'ios' ? 'rgba(255, 59, 48, 0.12)' : 'transparent',
    grayIconBg: Platform.OS === 'ios' ? 'rgba(142, 142, 147, 0.12)' : 'transparent',
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    sectionHeaderContainer: {
      height: Platform.OS === 'ios' ? 48 : 32,
      paddingHorizontal: 24,
      justifyContent: 'flex-end',
      paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    },
    sectionContainer: {
      marginHorizontal: 16,
      marginBottom: Platform.OS === 'ios' ? 16 : 8,
    },
    firstSectionContainer: {
      paddingTop: Platform.OS === 'ios' ? 24 : 16,
      marginHorizontal: 16,
      marginBottom: Platform.OS === 'ios' ? 16 : 8,
    },
  });

  return (
    <SafeAreaScrollView testID="SettingsRoot" style={styles.container}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'settings-outline' : 'cog',
            color: theme.blueIcon,
            backgroundColor: theme.blueIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          bottomDivider={Platform.OS === 'ios'}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'cash-outline' : 'money-bill-alt',
            color: theme.greenIcon,
            backgroundColor: theme.greenIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider={Platform.OS === 'ios'}
        />
        <PlatformListItem
          title={loc.settings.language}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'language-outline' : 'language',
            color: theme.yellowIcon,
            backgroundColor: theme.yellowIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          bottomDivider={Platform.OS === 'ios'}
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
            color: theme.redIcon,
            backgroundColor: theme.redIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          bottomDivider={Platform.OS === 'ios'}
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
            color: theme.blueIcon,
            backgroundColor: theme.blueIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={Platform.OS === 'ios'}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={{
            type: Platform.OS === 'ios' ? 'ionicon' : 'font-awesome-5',
            name: Platform.OS === 'ios' ? 'construct-outline' : 'tools',
            color: theme.yellowIcon,
            backgroundColor: theme.yellowIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('ToolsScreen')}
          testID="Tools"
          chevron
          bottomDivider={Platform.OS === 'ios'}
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
            color: theme.grayIcon,
            backgroundColor: theme.grayIconBg,
          }}
          containerStyle={{
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={Platform.OS === 'ios'}
          isFirst
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default Settings;
