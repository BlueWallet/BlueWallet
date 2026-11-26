/**
 * The backup of a hardware wallet, which this app cannot show: the device
 * only hands over its public key, and the recovery words appear on the
 * device itself, once, while the wallet is created on it. An animation of the
 * device going through those steps, ending on the words, says what to keep.
 * Opened instead of the export screen for hardware wallets.
 */
import React from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConnectFooter } from '../../components/ConnectUI';
import HardwareSetupAnimation from '../../components/HardwareSetupAnimation';
import { SettingsCard, SettingsScreenHeader, useSettingsPalette } from '../../components/settings/SettingsUI';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

type RouteProps = RouteProp<DetailViewStackParamList, 'HardwareBackupInfo'>;

const HardwareBackupInfo: React.FC = () => {
  const p = useSettingsPalette();
  const navigation = useNavigation();
  const { walletID } = useRoute<RouteProps>().params;
  const { wallets } = useStorage();
  const label = wallets.find(w => w.getID() === walletID)?.getLabel();

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="HardwareBackupInfo">
      <SettingsScreenHeader title={loc.wallets.hw_backup_title} onBack={() => navigation.goBack()} icon="close" iconLabel={loc._.close} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          {label ? <Text style={[styles.wallet, { color: p.accentText }]}>{label}</Text> : null}
          <Text style={[styles.introText, { color: p.muted }]}>{loc.wallets.hw_backup_intro}</Text>
        </View>
        <SettingsCard style={styles.card}>
          <HardwareSetupAnimation />
        </SettingsCard>
      </ScrollView>
      <ConnectFooter primary={{ title: loc.wallets.hw_backup_ok, onPress: () => navigation.goBack(), testID: 'HardwareBackupOk' }} />
    </View>
  );
};

export default HardwareBackupInfo;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 16 },
  intro: { rowGap: 4, paddingHorizontal: 4 },
  wallet: { fontSize: 13, fontWeight: '700' },
  introText: { fontSize: 14, lineHeight: 20 },
  card: { paddingVertical: 20 },
});
