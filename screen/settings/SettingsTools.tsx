import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import PlatformListItem from '../../components/PlatformListItem';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { usePlatformTheme } from '../../components/platformThemes';
import { useTheme } from '../../components/themes';

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'SettingsTools'>;

const SettingsTools = () => {
  const { navigate } = useNavigation<NavigationProps>();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: 16,
      marginBottom: sizing.sectionContainerMarginBottom,
    },
  });

  const navigateToIsItMyAddress = () => {
    navigate({ name: 'IsItMyAddress', params: {} });
  };

  const navigateToBroadcast = () => {
    navigate({ name: 'Broadcast', params: {} });
  };

  const navigateToGenerateWord = () => {
    navigate({ name: 'GenerateWord', params: undefined });
  };

  return (
    <SafeAreaScrollView style={styles.container}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.is_it_my_address.title}
          leftIcon={{
            type: layout.iconType,
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
            type: layout.iconType,
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
            type: layout.iconType,
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
