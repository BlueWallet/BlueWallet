import React, { useCallback, useContext, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { BlueStorageContext } from '../../class/storage-context';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import PlatformListItem from '../../components/PlatformListItem';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
// Update to use new theme directory
import { usePlatformTheme } from '../../theme';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useTheme } from '../../components/themes';
import { useNavigation } from '@react-navigation/native';

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'SettingsTools'>;

const SettingsTools = () => {
  const { navigate } = useNavigation<NavigationProps>();
  const { colors: platformColors, layout } = usePlatformTheme();
  const { colors } = useTheme();
  const { styles } = useSettingsStyles();

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
