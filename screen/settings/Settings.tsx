import React from 'react';
import { View, StyleSheet } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../components/platformThemes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStandardIcons } from '../../hooks/useStandardIcons';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useSettings();
  const { layout, colors: platformColors, sizing } = usePlatformTheme();
  const { styles, isAndroid } = useSettingsStyles();

  const getIcon = useStandardIcons();

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
      marginLeft: 16, // Add 16px padding to the left
    },
  });

  // Use platform-specific separator styling with left padding
  const renderSeparator = isAndroid ? <View style={localStyles.separator} /> : null;

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* First section - General, Currency, Language, Security, Network */}
      <View style={localStyles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={getIcon('settings')}
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
          leftIcon={getIcon('currency')}
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
          leftIcon={getIcon('language')}
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
          leftIcon={getIcon('security')}
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
          leftIcon={getIcon('network')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false} // Last item should not have a bottom divider
          isLast
        />
      </View>

      {/* Second section - Tools */}
      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={getIcon('tools')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false} // Single item section should not have a bottom divider
          isFirst
          isLast
        />
      </View>

      {/* Third section - About */}
      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={getIcon('about')}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={false} // Single item section should not have a bottom divider
          isFirst
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default Settings;
