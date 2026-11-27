/**
 * The words of a wallet just created, to write down before using it: a
 * warning, the words in a grid and "I wrote them down", which closes the add
 * flow. No way back from here: the wallet exists already. Always kept out of
 * screenshots and recordings.
 */
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { ConnectFooter, ConnectNoticeCard } from '../../components/ConnectUI';
import ScreenProtectionGate from '../../components/ScreenProtectionGate';
import RecoveryWords from '../../components/RecoveryWords';
import { SettingsScreenHeader, useSettingsPalette } from '../../components/settings/SettingsUI';
import { useStorage } from '../../hooks/context/useStorage';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

type RouteProps = RouteProp<AddWalletStackParamList, 'PleaseBackup'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'PleaseBackup'>;

const PleaseBackup: React.FC = () => {
  const p = useSettingsPalette();
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const navigation = useNavigation<NavigationProp>();
  const { enableScreenProtect, disableScreenProtect, isProtectionReady, isProtectionFailed } = useScreenProtect();

  const done = useCallback(() => {
    navigation.getParent()?.goBack();
    return true;
  }, [navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', done);
    return () => subscription.remove();
  }, [done]);

  // Recovery material is always protected, whatever the "Allow Screen Capture" setting says.
  useFocusEffect(
    useCallback(() => {
      enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect]),
  );

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.pleasebackup.title} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="PleaseBackupScrollView">
        <ConnectNoticeCard tone="warn" text={loc.pleasebackup.text} />
        <ScreenProtectionGate
          ready={isProtectionReady}
          failed={isProtectionFailed}
          onRetry={enableScreenProtect}
          loaderStyle={styles.loader}
        >
          <RecoveryWords words={wallet.getSecret()} />
        </ScreenProtectionGate>
      </ScrollView>
      <ConnectFooter primary={{ title: loc.pleasebackup.ok, onPress: done, testID: 'PleasebackupOk' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 16 },
  loader: { paddingVertical: 40 },
});

export default PleaseBackup;
