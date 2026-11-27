import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NeuraiNetwork } from '../../blue_modules/neurai/networkConfig';
import type { TWallet } from '../../class/wallets/types';
import loc from '../../loc';
import Icon from '../Icon';
import { useHomePalette, walletKindLabel } from './homeTheme';

const NEURAI_LOGO = require('../../img/addWallet/neurai.png');

/** Product name, not translated. */
const BRAND = 'Neurai Wallet';

interface HomeTopBarProps {
  /** Undefined before the first wallet exists: the bar then names the app. */
  wallet?: TWallet;
  network: NeuraiNetwork;
  /** A refresh is running somewhere in the app. */
  updating?: boolean;
  onOpenWallets: () => void;
  /** The open wallet's own options (backup, export, its settings). */
  onOpenWalletOptions?: () => void;
  /** Only where no bottom bar offers the settings (no wallet yet). */
  onOpenSettings?: () => void;
  onLongPressSettings?: () => void;
}

const networkLabel = (network: NeuraiNetwork): string =>
  network === 'testnet' ? loc.wallets.neurai_network_testnet : loc.wallets.neurai_network_mainnet;

/**
 * The home's top row: the Neurai logo, then three lines — "Neurai Wallet", the
 * wallet's name and its type and network (tap to open the side panel with
 * every wallet) — then the open wallet's options. The app's settings are in
 * the bottom bar; here only before the first wallet, when there is no bar.
 * Each line has the whole width, so a long wallet name fits.
 * The bar stays put while the sections below change, so the wallet being
 * looked at is always named.
 */
const HomeTopBar: React.FC<HomeTopBarProps> = ({
  wallet,
  network,
  updating,
  onOpenWallets,
  onOpenWalletOptions,
  onOpenSettings,
  onLongPressSettings,
}) => {
  const insets = useSafeAreaInsets();
  const p = useHomePalette();
  const name = wallet ? wallet.getLabel() : BRAND;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8, backgroundColor: p.ground }]}>
      <Pressable
        onPress={onOpenWallets}
        disabled={!wallet}
        accessibilityRole="button"
        accessibilityLabel={String(loc.formatString(loc.home.switch_wallet, { name }))}
        testID="HomeWalletSwitcher"
        style={({ pressed }) => [styles.switcher, pressed && styles.pressed]}
      >
        <Image source={NEURAI_LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={styles.titles}>
          <View style={styles.nameRow}>
            <Text style={[styles.brand, { color: p.accentText }]} numberOfLines={1}>
              {BRAND}
            </Text>
            {updating && (
              <ActivityIndicator size="small" color={p.muted} style={styles.spinner} accessibilityLabel={loc.transactions.updating} />
            )}
          </View>
          {wallet && (
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: p.ink }]} numberOfLines={1}>
                {name}
              </Text>
              <Icon name="expand-more" type="material" size={22} color={p.ink} />
            </View>
          )}
          {wallet && (
            <Text style={[styles.sub, { color: p.muted }]} numberOfLines={1}>
              {walletKindLabel(wallet)} · {networkLabel(network)}
            </Text>
          )}
        </View>
      </Pressable>
      <View style={styles.buttons}>
        {wallet && onOpenWalletOptions ? (
          <Pressable
            onPress={onOpenWalletOptions}
            accessibilityRole="button"
            accessibilityLabel={loc.home.wallet_options}
            testID="WalletDetails"
            style={({ pressed }) => [styles.round, { backgroundColor: p.card }, pressed && styles.pressed]}
          >
            <Icon name="more-horiz" type="material" size={24} color={p.ink} />
          </Pressable>
        ) : null}
        {onOpenSettings ? (
          <Pressable
            onPress={onOpenSettings}
            onLongPress={onLongPressSettings}
            accessibilityRole="button"
            accessibilityLabel={loc.home.settings}
            testID="SettingsButton"
            style={({ pressed }) => [styles.round, { backgroundColor: p.card }, pressed && styles.pressed]}
          >
            <Icon name="tune" type="material" size={22} color={p.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    columnGap: 12,
  },
  switcher: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 48, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  logo: { width: 48, height: 48 },
  titles: { flexShrink: 1, rowGap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  name: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  spinner: { marginLeft: 6 },
  sub: { fontSize: 13 },
  buttons: { flexDirection: 'row', columnGap: 8 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default HomeTopBar;
