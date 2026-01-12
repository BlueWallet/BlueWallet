import React, { useMemo, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, StatusBar, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformStyles } from '../../theme/platformStyles';
import { useSettings } from '../../hooks/context/useSettings';

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { colors, styles, layout, isAndroid, getIcon, sizing } = usePlatformStyles();
  const { language } = useSettings(); // Subscribe to language changes to trigger re-render
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

  useLayoutEffect(() => {
    setOptions({
      title: loc.settings.header,
      // headerLargeTitle is iOS-only, disable on Android for better compatibility with older versions
      headerLargeTitle: Platform.OS === 'ios',
      headerLargeTitleStyle:
        Platform.OS === 'ios'
          ? {
              color: colors.titleColor || '#000000',
            }
          : undefined,
      headerTitleStyle: {
        color: colors.titleColor || '#000000',
      },
      headerBackButtonDisplayMode: 'minimal',
      headerBackTitle: '',
      headerBackVisible: true, // Show back button on Android
      // Transparent header on both iOS and Android
      headerTransparent: true,
      headerBlurEffect: undefined,
      headerStyle: {
        backgroundColor: 'transparent',
      },
    });
  }, [setOptions, colors.titleColor, language]); // Include language to trigger re-render when language changes

  const settingsIcon = useMemo(() => getIcon('settings'), [getIcon]);
  const currencyIcon = useMemo(() => getIcon('currency'), [getIcon]);
  const languageIcon = useMemo(() => getIcon('language'), [getIcon]);
  const securityIcon = useMemo(() => getIcon('security'), [getIcon]);
  const networkIcon = useMemo(() => getIcon('network'), [getIcon]);
  const toolsIcon = useMemo(() => getIcon('tools'), [getIcon]);
  const aboutIcon = useMemo(() => getIcon('about'), [getIcon]);

  const handleDonatePress = useCallback(() => {
    Linking.openURL('https://donate.bluewallet.io/');
  }, []);

  const localStyles = StyleSheet.create({
    donateIconContainer: {
      padding: 4,
    },
    donateIconImage: {
      width: 48,
      height: 48,
    },
    donateSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginBottom: sizing.sectionContainerMarginBottom,
      marginTop: isAndroid ? 8 : 0,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
    },
    sectionContainer: {
      marginTop: isAndroid ? 16 : 8,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    itemContainer: {
      marginHorizontal: 0,
    },
  });

  const donateIcon = useMemo(
    () => (
      <View style={localStyles.donateIconContainer}>
        <Image source={require('../../img/bluebeast.png')} style={localStyles.donateIconImage} resizeMode="contain" />
      </View>
    ),
    [localStyles.donateIconContainer, localStyles.donateIconImage],
  );

  return (
    <SafeAreaScrollView
      testID="SettingsRoot"
      style={styles.container}
      contentContainerStyle={localStyles.contentContainer}
      nestedScrollEnabled={true}
      headerHeight={headerHeight}
    >
      <View style={localStyles.donateSectionContainer}>
        <PlatformListItem
          title="Donate"
          subtitle="Help us keep Blue free!"
          leftIcon={donateIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
            layout.showBorderRadius && {
              borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
              borderTopRightRadius: sizing.containerBorderRadius * 1.5,
              borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
              borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
          onPress={handleDonatePress}
          testID="Donate"
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>

      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={settingsIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
            layout.showBorderRadius && {
              borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
              borderTopRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />

        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={currencyIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        <PlatformListItem
          title={loc.settings.language}
          leftIcon={languageIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={securityIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
          ]}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        <PlatformListItem
          title={loc.settings.network}
          leftIcon={networkIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
            layout.showBorderRadius && {
              borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
              borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
          isLast
        />
      </View>

      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={toolsIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
            layout.showBorderRadius && {
              borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
              borderTopRightRadius: sizing.containerBorderRadius * 1.5,
              borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
              borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>

      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={aboutIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
            },
            layout.showBorderRadius && {
              borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
              borderTopRightRadius: sizing.containerBorderRadius * 1.5,
              borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
              borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
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
