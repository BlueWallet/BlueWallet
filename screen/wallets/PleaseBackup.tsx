import { RouteProp, useFocusEffect, useLocale, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import SeedWords from '../../components/SeedWords';
import { useScreenProtect } from '../../hooks/useScreenProtect';

type RouteProps = RouteProp<AddWalletStackParamList, 'PleaseBackup'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'PleaseBackup'>;

const PleaseBackup: React.FC = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const navigation = useNavigation<NavigationProp>();
  const { isPrivacyBlurEnabled } = useSettings();
  const { colors } = useTheme();
  const { direction } = useLocale();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    pleaseText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
  });

  const handleBackButton = useCallback(() => {
    navigation.getParent()?.goBack();
    return true;
  }, [navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      subscription.remove();
    };
  }, [handleBackButton]);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect, isPrivacyBlurEnabled]),
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.flex, stylesHook.flex]}
      testID="PleaseBackupScrollView"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.please}>
        <Text style={[styles.pleaseText, stylesHook.pleaseText]}>{loc.pleasebackup.text}</Text>
      </View>
      <View style={styles.list}>
        <SeedWords seed={wallet.getSecret() ?? ''} />
      </View>
      <View style={styles.bottom}>
        <Button testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  please: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 8,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  bottom: {
    flexGrow: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pleaseText: {
    marginVertical: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PleaseBackup;
