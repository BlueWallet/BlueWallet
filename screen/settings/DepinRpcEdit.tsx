/**
 * The server DePIN talks to, per network: the wallet's own WSS service (the
 * default) or one for DePIN alone, such as a DePIN node on the LAN serving a
 * token of its own: a neurai-wallet-services endpoint, `wss://`, or `ws://`
 * only on the local network. The wallet keeps its service whichever is chosen
 * here. Opened from the gear of the DePIN section.
 */
import React, { useEffect, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  CHAIN_PARAMS,
  chainFor,
  getDepinWssOverride,
  getIncompatibleDepinServer,
  getWssUrlOverride,
  isAllowedDepinServerUrl,
  loadDepinRpcOverrides,
  NeuraiNetwork,
  setDepinWssOverride,
} from '../../blue_modules/neurai';
import presentAlert from '../../components/Alert';
import { ConnectFooter, ConnectNoticeCard, ConnectOption } from '../../components/ConnectUI';
import { SettingsCard, SettingsScreenHeader, SettingsSectionLabel, useSettingsPalette } from '../../components/settings/SettingsUI';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

type RouteProps = RouteProp<DetailViewStackParamList, 'DepinRpcEdit'>;
type Choice = 'wallet' | 'own';

const DepinRpcEdit: React.FC = () => {
  const p = useSettingsPalette();
  const navigation = useExtendedNavigation();
  const network: NeuraiNetwork = useRoute<RouteProps>().params?.network ?? 'mainnet';
  const walletUrl = getWssUrlOverride(network) ?? CHAIN_PARAMS[chainFor(network, 'legacy')].defaultWssUrl;

  // A saved server the current policy refuses is still the user's choice: shown
  // here to be corrected, not swapped for the wallet's.
  const savedOwn = () => getDepinWssOverride(network) ?? getIncompatibleDepinServer(network);
  const [choice, setChoice] = useState<Choice>(() => (savedOwn() ? 'own' : 'wallet'));
  const [url, setUrl] = useState(() => savedOwn() ?? '');
  const [incompatible, setIncompatible] = useState(() => getIncompatibleDepinServer(network));
  const [saving, setSaving] = useState(false);

  // The saved choice, once the stored settings are loaded.
  useEffect(() => {
    let cancelled = false;
    loadDepinRpcOverrides()
      .then(() => {
        if (cancelled) return;
        const own = getDepinWssOverride(network) ?? getIncompatibleDepinServer(network);
        setChoice(own ? 'own' : 'wallet');
        setUrl(own ?? '');
        setIncompatible(getIncompatibleDepinServer(network));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [network]);

  const save = async () => {
    Keyboard.dismiss();
    const trimmed = url.trim();
    if (choice === 'own' && !isAllowedDepinServerUrl(trimmed)) {
      presentAlert({ message: loc.depin.server_invalid });
      return;
    }
    setSaving(true);
    try {
      await setDepinWssOverride(network, choice === 'own' ? trimmed : null);
      navigation.goBack();
    } catch (err: any) {
      presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setSaving(false);
    }
  };

  const networkName = network === 'testnet' ? loc.wallets.neurai_network_testnet : loc.wallets.neurai_network_mainnet;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.depin.server_title} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {incompatible ? (
          <ConnectNoticeCard
            tone="warn"
            text={loc.formatString(loc.depin.server_incompatible_edit, { url: incompatible })}
            testID="DepinServerIncompatibleEdit"
          />
        ) : null}
        <ConnectNoticeCard tone="quiet" text={loc.depin.server_intro} />
        <View>
          <SettingsSectionLabel>{networkName}</SettingsSectionLabel>
          <SettingsCard>
            <ConnectOption
              icon="account-balance-wallet"
              title={loc.depin.server_wallet}
              detail={walletUrl}
              selected={choice === 'wallet'}
              onPress={() => setChoice('wallet')}
              testID="DepinServerWallet"
            />
            <ConnectOption
              icon="dns"
              title={loc.depin.server_own}
              subtitle={loc.depin.server_own_explain}
              selected={choice === 'own'}
              onPress={() => setChoice('own')}
              divider
              testID="DepinServerOwn"
            />
          </SettingsCard>
        </View>
        {choice === 'own' ? (
          <View>
            <SettingsSectionLabel>{loc.depin.server_address}</SettingsSectionLabel>
            <SettingsCard>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="wss://"
                placeholderTextColor={p.mutedOnCard}
                selectionColor={p.accent}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                style={[styles.input, { color: p.ink }]}
                underlineColorAndroid="transparent"
                testID="DepinServerUrl"
              />
            </SettingsCard>
          </View>
        ) : null}
      </ScrollView>
      <ConnectFooter primary={{ title: loc.depin.server_save, onPress: save, disabled: saving, testID: 'DepinServerSave' }} />
    </View>
  );
};

export default DepinRpcEdit;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  input: { fontFamily: 'monospace', fontSize: 14, minHeight: 56, paddingVertical: 14, paddingHorizontal: 0 },
});
