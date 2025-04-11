import React from 'react';
import { View } from 'react-native';
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
  const { layout } = usePlatformTheme();
  const { styles, isAndroid } = useSettingsStyles();
  const getIcon = useStandardIcons();
  const extendedStyles = { ...styles, sectionContainer: {} };

  // Use platform-specific separator styling
  const separatorStyle = { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' };
  const renderSeparator = isAndroid ? <View style={separatorStyle} /> : null;

  return (
    <SafeAreaScrollView>
      <View style={extendedStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.general}
          leftIcon={getIcon('settings')}
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
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
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          bottomDivider={layout.showBorderBottom}
        />

        {renderSeparator}

        <PlatformListItem
          title={loc.settings.language}
          leftIcon={getIcon('language')}
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          bottomDivider={layout.showBorderBottom}
          isLast
        />
      </View>

      <View style={extendedStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.encrypt_title}
          leftIcon={getIcon('security')}
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
          isLast
        />
      </View>

      <View style={extendedStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.network}
          leftIcon={getIcon('network')}
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.tools}
          leftIcon={getIcon('tools')}
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={layout.showBorderBottom}
          isLast
        />
      </View>

      <View style={extendedStyles.sectionContainer}>
        <PlatformListItem
          title={loc.settings.about}
          leftIcon={getIcon('about')}
          containerStyle={[styles.listItemContainer, styles.itemHeight]}
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
