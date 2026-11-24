/**
 * The waiting room of Neurai Connect.
 *
 * A scanned `nc:` code only carries a topic and a symmetric key: it says how
 * to listen, not what the site wants. The wallet subscribes to the pairing
 * topic and the site then publishes its `wc_sessionAuthenticate` or
 * `wc_sessionPropose` on it, so there is always a gap — usually well under a
 * second, but a gap — between scanning and knowing which approval screen to
 * show. This screen is that gap made visible.
 *
 * It shows the relay host while it waits, because the relay is the only third
 * party in the exchange and the user is entitled to know which one is carrying
 * it, and it gives up after 30 seconds rather than spinning forever: a QR code
 * whose page was closed, or a pairing whose 5 minute TTL had already elapsed,
 * produces exactly this silence.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ConnectFooter } from '../../components/ConnectUI';
import Icon from '../../components/Icon';
import { SettingsCard, SettingsScreenHeader, useSettingsPalette } from '../../components/settings/SettingsUI';
import { onConnectIncoming, pairWithUri } from '../../blue_modules/neurai/connect/client';
import { getRelayUrl } from '../../blue_modules/neurai/connect/config';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { describeError, relayHost, screenForIncoming } from './logic';

type RouteProps = RouteProp<DetailViewStackParamList, 'ConnectPair'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ConnectPair'>;

/** How long the site is given to publish its request before we call it a failure. */
const WAIT_FOR_REQUEST_MS = 30_000;

const ConnectPair: React.FC = () => {
  const p = useSettingsPalette();
  const route = useRoute<RouteProps>();
  const navigation = useExtendedNavigation<NavigationProps>();
  const uri = route.params?.uri ?? '';
  const [failure, setFailure] = useState<string | undefined>();
  const host = relayHost(getRelayUrl());

  useEffect(() => {
    if (!uri) {
      setFailure(loc.connect.pair_no_uri);
      return;
    }
    let answered = false;

    // Subscribe before pairing: the site may already be publishing, and an
    // event that arrives while `pair()` is still awaiting must not be missed.
    const unsubscribe = onConnectIncoming(item => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      navigation.replace(screenForIncoming(item.kind), { id: item.id });
    });

    const timer = setTimeout(() => {
      if (answered) return;
      answered = true;
      setFailure(loc.connect.pair_timeout);
    }, WAIT_FOR_REQUEST_MS);

    pairWithUri(uri).catch((error: unknown) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      setFailure(loc.formatString(loc.connect.pair_failed, { error: describeError(error) }));
    });

    return () => {
      answered = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [uri, navigation]);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="ConnectPairScreen">
      <SettingsScreenHeader title={loc.connect.pair_title} onBack={onClose} icon="close" iconLabel={loc.connect.close} />
      <View style={styles.body}>
        <SettingsCard style={styles.card}>
          <View style={[styles.circle, { backgroundColor: failure ? p.fail.bg : p.accentSoft }]}>
            {failure ? (
              <Icon name="link-off" type="material" size={30} color={p.fail.dot} />
            ) : (
              <ActivityIndicator size="large" color={p.accent} />
            )}
          </View>
          <Text style={[styles.title, { color: p.ink }]} accessibilityLiveRegion="polite">
            {failure ?? loc.connect.pair_waiting}
          </Text>
          <Text style={[styles.hint, { color: p.mutedOnCard }]}>
            {failure ? loc.connect.pair_retry_hint : loc.formatString(loc.connect.pair_relay, { relay: host })}
          </Text>
        </SettingsCard>
      </View>
      {failure && <ConnectFooter primary={{ title: loc.connect.close, onPress: onClose, testID: 'ConnectPairClose' }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', padding: 16 },
  card: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, rowGap: 12 },
  circle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});

export default ConnectPair;
