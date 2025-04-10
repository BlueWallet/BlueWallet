import React from 'react';
import { View, StyleSheet } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../components/platformThemes';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useSettings();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const { colors } = useTheme();

  const iconColors = {
    settings: colors.foregroundColor,
    currency: colors.successColor,
    language: colors.lnborderColor,
    security: colors.redText,
    network: colors.buttonAlternativeTextColor,
    tools: colors.changeText,
    about: colors.cta2,
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    sectionHeaderContainer: {
      height: sizing.sectionHeaderHeight,
      paddingHorizontal: 24,
      justifyContent: 'flex-end',
      paddingBottom: sizing.sectionHeaderPaddingBottom,
    },
    sectionContainer: {
      marginHorizontal: 16,
      marginBottom: sizing.sectionContainerMarginBottom,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: 16,
      marginBottom: sizing.sectionContainerMarginBottom,
    },
  });

  return (
    <SafeAreaScrollView testID="SettingsRoot" style={styles.container}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={{
            type: layout.iconType,
            name: layout.settingsIconName,
            color: iconColors.settings,
            backgroundColor: platformColors.blueIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={{
            type: layout.iconType,
            name: layout.currencyIconName,
            color: iconColors.currency,
            backgroundColor: platformColors.greenIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider={layout.showBorderBottom}
        />
        <PlatformListItem
          title={loc.settings.language}
          leftIcon={{
            type: layout.iconType,
            name: layout.languageIconName,
            color: iconColors.language,
            backgroundColor: platformColors.yellowIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
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
          leftIcon={{
            type: layout.iconType,
            name: layout.securityIconName,
            color: iconColors.security,
            backgroundColor: platformColors.redIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
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
          leftIcon={{
            type: layout.iconType,
            name: layout.networkIconName,
            color: iconColors.network,
            backgroundColor: platformColors.blueIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={{
            type: layout.iconType,
            name: layout.toolsIconName,
            color: iconColors.tools,
            backgroundColor: platformColors.yellowIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('ToolsScreen')}
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
          leftIcon={{
            type: layout.iconType,
            name: layout.aboutIconName,
            color: iconColors.about,
            backgroundColor: platformColors.grayIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
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
