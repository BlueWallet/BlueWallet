import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../components/platformThemes';
import { useStandardIcons } from '../../hooks/useStandardIcons';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  const { layout, colors: platformColors, sizing } = usePlatformTheme();
  const { styles, isAndroid } = useSettingsStyles();
  const getIcon = useStandardIcons();

  const settingsIcon = useMemo(() => getIcon('settings'), [getIcon]);
  const currencyIcon = useMemo(() => getIcon('currency'), [getIcon]);
  const languageIcon = useMemo(() => getIcon('language'), [getIcon]);
  const securityIcon = useMemo(() => getIcon('security'), [getIcon]);
  const networkIcon = useMemo(() => getIcon('network'), [getIcon]);
  const toolsIcon = useMemo(() => getIcon('tools'), [getIcon]);
  const aboutIcon = useMemo(() => getIcon('about'), [getIcon]);

  const localStyles = StyleSheet.create({
    sectionContainer: {
      marginBottom: isAndroid ? 0 : 16,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginBottom: isAndroid ? 0 : 16,
    },
    separator: {
      height: 1,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginLeft: 16,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      height: 48,
      justifyContent: 'center',
    },
    sectionHeaderText: {
      fontSize: 14,
      fontWeight: '500',
      color: platformColors.subtitleColor,
      textTransform: 'uppercase',
    },
  });

  const renderSeparator = isAndroid ? <View style={localStyles.separator} /> : null;

  const renderSectionHeader = (title: string) => {
    if (!isAndroid) return null;

    return (
      <View style={localStyles.sectionHeader}>
        <Text style={localStyles.sectionHeaderText}>{title}</Text>
      </View>
    );
  };

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {isAndroid && renderSectionHeader(loc.settings.header)}

      <View style={localStyles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={settingsIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...(isAndroid && { height: 56 }),
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
            ...(isAndroid && { height: 56 }),
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
            ...(isAndroid && { height: 56 }),
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
            ...(isAndroid && { height: 56 }),
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
            ...(isAndroid && { height: 56 }),
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
          isLast
        />
      </View>

      {isAndroid && renderSectionHeader(loc.settings.tools)}
      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={toolsIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...(isAndroid && { height: 56 }),
          }}
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>

      {isAndroid && renderSectionHeader(loc.settings.about)}
      <View style={localStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={aboutIcon}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
            ...(isAndroid && { height: 56 }),
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
