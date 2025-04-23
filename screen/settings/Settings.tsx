import React, { useMemo } from 'react';
import { View } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformStyles } from '../../theme/platformStyles';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  const { 
    colors, 
    styles, 
    layout, 
    isAndroid, 
    getIcon,
    renderSeparator,
    sizing
  } = usePlatformStyles();

  const settingsIcon = useMemo(() => getIcon('settings'), [getIcon]);
  const currencyIcon = useMemo(() => getIcon('currency'), [getIcon]);
  const languageIcon = useMemo(() => getIcon('language'), [getIcon]);
  const securityIcon = useMemo(() => getIcon('security'), [getIcon]);
  const networkIcon = useMemo(() => getIcon('network'), [getIcon]);
  const toolsIcon = useMemo(() => getIcon('tools'), [getIcon]);
  const aboutIcon = useMemo(() => getIcon('about'), [getIcon]);

  return (
    <SafeAreaScrollView testID="SettingsRoot" style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={settingsIcon}
          containerStyle={{
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
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
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
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
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
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
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
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
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
          }}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
          isLast
        />
      </View>

      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={toolsIcon}
          containerStyle={{
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
          }}
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false}
          isFirst
          isLast
        />
      </View>

      <View style={styles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={aboutIcon}
          containerStyle={{
            backgroundColor: colors.cardBackground,
            ...(isAndroid && { height: sizing.itemMinHeight }),
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
