import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCompactXna, splitShortenedAmount } from '../../blue_modules/neurai/amounts';
import type { NeuraiNetwork } from '../../blue_modules/neurai/networkConfig';
import { NETWORKS, walletNetwork } from '../../blue_modules/neurai/networkSelection';
import type { TWallet } from '../../class/wallets/types';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import { XnaUnit } from '../../models/xnaUnits';
import Icon from '../Icon';
import { HOME_MAX_DECIMALS, useHomePalette, walletKindIcon, walletKindLabel } from './homeTheme';

const NEURAI_LOGO = require('../../img/addWallet/neurai.png');

const networkLabel = (network: NeuraiNetwork): string =>
  network === 'testnet' ? loc.wallets.neurai_network_testnet : loc.wallets.neurai_network_mainnet;

/** XNA with at most HOME_MAX_DECIMALS decimals, cut not rounded. */
const xna = (sats: bigint): [string, string] => {
  const [integer, decimals] = splitShortenedAmount(formatBalanceWithoutSuffix(sats, XnaUnit.XNA, true), HOME_MAX_DECIMALS);
  return [integer, decimals];
};

/**
 * The side panel the wallet name on the home opens: Mainnet / Testnet on top
 * so the two never mix, the network's total, and one small card per wallet.
 * Picking a card puts that wallet on the home.
 */
