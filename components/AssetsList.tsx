/**
 * The Neurai assets (tokens) a wallet holds, in the settings' style.
 *
 * A summary card with how many there are, a search box when the list is long
 * and filter chips by type when there is more than one; then one card with a
 * row per asset (an icon for its type, its name and type, the amount held).
 * Tapping an asset opens a sheet with what can be done with it: send it (the
 * Send screen opens with the asset already chosen), copy its name, and for a
 * DePIN token, open the DePIN chat.
 *
 * Reads the wallet's cached list synchronously for an instant first paint,
 * then refreshes it on focus and on pull-to-refresh.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, InteractionManager, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDesktop } from '../blue_modules/environment';
import { formatAssetAmount, type NeuraiAssetType, type NeuraiHeldAsset } from '../blue_modules/neurai/assetUtils';
import { isNeuraiWallet } from '../class/wallets/is-neurai-wallet';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import useWalletSubscribe from '../hooks/useWalletSubscribe';
import loc from '../loc';
import Icon, { type MaterialIconName } from './Icon';
import NeuraiLoader from './NeuraiLoader';
import { SettingsCard, SettingsIconCircle, SettingsRow, SettingsSearchField, useSettingsPalette } from './settings/SettingsUI';

interface AssetsListProps {
  walletID: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Opens the wallet's DePIN section (offered on DePIN tokens). */
  onOpenDepin?: () => void;
}

/** Above this many assets, a search box comes up. */
const SEARCH_FROM = 6;
const COPIED_MS = 1_600;

const TYPE_ORDER: NeuraiAssetType[] = ['root', 'sub', 'unique', 'owner', 'depin', 'restricted', 'qualifier'];

const TYPE_INFO: Record<NeuraiAssetType, { icon: MaterialIconName; label: () => string; about: () => string }> = {
  root: { icon: 'toll', label: () => loc.assets.type_root, about: () => loc.assets.about_root },
  sub: { icon: 'subdirectory-arrow-right', label: () => loc.assets.type_sub, about: () => loc.assets.about_sub },
  unique: { icon: 'fingerprint', label: () => loc.assets.type_unique, about: () => loc.assets.about_unique },
  owner: { icon: 'vpn-key', label: () => loc.assets.type_owner, about: () => loc.assets.about_owner },
  restricted: { icon: 'lock', label: () => loc.assets.type_restricted, about: () => loc.assets.about_restricted },
  qualifier: { icon: 'verified', label: () => loc.assets.type_qualifier, about: () => loc.assets.about_qualifier },
  depin: { icon: 'hub', label: () => loc.assets.type_depin, about: () => loc.assets.about_depin },
};

const typeInfo = (type: NeuraiAssetType) => TYPE_INFO[type] ?? TYPE_INFO.root;

const countLabel = (count: number): string =>
  count === 1 ? loc.assets.count_one : (loc.formatString(loc.assets.count, { count }) as string);

