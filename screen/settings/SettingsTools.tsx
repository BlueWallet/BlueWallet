import React from 'react';
import { View } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import PlatformListItem from '../../components/PlatformListItem';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformStyles } from '../../theme/platformStyles';
import { useTheme } from '../../components/themes';

const SettingsTools = () => {
  const { navigate } = useExtendedNavigation();
  const { colors: platformColors, layout, styles } = usePlatformStyles();
  const { colors } = useTheme();

  const navigateToIsItMyAddress = () => {
    navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  const navigateToGenerateWord = () => {
    navigate('GenerateWord');
  };

  return (
    <SafeAreaScrollView style={styles.container}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.is_it_my_address.title}
          leftIcon={{
            type: layout.iconType,
            name: 'search-outline',
            color: colors.lnborderColor,
            backgroundColor: platformColors.yellowIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={navigateToIsItMyAddress}
          testID="IsItMyAddress"
          chevron
          bottomDivider={layout.showBorderBottom}
          isFirst
        />
        <PlatformListItem
          title={loc.settings.network_broadcast}
          leftIcon={{
            type: layout.iconType,
            name: 'paper-plane-outline',
            color: colors.buttonAlternativeTextColor,
            backgroundColor: platformColors.blueIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={navigateToBroadcast}
          testID="Broadcast"
          chevron
          bottomDivider={layout.showBorderBottom}
        />
        <PlatformListItem
          title={loc.autofill_word.title}
          leftIcon={{
            type: layout.iconType,
            name: 'key-outline',
            color: colors.successColor,
            backgroundColor: platformColors.greenIconBg,
          }}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={navigateToGenerateWord}
          testID="GenerateWord"
          chevron
          bottomDivider={layout.showBorderBottom}
          isLast
        />
      </View>
    </SafeAreaScrollView>
  );
};

export default SettingsTools;