const HomeWalletsPanel: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
  const p = useHomePalette();
  const insets = useSafeAreaInsets();
  const { navigate } = useExtendedNavigation();
  const { wallets } = useStorage();
  const { wallet: current, network, select } = useHomeWallet();
  const drawerStatus = useDrawerStatus();
  const [view, setView] = useState<NeuraiNetwork>(network);

  // Every opening starts on the network of the wallet on screen.
  useEffect(() => {
    if (drawerStatus === 'open') setView(network);
  }, [drawerStatus, network]);

  const byNetwork = useMemo(() => {
    const groups: Record<NeuraiNetwork, TWallet[]> = { mainnet: [], testnet: [] };
    for (const w of wallets) groups[walletNetwork(w)].push(w);
    return groups;
  }, [wallets]);

  const list = byNetwork[view];
  const total = list.reduce<bigint>((sum, w) => (w.hideBalance ? sum : sum + (w.getBalance() ?? 0n)), 0n);
  const [totalInt, totalDec] = xna(total);

  const pick = (w: TWallet) => {
    select(w.getID());
    navigation.closeDrawer();
  };
  const addWallet = () => {
    navigation.closeDrawer();
    navigate('AddWalletRoot');
  };
  const manageWallets = () => {
    navigation.closeDrawer();
    // A screen of the stack inside the drawer: name the stack, then the screen.
    navigation.navigate('DetailViewStackScreensStack', { screen: 'ManageWallets' });
  };

  return (
    <View style={[styles.root, { backgroundColor: p.card, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={NEURAI_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
            {loc.home.wallets}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.closeDrawer()}
          accessibilityRole="button"
          accessibilityLabel={loc.home.close}
          style={({ pressed }) => [styles.close, { backgroundColor: p.ground }, pressed && styles.pressed]}
        >
          <Icon name="close" type="material" size={20} color={p.ink} />
        </Pressable>
      </View>

      <View style={[styles.segments, { backgroundColor: p.ground }]} accessibilityRole="tablist">
        {NETWORKS.map(n => {
          const active = n === view;
          return (
            <Pressable
              key={n}
              onPress={() => setView(n)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`HomePanelNetwork-${n}`}
              style={[styles.segment, active && [styles.segmentActive, { backgroundColor: p.card, shadowColor: p.shadow }]]}
            >
              <Text style={[styles.segmentText, { color: active ? p.ink : p.muted }]}>{networkLabel(n)}</Text>
              <Text style={[styles.segmentCount, { color: p.muted }]}>{byNetwork[n].length}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.total}>
        <Text style={[styles.totalLabel, { color: p.mutedOnCard }]}>
          {loc.formatString(loc.home.network_total, { network: networkLabel(view) })}
        </Text>
        <View style={styles.totalLine}>
          <Text style={[styles.totalAmount, { color: p.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {totalInt}
            {totalDec ? <Text style={[styles.totalDecimals, { color: p.mutedOnCard }]}>{totalDec}</Text> : null}
          </Text>
          <Text style={[styles.totalUnit, { color: p.ink }]}>XNA</Text>
        </View>
        {view === 'mainnet' && (
          <Text style={[styles.totalFiat, { color: p.mutedOnCard }]}>≈ {formatBalance(total, XnaUnit.LOCAL_CURRENCY, true)}</Text>
        )}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {list.length === 0 && (
          <Text style={[styles.empty, { color: p.mutedOnCard }]}>
            {loc.formatString(loc.home.no_wallets_on_network, { network: networkLabel(view) })}
          </Text>
        )}
        {list.map(w => {
          const selected = current?.getID() === w.getID();
          // Short (9,499 · 15.3k · 12.3M), on the second line: the name keeps the whole first line.
          const balance = w.hideBalance ? '••••' : formatCompactXna(w.getBalance() ?? 0n);
          return (
            <Pressable
              key={w.getID()}
              onPress={() => pick(w)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={String(loc.formatString(loc.home.open_wallet, { name: w.getLabel() }))}
              testID={`HomePanelWallet-${w.getLabel()}`}
              style={({ pressed }) => [
                styles.walletCard,
                { backgroundColor: selected ? p.selectedBg : p.ground, borderColor: selected ? p.accent : p.ground },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.walletIcon, { backgroundColor: selected ? p.accent : p.card }]}>
                <Icon name={walletKindIcon(w)} type="material" size={20} color={selected ? p.onAccent : p.ink} />
              </View>
              <View style={styles.walletTexts}>
                <Text style={[styles.walletName, { color: p.ink }]} numberOfLines={1}>
                  {w.getLabel()}
                </Text>
                <View style={styles.walletLine}>
                  <Text style={[styles.walletKind, { color: p.muted }]} numberOfLines={1}>
                    {walletKindLabel(w)}
                  </Text>
                  <Text style={[styles.walletAmount, { color: p.ink }]} numberOfLines={1} testID={`HomePanelBalance-${w.getLabel()}`}>
                    {balance}
                    <Text style={[styles.walletUnit, { color: p.muted }]}> XNA</Text>
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={addWallet}
          accessibilityRole="button"
          testID="HomePanelAddWallet"
          style={({ pressed }) => [styles.add, { borderColor: p.muted }, pressed && styles.pressed]}
        >
          <Icon name="add" type="material" size={20} color={p.ink} />
          <Text style={[styles.addText, { color: p.ink }]}>{loc.home.add_wallet}</Text>
        </Pressable>
        <Pressable
          onPress={manageWallets}
          accessibilityRole="button"
          testID="HomePanelManageWallets"
          style={({ pressed }) => [styles.manage, pressed && styles.pressed]}
        >
          <Text style={[styles.manageText, { color: p.mutedOnCard }]}>{loc.home.manage_wallets}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, rowGap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  logo: { width: 32, height: 32 },
  title: { fontSize: 22, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  segments: { flexDirection: 'row', padding: 4, borderRadius: 16, columnGap: 4 },
  segment: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 6 },
  segmentActive: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  segmentCount: { fontSize: 12, fontWeight: '500' },
  total: { paddingHorizontal: 4, rowGap: 2 },
  totalLabel: { fontSize: 13 },
  totalLine: { flexDirection: 'row', alignItems: 'baseline', columnGap: 6 },
  totalAmount: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  totalDecimals: { fontSize: 17, fontWeight: '600' },
  totalUnit: { fontSize: 16, fontWeight: '700' },
  totalFiat: { fontSize: 13 },
  list: { flex: 1 },
  listContent: { rowGap: 8, paddingBottom: 8 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  walletCard: { flexDirection: 'row', alignItems: 'center', columnGap: 12, padding: 12, borderRadius: 20, borderWidth: 2 },
  walletIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletTexts: { flex: 1, rowGap: 2 },
  walletName: { fontSize: 15, fontWeight: '600' },
  walletLine: { flexDirection: 'row', alignItems: 'baseline', columnGap: 8 },
  walletKind: { flex: 1, fontSize: 12 },
  walletAmount: { fontSize: 14, fontWeight: '700' },
  walletUnit: { fontSize: 12, fontWeight: '500' },
  footer: { rowGap: 4 },
  add: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  addText: { fontSize: 15, fontWeight: '600' },
  manage: { height: 44, alignItems: 'center', justifyContent: 'center' },
  manageText: { fontSize: 14, fontWeight: '500' },
});

export default HomeWalletsPanel;
