/**
 * One address of a wallet: what it is (index, receive or change, used or
 * not), what can be done with it (copy, share, receive to it, look it up in
 * the explorer, copy its private key) and the transactions that touched it,
 * by day like the history.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { useAddressMenu } from '../../components/addresses/useAddressMenu';
import HomeActions, { HomeAction } from '../../components/home/HomeActions';
import { TransactionDayCard, transactionDayKey, useTransactionDays } from '../../components/home/TransactionDayList';
import {
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { getBlockExplorerUrl, getBlockExplorerUrlForWallet, getTestnetBlockExplorerUrl } from '../../models/blockExplorer';
import { XnaUnit } from '../../models/xnaUnits';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const PAGE = 20;

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'AddressDetails'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'AddressDetails'>;

const AddressDetails: React.FC = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { walletID, address, index, change } = useRoute<RouteProps>().params;
  const { wallets } = useStorage();
  const wallet = wallets.find(w => w.getID() === walletID);
  const neurai = wallet && isNeuraiWallet(wallet) ? wallet : undefined;
  const allowSignVerifyMessage = (wallet && 'allowSignVerifyMessage' in wallet && wallet.allowSignVerifyMessage()) ?? false;
  const { copy, share, exportPrivateKey, canExportPrivateKey } = useAddressMenu({ walletID, address, allowSignVerifyMessage });

  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect, isPrivacyBlurEnabled]),
  );

  const [explorerUrl, setExplorerUrl] = useState('');
  useEffect(() => {
    Promise.all([getBlockExplorerUrl(), getTestnetBlockExplorerUrl()])
      .then(([mainnet, testnet]) => setExplorerUrl(getBlockExplorerUrlForWallet(wallet, mainnet, testnet)))
      .catch(() => {});
  }, [wallet]);

  // `wallets` changes identity after every fetch or push, so these follow them.
  const known = !!neurai?.addressActivityKnown();
  const txids = neurai?.getAddressTxids(address);
  const used = !!txids && txids.length > 0;
  const transactions = useMemo(() => {
    const own = new Set(txids ?? []);
    return (wallet?.getTransactions() ?? []).filter(tx => own.has(tx.txid)).sort((a, b) => b.timestamp - a.timestamp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, wallets, txids?.join()]);
  const [shown, setShown] = useState(PAGE);
  const days = useTransactionDays(transactions, shown);
  const unit = wallet?.getPreferredBalanceUnit() ?? XnaUnit.XNA;

  const actions = useMemo<HomeAction[]>(() => {
    const list: HomeAction[] = [
      { key: 'copy', label: loc.home.copy, icon: 'content-copy', testID: 'AddressCopy', onPress: copy },
      { key: 'share', label: loc.receive.action_share, icon: 'share', testID: 'AddressShare', onPress: share },
      {
        key: 'receive',
        label: loc.receive.header,
        icon: 'qr-code-2',
        testID: 'AddressReceive',
        onPress: () => navigation.navigate('ReceiveDetails', { walletID, address }),
      },
    ];
    if (explorerUrl) {
      list.push({
        key: 'explorer',
        label: loc.addresses.explorer,
        icon: 'travel-explore',
        testID: 'AddressExplorer',
        onPress: () => Linking.openURL(`${explorerUrl}/address/${encodeURIComponent(address)}`),
      });
    }
    return list;
  }, [copy, share, navigation, walletID, address, explorerUrl]);

  const branch = change ? loc.addresses.type_change : loc.addresses.type_receive;
  const status = !known && !used ? undefined : used ? loc.addresses.used : loc.addresses.unused;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="AddressDetails">
      <SettingsScreenHeader title={loc.addresses.address} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SettingsCard style={styles.hero}>
          <View style={styles.heroHead}>
            <View style={[styles.badge, { backgroundColor: p.accentSoft }]}>
              <Text style={[styles.badgeText, { color: p.accentText }]} numberOfLines={1} adjustsFontSizeToFit>
                {index}
              </Text>
            </View>
            <View style={styles.texts}>
              <Text style={[styles.heroTitle, { color: p.ink }]}>{branch}</Text>
              {status && (
                <View style={styles.statusRow} testID="AddressStatus">
                  <View style={[styles.dot, { backgroundColor: used ? p.mutedOnCard : p.ok.dot }]} />
                  <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{status}</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable
            onPress={copy}
            accessibilityRole="button"
            accessibilityLabel={`${loc.addresses.copy_address}, ${address}`}
            style={({ pressed }) => [styles.addressBox, { backgroundColor: p.ground }, pressed && styles.pressed]}
          >
            <Text style={[styles.address, { color: p.ink }]} selectable testID="AddressText">
              {address}
            </Text>
          </Pressable>
        </SettingsCard>

        <HomeActions actions={actions} />

        {canExportPrivateKey && (
          <SettingsCard>
            <SettingsRow icon="key" title={loc.addresses.copy_private_key} onPress={exportPrivateKey} testID="AddressPrivateKey" />
          </SettingsCard>
        )}

        <View>
          <SettingsSectionLabel>{loc.addresses.transactions}</SettingsSectionLabel>
          {days.length > 0 ? (
            <View style={styles.days}>
              {days.map(day => (
                <TransactionDayCard key={transactionDayKey(day)} day={day} unit={unit} walletID={walletID} />
              ))}
              {transactions.length > shown && (
                <Pressable
                  onPress={() => setShown(n => n + PAGE)}
                  accessibilityRole="button"
                  testID="AddressTransactionsMore"
                  style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                >
                  <Text style={[styles.moreText, { color: p.accentText }]}>
                    {String(loc.formatString(loc.addresses.show_more, { count: Math.min(PAGE, transactions.length - shown) }))}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <SettingsCard>
              <Text style={[styles.empty, { color: p.mutedOnCard }]} testID="AddressNoTransactions">
                {known ? loc.addresses.no_transactions : '…'}
              </Text>
            </SettingsCard>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default AddressDetails;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16, rowGap: 14 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 18, fontWeight: '700' },
  texts: { flex: 1, rowGap: 4 },
  heroTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  addressBox: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  address: { fontFamily: 'monospace', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  days: { rowGap: 4 },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
