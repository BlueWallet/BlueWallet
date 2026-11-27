/**
 * A wallet's addresses, in the settings style: a search box, the receive /
 * change switch (not for PQ wallets, which have one chain) and the addresses
 * in one card that scrolls on its own. 20 at first, then 10 more at a time up
 * to 100, derived when the wallet has not yet. Used ones are marked; tapping
 * one opens it, with its options and transactions.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, InteractionManager, Keyboard, ListRenderItem, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_LISTED_ADDRESSES, NeuraiAddressEntry } from '../../class/wallets/abstract-neurai-wallet';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import presentAlert from '../../components/Alert';
import { isReportedSaveError } from '../../class/storage-errors';
import { AddressRow } from '../../components/addresses/AddressRow';
import NeuraiLoader from '../../components/NeuraiLoader';
import {
  SettingsCard,
  SettingsScreenHeader,
  SettingsSearchField,
  SettingsSegment,
  SettingsSegmented,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

type Tab = 'receive' | 'change';

const SEGMENTS: SettingsSegment<Tab>[] = [
  { value: 'receive', label: loc.addresses.type_receive, icon: 'call-received', testID: 'AddressesReceiveTab' },
  { value: 'change', label: loc.addresses.type_change, icon: 'autorenew', testID: 'AddressesChangeTab' },
];

const FIRST_PAGE = 20;
const PAGE = 10;

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletAddresses'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletAddresses'>;

/** Lets a spinner paint before work that holds the JS thread (deriving keys). */
const afterPaint = () => new Promise<void>(resolve => InteractionManager.runAfterInteractions(() => setTimeout(resolve, 30)));

