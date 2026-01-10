import React, { useMemo } from 'react';
import { StyleSheet, View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import PlatformListItem from '../../components/PlatformListItem';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformStyles } from '../../theme/platformStyles';
import { useTheme } from '../../components/themes';

const SettingsTools: React.FC = () => {
  const navigation = useExtendedNavigation();
  const { colors: platformColors, sizing, layout } = usePlatformStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  // Standard Android header is 56dp + status bar height
  // For older Android versions, use a fallback if StatusBar.currentHeight is not available
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
      marginBottom: sizing.sectionContainerMarginBottom,
    },
    itemContainer: {
      backgroundColor: platformColors.cardBackground,
      marginHorizontal: 0,
    },
  });

  const navigateToIsItMyAddress = () => {
    navigation.navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigation.navigate('Broadcast');
  };

  const navigateToGenerateWord = () => {
    navigation.navigate('GenerateWord');
  };

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer} headerHeight={headerHeight}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.is_it_my_address.title}
          leftIcon={{
            type: 'font-awesome-5',
            name: 'search',
            color: colors.lnborderColor,
            backgroundColor: platformColors.yellowIconBg,
          }}
          containerStyle={[
            styles.itemContainer,
            layout.showBorderRadius && {
              borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
              borderTopRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
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
          containerStyle={styles.itemContainer}
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
          containerStyle={[
            styles.itemContainer,
            layout.showBorderRadius && {
              borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
              borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
            },
          ]}
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