/** A filter by type, raised in orange when chosen. */
const FilterChip: React.FC<{ label: string; count: number; active: boolean; onPress: () => void; testID?: string }> = ({
  label,
  count,
  active,
  onPress,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count}`}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? p.accentSoft : p.card, borderColor: active ? p.accent : 'transparent' },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, { color: active ? p.accentText : p.ink }]}>{label}</Text>
      <Text style={[styles.chipCount, { color: active ? p.accentText : p.mutedOnCard }]}>{count}</Text>
    </Pressable>
  );
};

const AssetRow: React.FC<{ asset: NeuraiHeldAsset; divider: boolean; onPress: () => void }> = ({ asset, divider, onPress }) => {
  const p = useSettingsPalette();
  const info = typeInfo(asset.type);
  const amount = formatAssetAmount(asset.amount);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${asset.name}, ${info.label()}, ${amount}`}
      testID={`Asset-${asset.name}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        pressed && styles.pressed,
      ]}
    >
      <SettingsIconCircle icon={info.icon} />
      <View style={styles.rowTexts}>
        <Text style={[styles.rowName, { color: p.ink }]} numberOfLines={1} ellipsizeMode="middle">
          {asset.name}
        </Text>
        <Text style={[styles.rowType, { color: p.mutedOnCard }]}>{info.label()}</Text>
      </View>
      <Text style={[styles.rowAmount, { color: p.ink }]} numberOfLines={1}>
        {amount}
      </Text>
    </Pressable>
  );
};

/** What can be done with one asset, from the bottom of the screen. */
const AssetSheet: React.FC<{
  asset: NeuraiHeldAsset | null;
  canSend: boolean;
  onClose: () => void;
  onSend: (asset: NeuraiHeldAsset) => void;
  onOpenDepin?: () => void;
}> = ({ asset, canSend, onClose, onSend, onOpenDepin }) => {
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setCopied(false);
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, [asset]);

  if (!asset) return null;
  const info = typeInfo(asset.type);
  const copyName = () => {
    Clipboard.setString(asset.name);
    AccessibilityInfo.announceForAccessibility(loc.assets.name_copied);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };
  const actions: Array<{ key: string; icon: MaterialIconName; title: string; onPress: () => void }> = [];
  if (canSend) actions.push({ key: 'send', icon: 'arrow-upward', title: loc.assets.send, onPress: () => onSend(asset) });
  actions.push({
    key: 'copy',
    icon: copied ? 'check' : 'content-copy',
    title: copied ? loc.assets.name_copied : loc.assets.copy_name,
    onPress: copyName,
  });
  if (asset.type === 'depin' && onOpenDepin) {
    actions.push({
      key: 'depin',
      icon: 'forum',
      title: loc.assets.open_depin,
      onPress: () => {
        onClose();
        onOpenDepin();
      },
    });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={loc._.close} />
        <View
          style={[styles.sheet, { backgroundColor: p.ground, paddingBottom: insets.bottom + 16 }]}
          accessibilityViewIsModal
          testID="AssetSheet"
        >
          <View style={[styles.grabber, { backgroundColor: p.mutedOnCard }]} />
          <View style={styles.sheetHead}>
            <View style={[styles.sheetIcon, { backgroundColor: p.accentSoft }]}>
              <Icon name={info.icon} type="material" size={26} color={p.accentText} />
            </View>
            <View style={styles.sheetTitles}>
              <Text style={[styles.sheetName, { color: p.ink }]} selectable accessibilityRole="header">
                {asset.name}
              </Text>
              <Text style={[styles.sheetType, { color: p.muted }]}>{info.label()}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={loc._.close}
              hitSlop={6}
              style={({ pressed }) => [styles.close, { backgroundColor: p.card }, pressed && styles.pressed]}
              testID="AssetSheetClose"
            >
              <Icon name="close" type="material" size={22} color={p.ink} />
            </Pressable>
          </View>

          <SettingsCard style={styles.sheetCard}>
            <Text style={[styles.sheetLabel, { color: p.mutedOnCard }]}>{loc.assets.held}</Text>
            <Text style={[styles.sheetAmount, { color: p.ink }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatAssetAmount(asset.amount)}
            </Text>
            <Text style={[styles.sheetAbout, { color: p.mutedOnCard }]}>{info.about()}</Text>
          </SettingsCard>

          <SettingsCard>
            {actions.map((action, index) => (
              <SettingsRow
                key={action.key}
                icon={action.icon}
                title={action.title}
                onPress={action.onPress}
                divider={index > 0}
                testID={`AssetAction-${action.key}`}
              />
            ))}
          </SettingsCard>
        </View>
      </View>
    </Modal>
  );
};

const AssetsList: React.FC<AssetsListProps> = ({ walletID, ListHeaderComponent, onOpenDepin }) => {
  const p = useSettingsPalette();
  const { navigate } = useExtendedNavigation();
  const wallet = useWalletSubscribe(walletID);
  const neurai = isNeuraiWallet(wallet) ? wallet : null;
  const assets = neurai ? neurai.getHeldAssetsCached() : [];
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NeuraiAssetType | 'all'>('all');
  const [selected, setSelected] = useState<NeuraiHeldAsset | null>(null);

  const refresh = useCallback(async () => {
    if (!neurai) return;
    setIsLoading(true);
    try {
      await neurai.refreshHeldAssets();
    } catch (err) {
      console.debug('AssetsList: refreshHeldAssets failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [neurai]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        refresh();
      });
      return () => task.cancel();
    }, [refresh]),
  );

  // A few dozen at most: sorting and counting on each render costs nothing.
  const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const counts = new Map<NeuraiAssetType, number>();
  for (const asset of sorted) counts.set(asset.type, (counts.get(asset.type) ?? 0) + 1);
  const presentTypes = TYPE_ORDER.filter(type => counts.has(type));
  // A filter left on a type that is no longer held would hide everything.
  const activeFilter = filter !== 'all' && counts.has(filter) ? filter : 'all';
  const needle = query.trim().toUpperCase();
  const shown = sorted.filter(
    asset => (activeFilter === 'all' || asset.type === activeFilter) && (!needle || asset.name.toUpperCase().includes(needle)),
  );

  const sendAsset = useCallback(
    (asset: NeuraiHeldAsset) => {
      setSelected(null);
      navigate('SendNeurai', { walletID, assetName: asset.name });
    },
    [navigate, walletID],
  );

  const header = (
    <View style={styles.header}>
      {ListHeaderComponent ? React.isValidElement(ListHeaderComponent) ? ListHeaderComponent : <ListHeaderComponent /> : null}
      <SettingsCard style={styles.summary} testID="AssetsSummary">
        <SettingsIconCircle icon="layers" />
        <View style={styles.summaryTexts}>
          <Text style={[styles.summaryTitle, { color: p.ink }]} accessibilityRole="header">
            {loc.assets.tab_assets}
          </Text>
          <Text style={[styles.summaryCount, { color: p.mutedOnCard }]} accessibilityLiveRegion="polite">
            {isLoading && sorted.length === 0 ? loc.assets.loading : countLabel(sorted.length)}
          </Text>
        </View>
        {isLoading && sorted.length > 0 ? <NeuraiLoader size={28} /> : null}
      </SettingsCard>
      {sorted.length > SEARCH_FROM ? (
        <SettingsSearchField value={query} onChangeText={setQuery} placeholder={loc.assets.search} testID="AssetsSearch" />
      ) : null}
      {presentTypes.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip
            label={loc.assets.filter_all}
            count={sorted.length}
            active={activeFilter === 'all'}
            onPress={() => setFilter('all')}
            testID="AssetsFilter-all"
          />
          {presentTypes.map(type => (
            <FilterChip
              key={type}
              label={typeInfo(type).label()}
              count={counts.get(type) ?? 0}
              active={activeFilter === type}
              onPress={() => setFilter(type)}
              testID={`AssetsFilter-${type}`}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const empty =
    isLoading && sorted.length === 0 ? (
      <View style={styles.empty}>
        <NeuraiLoader label={loc.assets.loading} />
      </View>
    ) : sorted.length === 0 ? (
      <View style={styles.empty} testID="AssetsListEmpty">
        <View style={[styles.emptyIcon, { backgroundColor: p.accentSoft }]}>
          <Icon name="layers" type="material" size={28} color={p.accentText} />
        </View>
        <Text style={[styles.emptyTitle, { color: p.ink }]}>{loc.assets.list_empty}</Text>
        <Text style={[styles.emptyText, { color: p.muted }]}>{loc.assets.empty_hint}</Text>
      </View>
    ) : (
      <View style={styles.empty} testID="AssetsNoMatch">
        <Text style={[styles.emptyText, { color: p.muted }]}>{loc.assets.no_match}</Text>
      </View>
    );

  return (
    <>
      <ScrollView
        style={{ backgroundColor: p.ground }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={!isDesktop ? <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={p.muted} /> : undefined}
        testID="AssetsList"
      >
        {header}
        {shown.length ? (
          // One card holding every row: rows with their own background left a
          // hairline of the ground between them at some scroll offsets.
          <SettingsCard testID="AssetsCard">
            {shown.map((asset, index) => (
              <AssetRow key={asset.name} asset={asset} divider={index > 0} onPress={() => setSelected(asset)} />
            ))}
          </SettingsCard>
        ) : (
          empty
        )}
      </ScrollView>
      <AssetSheet
        asset={selected}
        canSend={!!neurai?.allowSend()}
        onClose={() => setSelected(null)}
        onSend={sendAsset}
        onOpenDepin={onOpenDepin}
      />
    </>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  header: { rowGap: 14, marginBottom: 14 },
  summary: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingVertical: 14 },
  summaryTexts: { flex: 1, rowGap: 2 },
  summaryTitle: { fontSize: 18, fontWeight: '700' },
  summaryCount: { fontSize: 13 },
  chips: { columnGap: 8, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', columnGap: 6, height: 38, borderRadius: 19, borderWidth: 1.5, paddingHorizontal: 14 },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipCount: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  rowTexts: { flex: 1, rowGap: 2 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowType: { fontSize: 13 },
  rowAmount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], maxWidth: '40%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', rowGap: 10, paddingHorizontal: 24, paddingVertical: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 8, rowGap: 14 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, opacity: 0.4 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 4 },
  sheetIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sheetTitles: { flex: 1, rowGap: 2 },
  sheetName: { fontSize: 18, fontWeight: '700' },
  sheetType: { fontSize: 13, fontWeight: '600' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetCard: { paddingVertical: 16, rowGap: 4 },
  sheetLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  sheetAmount: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  sheetAbout: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});

export default AssetsList;
