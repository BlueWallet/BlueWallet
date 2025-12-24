import React, { useMemo } from 'react';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android' && insets.top > 0) {
      return 56 + (StatusBar.currentHeight || insets.top);
    }
    return 0;
  }, [insets.top]);

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
    <SafeAreaScrollView style={styles.container} headerHeight={headerHeight}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.is_it_my_address.title}
          leftIcon={{
            type: 'font-awesome-5',
            name: 'search',
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
            type: 'font-awesome-5',
            name: 'paper-plane',
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
            type: 'font-awesome-5',
            name: 'key',
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
