/**
 * A wallet's extended public key (xpub), what a watch-only wallet needs to
 * follow it: its QR over the key (a tap on the key copies it), copy and share,
 * and a line on what it gives away.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { NavigationProp, RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Share from 'react-native-share';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import presentAlert, { AlertType } from '../../components/Alert';
import HandOffComponent from '../../components/HandOffComponent';
import HomeActions, { HomeAction } from '../../components/home/HomeActions';
import { walletKindIcon, walletKindLabel } from '../../components/home/homeTheme';
import Icon from '../../components/Icon';
import NeuraiLoader from '../../components/NeuraiLoader';
import QRCode from '../../components/QRCode';
import { SettingsCard, SettingsScreenHeader, useSettingsPalette } from '../../components/settings/SettingsUI';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';

type WalletXpubRouteProp = RouteProp<{ params: { walletID: string; xpub: string } }, 'params'>;
export type RootStackParamList = {
  WalletXpub: {
    walletID: string;
    xpub: string;
  };
};

const MAX_QR_SIZE = 280;
/** Room around the QR across the screen: the screen's, the card's, the panel's and the white tile's padding. */
const QR_SIDE_ROOM = 16 + 16 + 14 + 8;

const WalletXpub: React.FC = () => {
  const p = useSettingsPalette();
  const { width } = useWindowDimensions();
  const { wallets } = useStorage();
  const route = useRoute<WalletXpubRouteProp>();
  const { walletID, xpub } = route.params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [xPubText, setXPubText] = useState<string | undefined>(undefined);
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'WalletXpub'>>();
  const lastWalletIdRef = useRef<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      // Skip execution if walletID hasn't changed
      if (lastWalletIdRef.current === walletID) {
        return;
      }
      let cancelled = false;
      (async () => {
        if (wallet) {
          const walletXpub = wallet.getXpub();
          if (!cancelled && xpub !== walletXpub) {
            navigation.setParams({ xpub: walletXpub || undefined });
          }
          if (!cancelled) setIsLoading(false);
        } else if (xpub && !cancelled) {
          setIsLoading(false);
        }
      })();
      lastWalletIdRef.current = walletID;
      return () => {
        disableScreenProtect();
        cancelled = true;
      };
    }, [isPrivacyBlurEnabled, walletID, wallet, xpub, navigation, enableScreenProtect, disableScreenProtect]),
  );

  useEffect(() => {
    setXPubText(xpub);
  }, [wallet, xpub]);

  const text = xPubText || xpub || '';
  const qrSize = Math.max(160, Math.min(width - QR_SIDE_ROOM * 2, MAX_QR_SIZE));

  const copy = useCallback(() => {
    Clipboard.setString(text);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    presentAlert({ message: loc.wallets.xpub_copiedToClipboard, type: AlertType.Toast });
  }, [text]);

  const share = useCallback(() => {
    Share.open({ message: text }).catch(error => console.debug('Share:', error));
  }, [text]);

  const actions: HomeAction[] = [
    { key: 'copy', label: loc.home.copy, icon: 'content-copy', testID: 'XpubCopy', onPress: copy },
    { key: 'share', label: loc.receive.action_share, icon: 'share', testID: 'XpubShare', onPress: share },
  ];

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.wallets.xpub_title} onBack={() => navigation.goBack()} icon="close" iconLabel={loc._.close} />
      {isLoading ? (
        <View style={styles.busy}>
          <NeuraiLoader />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SettingsCard style={styles.hero}>
            {wallet ? (
              <View style={styles.heroHead}>
                <View style={[styles.badge, { backgroundColor: p.accentSoft }]}>
                  <Icon name={walletKindIcon(wallet)} type="material" size={24} color={p.accentText} />
                </View>
                <View style={styles.texts}>
                  <Text style={[styles.heroTitle, { color: p.ink }]} numberOfLines={1}>
                    {wallet.getLabel()}
                  </Text>
                  <Text style={[styles.heroSub, { color: p.mutedOnCard }]} numberOfLines={1}>
                    {walletKindLabel(wallet)}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={[styles.panel, { backgroundColor: p.ground }]}>
              <View style={styles.qrTile}>
                <QRCode value={text} size={qrSize} />
              </View>
              <Pressable
                onPress={copy}
                accessibilityRole="button"
                accessibilityLabel={`${loc.home.copy}, ${text}`}
                style={({ pressed }) => [styles.keyBox, pressed && styles.pressed]}
              >
                <Text style={[styles.key, { color: p.ink }]} selectable testID="XpubText">
                  {text}
                </Text>
              </Pressable>
            </View>
          </SettingsCard>
          <HomeActions actions={actions} />
          <Text style={[styles.note, { color: p.muted }]}>{loc.wallets.xpub_explain}</Text>
        </ScrollView>
      )}
      <HandOffComponent title={loc.wallets.xpub_title} type={HandOffActivityType.Xpub} userInfo={{ xpub: xPubText }} />
    </View>
  );
};

export default WalletXpub;

const styles = StyleSheet.create({
  root: { flex: 1 },
  busy: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, rowGap: 16 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16, rowGap: 14 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, rowGap: 2 },
  heroTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  heroSub: { fontSize: 13 },
  panel: { borderRadius: 20, padding: 14, paddingBottom: 6, alignItems: 'center', rowGap: 12 },
  qrTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  keyBox: { alignSelf: 'stretch', borderRadius: 14, paddingHorizontal: 6, paddingVertical: 8 },
  key: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  note: { fontSize: 13, lineHeight: 18, marginHorizontal: 8, textAlign: 'center' },
});