const WalletAddresses: React.FC = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { wallets, saveToDisk } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const neurai = wallet && isNeuraiWallet(wallet) ? wallet : undefined;
  const isPQ = neurai?.walletKind === 'pq';

  const { isPrivacyBlurEnabled, isPQAddressReuseEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  const [tab, setTab] = useState<Tab>('receive');
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(FIRST_PAGE);
  const [entries, setEntries] = useState<NeuraiAddressEntry[]>(() => neurai?.getAddressEntries() ?? []);
  const [loading, setLoading] = useState(entries.length === 0);
  const [deriving, setDeriving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const list = useRef<FlatList<NeuraiAddressEntry>>(null);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect, isPrivacyBlurEnabled]),
  );

  // The engine (or a Legacy device's scan) comes up lazily: bring it up once,
  // after the loader has painted, since deriving holds the JS thread.
  useEffect(() => {
    if (!neurai) return;
    let cancelled = false;
    afterPaint()
      .then(() => neurai.loadAddresses())
      .then(() => {
        if (!cancelled) setEntries(neurai.getAddressEntries());
      })
      .catch(err => console.warn('loadAddresses failed:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [neurai]);

  /** Fetches the history, which says which addresses are used, and keeps it. */
  const refresh = useCallback(async () => {
    if (!neurai) return;
    setRefreshing(true);
    try {
      await neurai.fetchTransactions();
      await saveToDisk();
    } catch (err: any) {
      console.warn('fetchTransactions failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [neurai, saveToDisk]);

  // A wallet saved before addresses kept their transactions learns them now, once.
  const askedActivity = useRef(false);
  useEffect(() => {
    if (!neurai || loading || askedActivity.current || neurai.addressActivityKnown()) return;
    askedActivity.current = true;
    refresh();
  }, [neurai, loading, refresh]);

  // A new tab starts at its first page.
  useEffect(() => {
    setShown(FIRST_PAGE);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [tab]);

  const branch = useMemo(() => {
    const own = isPQ ? entries : entries.filter(e => e.change === (tab === 'change'));
    // PQ wallets reusing their address only ever hand out the first one.
    return isPQ && isPQAddressReuseEnabled ? own.slice(0, 1) : own;
  }, [entries, tab, isPQ, isPQAddressReuseEnabled]);

  const query = search.trim().toLowerCase();
  const data = useMemo(
    () => (query ? branch.filter(e => e.address.toLowerCase().includes(query)) : branch.slice(0, shown)),
    [branch, query, shown],
  );
  const canShowMore =
    !!neurai && !isPQ && !query && shown < MAX_LISTED_ADDRESSES && (branch.length > shown || neurai.canDeriveMoreAddresses());

  const showMore = useCallback(async () => {
    if (!neurai || deriving) return;
    const next = Math.min(shown + PAGE, MAX_LISTED_ADDRESSES);
    if (branch.length < next && neurai.canDeriveMoreAddresses()) {
      setDeriving(true);
      try {
        await afterPaint();
        await neurai.loadAddresses(next);
        setEntries(neurai.getAddressEntries());
        await saveToDisk();
      } catch (err: any) {
        if (!isReportedSaveError(err)) presentAlert({ message: err?.message ?? String(err) });
        return;
      } finally {
        setDeriving(false);
      }
    }
    setShown(next);
  }, [neurai, deriving, shown, branch.length, saveToDisk]);

  const open = useCallback(
    (entry: NeuraiAddressEntry) =>
      navigation.navigate('AddressDetails', { walletID, address: entry.address, index: entry.index, change: entry.change }),
    [navigation, walletID],
  );

  const keyExtractor = useCallback((entry: NeuraiAddressEntry) => entry.address, []);

  // `wallets` changes identity after every fetch or push, so the marks follow them.
  const renderRow = useCallback<ListRenderItem<NeuraiAddressEntry>>(
    ({ item, index }) => (
      <AddressRow
        address={item.address}
        index={item.index}
        used={!!neurai?.isAddressUsed(item.address)}
        onPress={() => open(item)}
        search={query}
        divider={index > 0}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [neurai, open, query, wallets],
  );

  const footer = canShowMore ? (
    <Pressable
      onPress={showMore}
      disabled={deriving}
      accessibilityRole="button"
      testID="AddressesShowMore"
      style={({ pressed }) => [styles.more, { borderTopColor: p.divider }, pressed && styles.pressed]}
    >
      {deriving ? (
        <NeuraiLoader size={34} />
      ) : (
        <Text style={[styles.moreText, { color: p.accentText }]}>
          {String(loc.formatString(loc.addresses.show_more, { count: Math.min(PAGE, MAX_LISTED_ADDRESSES - shown) }))}
        </Text>
      )}
    </Pressable>
  ) : null;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="WalletAddresses">
      <SettingsScreenHeader title={loc.addresses.addresses_title} onBack={() => navigation.goBack()} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
        <SettingsSearchField value={search} onChangeText={setSearch} placeholder={loc.addresses.search} testID="AddressesSearch" />
        {!isPQ && (
          <SettingsCard style={styles.padded}>
            <SettingsSegmented
              segments={SEGMENTS}
              value={tab}
              onChange={value => {
                Keyboard.dismiss();
                setTab(value);
              }}
              testID="AddressesTabs"
            />
          </SettingsCard>
        )}
        <SettingsCard style={styles.listCard}>
          {loading || !wallet ? (
            <NeuraiLoader label={loc.addresses.loading} style={styles.loader} />
          ) : (
            <FlatList
              ref={list}
              data={data}
              extraData={wallets}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyExtractor={keyExtractor}
              renderItem={renderRow}
              initialNumToRender={20}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListFooterComponent={footer}
              ListEmptyComponent={<Text style={[styles.empty, { color: p.mutedOnCard }]}>{loc.settings.search_empty}</Text>}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[p.accent]} tintColor={p.accent} />}
              testID="AddressesList"
            />
          )}
        </SettingsCard>
        {isPQ && isPQAddressReuseEnabled && (
          <Text style={[styles.note, { color: p.muted }]}>{loc.settings.pq_address_reuse_explanation}</Text>
        )}
      </View>
    </View>
  );
};

export default WalletAddresses;

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 16, rowGap: 12 },
  padded: { paddingVertical: 12 },
  // Sized to its rows, and no taller than the screen: past that the list scrolls inside the card.
  listCard: { flexShrink: 1, overflow: 'hidden' },
  list: { flexGrow: 0 },
  loader: { paddingVertical: 36 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4 },
  more: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth * 2 },
  moreText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
