import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../components/platformThemes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStandardIcons } from '../../hooks/useStandardIcons';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import { useTheme } from '../../components/themes';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  const { language } = useSettings();
  const { layout, colors: platformColors, sizing } = usePlatformTheme();
  const { styles, isAndroid } = useSettingsStyles();
  const { dark: isDarkMode } = useTheme();
  const getIcon = useStandardIcons();

  const settingsIcon = useMemo(() => getIcon('settings'), [getIcon, isDarkMode]);
  const currencyIcon = useMemo(() => getIcon('currency'), [getIcon, isDarkMode]);
  const languageIcon = useMemo(() => getIcon('language'), [getIcon, isDarkMode]);
  const securityIcon = useMemo(() => getIcon('security'), [getIcon, isDarkMode]);
  const networkIcon = useMemo(() => getIcon('network'), [getIcon, isDarkMode]);
  const toolsIcon = useMemo(() => getIcon('tools'), [getIcon, isDarkMode]);
  const aboutIcon = useMemo(() => getIcon('about'), [getIcon, isDarkMode]);

  const localStyles = StyleSheet.create({
    sectionContainer: {
      marginBottom: 16,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginBottom: 16,
    },
    separator: {
      height: 1,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginLeft: 16,
    },
  });

  const renderSeparator = isAndroid ? <View style={localStyles.separator} /> : null;

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={localStyles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={settingsIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />

        {renderSeparator}

        <PlatformListItem
          title={loc.settings.currency}
          leftIcon={currencyIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        {renderSeparator}

        <PlatformListItem
          title={loc.settings.language}
          leftIcon={languageIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        {renderSeparator}

        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={securityIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        {renderSeparator}

        <PlatformListItem
          title={loc.settings.network}
          leftIcon={networkIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
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
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
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
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
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
