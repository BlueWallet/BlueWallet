/**
 * A wallet's backup: its recovery words (or other secret) to write down, then
 * as a QR to import it in another app. Never offered to copy (keyboards keep a
 * clipboard history), always kept out of screenshots and recordings, and
 * closed as soon as the app goes to the background.
 */
import React, { useEffect, useMemo } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { validateMnemonic } from '../../blue_modules/bip39';
import { ConnectNoticeCard } from '../../components/ConnectUI';
import ScreenProtectionGate from '../../components/ScreenProtectionGate';
import QRCode from '../../components/QRCode';
import RecoveryWords from '../../components/RecoveryWords';
import { SettingsCard, SettingsScreenHeader, SettingsSectionLabel, useSettingsPalette } from '../../components/settings/SettingsUI';
import { useStorage } from '../../hooks/context/useStorage';
import useAppState from '../../hooks/useAppState';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { WalletExportStackParamList } from '../../navigation/WalletExportStack';

type RouteProps = RouteProp<WalletExportStackParamList, 'WalletExport'>;

const MAX_QR_SIZE = 280;
/** Room around the QR across the screen: the screen's, the card's, the panel's and the white tile's padding. */
const QR_SIDE_ROOM = 16 + 16 + 14 + 8;

const WalletExport: React.FC = () => {
  const p = useSettingsPalette();
  const { width } = useWindowDimensions();
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const navigation = useNavigation();
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const { enableScreenProtect, disableScreenProtect, isProtectionReady, isProtectionFailed } = useScreenProtect();
  const { currentAppState, previousAppState } = useAppState();

  const secrets: string[] = useMemo(() => {
    try {
      const secret = wallet.getSecret();
      return typeof secret === 'string' ? [secret] : Array.isArray(secret) ? secret : [];
    } catch (error) {
      console.error('Failed to get wallet secret:', error);
      return [];
    }
  }, [wallet]);

  const secretIsMnemonic: boolean = useMemo(() => {
    return validateMnemonic(wallet.getSecret());
  }, [wallet]);

  // Leave on backgrounding. Protection stays on until the screen is gone, so neither the recents
  // thumbnail nor the closing frames show the secret.
  useEffect(() => {
    if (previousAppState === 'active' && currentAppState !== 'active') {
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAppState, previousAppState]);

  // Recovery material is always protected, whatever the "Allow Screen Capture" setting says.
  useEffect(() => {
    enableScreenProtect();
    return () => {
      disableScreenProtect();
    };
  }, [enableScreenProtect, disableScreenProtect]);

  const qrSize = Math.max(160, Math.min(width - QR_SIDE_ROOM * 2, MAX_QR_SIZE));
  const secret = secrets[0] ?? '';

  // Nothing secret is drawn until the window is protected.
  let content: React.ReactNode;
  if (!isProtectionReady) {
    content = <ScreenProtectionGate ready={false} failed={isProtectionFailed} onRetry={enableScreenProtect} loaderStyle={styles.loader} />;
  } else if (secrets.length !== 1) {
    // SLIP39: several shares, each written down on its own.
    content = (
      <>
        <Text style={[styles.note, { color: p.muted }]}>{loc.wallets.write_down}</Text>
        {secrets.map((share, index) => (
          <View key={share}>
            <SettingsSectionLabel>{String(loc.formatString(loc.wallets.share_number, { number: index + 1 }))}</SettingsSectionLabel>
            <RecoveryWords words={share} testID={`Secret-${index}`} />
          </View>
        ))}
      </>
    );
  } else {
    content = (
      <>
        <View>
          <SettingsSectionLabel>{loc.wallets.write_down_header}</SettingsSectionLabel>
          {secretIsMnemonic ? (
            <RecoveryWords words={secret} />
          ) : (
            <SettingsCard style={styles.secretCard}>
              <Text style={[styles.secret, { color: p.ink }]} testID="Secret">
                {secret}
              </Text>
            </SettingsCard>
          )}
          <Text style={[styles.note, { color: p.muted }]}>{loc.wallets.write_down}</Text>
        </View>
        <View>
          <SettingsSectionLabel>{loc.wallets.export_qr}</SettingsSectionLabel>
          <SettingsCard style={styles.qrCard}>
            <View style={[styles.panel, { backgroundColor: p.ground }]}>
              <View style={styles.qrTile}>
                <QRCode isMenuAvailable={false} value={secret} size={qrSize} logoSize={70} />
              </View>
            </View>
            <Text style={[styles.qrNote, { color: p.mutedOnCard }]}>{loc.wallets.scan_import}</Text>
          </SettingsCard>
        </View>
      </>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.wallets.export_title} onBack={() => navigation.goBack()} icon="close" iconLabel={loc._.close} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="WalletExportScroll">
        <ConnectNoticeCard tone="danger" text={loc.wallets.warning_do_not_disclose} />
        {content}
        {isProtectionReady ? (
          <Text style={[styles.type, { color: p.muted }]}>
            {String(loc.formatString(loc.wallets.wallet_type_this, { type: wallet.typeReadable }))}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, rowGap: 20 },
  loader: { paddingVertical: 48 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 8, marginHorizontal: 4 },
  secretCard: { paddingVertical: 16 },
  secret: { fontFamily: 'monospace', fontSize: 15, lineHeight: 22 },
  qrCard: { paddingVertical: 16, rowGap: 12 },
  panel: { borderRadius: 20, padding: 14, alignItems: 'center' },
  qrTile: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 8 },
  qrNote: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  type: { fontSize: 12, textAlign: 'center' },
});

export default WalletExport;
