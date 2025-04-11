import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../components/platformThemes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStandardIconProps } from '../../components/StandardIcons';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useSettings();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();

  const isAndroid = Platform.OS === 'android';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    sectionHeaderContainer: {
      height: isAndroid ? sizing.sectionHeaderHeight / 2 : sizing.sectionHeaderHeight,
      paddingHorizontal: 24,
      justifyContent: 'flex-end',
      paddingBottom: isAndroid ? sizing.sectionHeaderPaddingBottom / 2 : sizing.sectionHeaderPaddingBottom,
    },
    sectionContainer: {
      marginHorizontal: 16,
      marginBottom: isAndroid ? sizing.sectionContainerMarginBottom / 2 : sizing.sectionContainerMarginBottom,
    },
    firstSectionContainer: {
      paddingTop: isAndroid ? sizing.firstSectionContainerPaddingTop / 2 : sizing.firstSectionContainerPaddingTop,
      marginHorizontal: 16,
      marginBottom: isAndroid ? sizing.sectionContainerMarginBottom / 2 : sizing.sectionContainerMarginBottom,
    },
  });

  // Android-specific item height
  const itemHeight = isAndroid ? { height: 66 } : {};

  return (
    <SafeAreaScrollView testID="SettingsRoot" style={styles.container} >
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={useStandardIconProps('settings')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={useStandardIconProps('currency')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider={layout.showBorderBottom}
        />
        <PlatformListItem
          title={loc.settings.language}
          leftIcon={useStandardIconProps('language')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          bottomDivider={layout.showBorderBottom}
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={useStandardIconProps('security')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.network}
          leftIcon={useStandardIconProps('network')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={useStandardIconProps('tools')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={layout.showBorderBottom}
          isLast
        />
      </View>

      <View style={styles.sectionHeaderContainer} />
      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={useStandardIconProps('about')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...itemHeight,
          }}
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default Settings;
