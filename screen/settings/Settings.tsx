import React, { useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformStyles } from '../../theme/platformStyles';

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { 
    colors, 
    styles, 
    layout, 
    isAndroid, 
    getIcon,
    sizing
  } = usePlatformStyles();

  useLayoutEffect(() => {
    setOptions({
      title: loc.settings.header,
      headerLargeTitle: true,
      headerLargeTitleStyle: {
        color: colors.titleColor || '#000000',
      },
      headerTitleStyle: {
        color: colors.titleColor || '#000000',
      },
      headerBackButtonDisplayMode: 'minimal',
      headerBackTitle: '',
      headerBackTitleVisible: false,
      headerTransparent: true,
      headerBlurEffect: undefined,
      headerStyle: {
        backgroundColor: 'transparent',
      },
    });
  }, [setOptions, colors.titleColor]);

  const settingsIcon = useMemo(() => getIcon('settings'), [getIcon]);
  const currencyIcon = useMemo(() => getIcon('currency'), [getIcon]);
  const languageIcon = useMemo(() => getIcon('language'), [getIcon]);
  const securityIcon = useMemo(() => getIcon('security'), [getIcon]);
  const networkIcon = useMemo(() => getIcon('network'), [getIcon]);
  const toolsIcon = useMemo(() => getIcon('tools'), [getIcon]);
  const aboutIcon = useMemo(() => getIcon('about'), [getIcon]);

  const localStyles = StyleSheet.create({
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
      marginTop: isAndroid ? 8 : 0,
    },
    sectionContainer: {
      marginTop: isAndroid ? 16 : 8,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
      marginHorizontal: 0,
    },
    itemContainer: {
      marginHorizontal: 16,
    },
  });

  return (
    <SafeAreaScrollView
      testID="SettingsRoot"
      style={styles.container}
      contentContainerStyle={localStyles.contentContainer}
      nestedScrollEnabled={true}
    >
      <View style={localStyles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={settingsIcon}
          containerStyle={[
            localStyles.itemContainer,
            {
              backgroundColor: colors.cardBackground,
              ...(isAndroid && { height: sizing.itemMinHeight }),
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
