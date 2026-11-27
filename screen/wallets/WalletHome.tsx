/**
 * Home screen: one wallet at a time.
 *
 * The wallet's name at the top opens a side panel with every wallet (Mainnet
 * and Testnet apart); the one picked is what the home shows: balance, quick
 * actions, shortcuts and its transactions. The floating bar at the bottom
 * switches between the wallet's sections (the tabs the wallet screen used to
 * have: assets, DePIN chat, privacy pool) with the scanner in the middle.
 *
 * Sections are mounted the first time they are opened and then kept, hidden
 * while another one is shown, so coming back finds them as they were left.
 * Switching wallet starts a fresh body (keyed by wallet), as leaving the old
 * wallet screen did.
 */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  InteractionManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DrawerActions, useFocusEffect, useIsFocused, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getClipboardContent } from '../../blue_modules/clipboard';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isDepinChatSupportedNetwork } from '../../blue_modules/neurai/depinChatIdentity';
import type { NeuraiNetwork } from '../../blue_modules/neurai/networkConfig';
import { isTestnetChain } from '../../blue_modules/neurai/networkConfig';
import { DEFAULT_PRIVACY_POOL, PRIVACY_AVAILABLE, PRIVACY_POOLS } from '../../blue_modules/neurai/privacy/deployment';
import { c6Family } from '../../blue_modules/neurai/privacy/wallet';
import NeuraiUriMatch from '../../class/neurai-uri-match';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import AddWalletGuide from '../../components/AddWalletGuide';
import AssetsList from '../../components/AssetsList';
import { WalletTransactionsStatus } from '../../components/Context/StorageProvider';
import DePINChat, { DePINChatHandle } from '../../components/DePINChat';
import HomeActions, { HomeAction } from '../../components/home/HomeActions';
import HomeBalance from '../../components/home/HomeBalance';
import { ExitNotice, useBackToExit } from '../../components/home/ExitNotice';
import HomeTabBar, { HomeTab, homeTabBarSpace, useKeyboardVisible } from '../../components/home/HomeTabBar';
import HomeTiles, { HomeTile } from '../../components/home/HomeTiles';
import HomeTopBar from '../../components/home/HomeTopBar';
import PendingPaymentCard from '../../components/home/PendingPaymentCard';
import { useHomePalette } from '../../components/home/homeTheme';
import { TransactionDayCard, transactionDayKey, useSortedTransactions, useTransactionDays } from '../../components/home/TransactionDayList';
import Icon, { MaterialIconName } from '../../components/Icon';
import PrivacySection from '../../components/privacy/PrivacySection';
import { openNeuraiPaymentUri } from '../../helpers/open-neurai-payment';
import { scanQrHelper } from '../../helpers/scan-qr';
import { TransactionDay } from '../../helpers/group-transactions-by-day';
import { useStorage } from '../../hooks/context/useStorage';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import useDepinPoolWatch from '../../hooks/useDepinPoolWatch';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import useMenuElements from '../../hooks/useMenuElements';
import { useWalletRefresh } from '../../hooks/useWalletRefresh';
import { useEncryptionUpgradeOffer } from '../../hooks/useEncryptionUpgradeOffer';
import useWalletSubscribe from '../../hooks/useWalletSubscribe';
import loc from '../../loc';
import { XnaUnit } from '../../models/xnaUnits';
import { ConnectionPollContext } from '../../navigation/ConnectionPollContext';
import ActionSheet from '../ActionSheet';
import { appAlert } from '../../components/AppDialog';

/** The home shows the latest ones; "See all" opens the full history. */
const HOME_TRANSACTIONS = 6;

/** How long to wait for the engine to hand out a receive address before giving up. */
const ADDRESS_TIMEOUT_MS = 3000;

const silentBalanceOf = (wallet: object): bigint => (wallet instanceof NeuraiECDSAWallet ? wallet.getSilentBalance() : 0n);

/** The pool the privacy tab opens with: its last private balance read counts on the home. */
const PRIVACY_POOL_ID = PRIVACY_POOLS.find(pool => pool.id === DEFAULT_PRIVACY_POOL)?.runtime?.id;

interface BodyProps {
  walletID: string;
  network: NeuraiNetwork;
  updating: boolean;
  onOpenWallets: () => void;
  onOpenSettings: () => void;
  onLongPressSettings: () => void;
  onScan: () => void;
  onScanLongPress: () => void;
}

const WalletHomeBody: React.FC<BodyProps> = ({
  walletID,
  network,
  updating,
  onOpenWallets,
  onOpenSettings,
  onLongPressSettings,
  onScan,
  onScanLongPress,
}) => {
  const wallet = useWalletSubscribe(walletID);
  const neurai = isNeuraiWallet(wallet) ? wallet : null;
  const p = useHomePalette();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { navigate } = useExtendedNavigation();
  const { saveToDisk } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const isFocused = useIsFocused();
  const keyboardVisible = useKeyboardVisible();
  const barSpace = homeTabBarSpace(insets.bottom);

  const testnet = neurai ? isTestnetChain(neurai.network) : false;
  const depinAvailable = !!neurai && isDepinChatSupportedNetwork(neurai.network);
  const privacyAvailable = PRIVACY_AVAILABLE && !!neurai && c6Family(neurai) !== null;

  // ---- Sections -----------------------------------------------------------
  const [tab, setTab] = useState<HomeTab>('home');
  const [mounted, setMounted] = useState<ReadonlySet<HomeTab>>(() => new Set<HomeTab>(['home']));
  const selectTab = useCallback((next: HomeTab) => {
    setMounted(prev => (prev.has(next) ? prev : new Set(prev).add(next)));
    setTab(next);
  }, []);
  const depinChatRef = useRef<DePINChatHandle>(null);
  const [conversationOpen, setConversationOpen] = useState(false);

  const { hasNewMessages: hasNewDepinMessages, unreadCounts: depinUnreadCounts } = useDepinPoolWatch({
    enabled: depinAvailable,
    network: neurai ? neurai.getNeuraiNetwork() : 'mainnet',
    walletID,
  });

  // Back walks one level at a time: open token chat → token picker → Home →
  // a warning → out of the app.
  const exit = useBackToExit();
  const exitOnBack = exit.onBack;
  const handleBack = useCallback((): boolean => {
    if (tab === 'home') return exitOnBack();
    if (tab === 'depin' && depinChatRef.current?.goBack()) return true;
    setTab('home');
    return true;
  }, [tab, exitOnBack]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => sub.remove();
    }, [handleBack]),
  );
  // The warning only stands while the home is what back would leave.
  const disarmExit = exit.disarm;
  useEffect(() => {
    if (tab !== 'home' || !isFocused) disarmExit();
  }, [tab, isFocused, disarmExit]);

  // ---- Sync notice ----------------------------------------------------------
  const serviceStale = !!neurai && neurai.getServiceStatus?.() === 'stale';
  const [syncNotice, setSyncNotice] = useState<'updating' | 'delayed' | null>(null);
  useEffect(() => {
    setSyncNotice(null);
    if (!serviceStale) return;
    // Avoid flashing a banner for a normal, brief reconnect.
    const updatingTimer = setTimeout(() => setSyncNotice('updating'), 800);
    const delayedTimer = setTimeout(() => setSyncNotice('delayed'), 10_000);
    return () => {
      clearTimeout(updatingTimer);
      clearTimeout(delayedTimer);
    };
  }, [serviceStale]);

  // ---- Balance --------------------------------------------------------------
  const [balance, setBalance] = useState<bigint>(wallet.getBalance());
  // The part of it on silent payment addresses (ECDSA wallets), which sends spend apart.
  const [silentBalance, setSilentBalance] = useState<bigint>(silentBalanceOf(wallet));
  // The private balance last read in the privacy pool (testnet wallets that can use it), and when.
  const poolOf = useCallback(
    () => (privacyAvailable && neurai && PRIVACY_POOL_ID ? neurai.getPrivacyPoolBalance(PRIVACY_POOL_ID) : null),
    [privacyAvailable, neurai],
  );
  const [poolBalance, setPoolBalance] = useState<bigint>(() => poolOf()?.sats ?? 0n);
  const [poolSeenAt, setPoolSeenAt] = useState<number>(() => poolOf()?.at ?? 0);
  useEffect(() => {
    const read = () => {
      setBalance(wallet.getBalance());
      setSilentBalance(silentBalanceOf(wallet));
      const pool = poolOf();
      setPoolBalance(pool?.sats ?? 0n);
      setPoolSeenAt(pool?.at ?? 0);
    };
    read();
    const interval = setInterval(read, 1000);
    return () => clearInterval(interval);
  }, [wallet, poolOf]);
  const [hidden, setHidden] = useState<boolean>(!!wallet.hideBalance);
  // Settings can hide or show every balance at once: pick that up on return.
  useFocusEffect(
    useCallback(() => {
      setHidden(!!wallet.hideBalance);
    }, [wallet]),
  );
  const [unit, setUnit] = useState<XnaUnit>(wallet.getPreferredBalanceUnit());
  const [unitSwitching, setUnitSwitching] = useState(false);
  // Testnet coins have no fiat value: a fiat preference shows as XNA there.
  const displayUnit = testnet && unit === XnaUnit.LOCAL_CURRENCY ? XnaUnit.XNA : unit;

  const cycleUnit = useCallback(() => {
    const next =
      displayUnit === XnaUnit.XNA ? XnaUnit.SATS : displayUnit === XnaUnit.SATS && !testnet ? XnaUnit.LOCAL_CURRENCY : XnaUnit.XNA;
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    setUnitSwitching(true);
    setUnit(next);
    wallet.setPreferredBalanceUnit(next);
    saveToDisk()
      .catch(e => console.debug('[WalletHome] unit save failed', e))
      .finally(() => setUnitSwitching(false));
  }, [displayUnit, testnet, wallet, saveToDisk]);

  const toggleHidden = useCallback(async () => {
    try {
      if (wallet.hideBalance && (await isBiometricUseCapableAndEnabled())) {
        if (!(await unlockWithBiometrics())) return;
      }
      wallet.hideBalance = !wallet.hideBalance;
      setHidden(wallet.hideBalance);
      await saveToDisk();
    } catch (e) {
      console.debug('[WalletHome] balance visibility change failed', e);
    }
  }, [wallet, isBiometricUseCapableAndEnabled, saveToDisk]);

  // ---- Refresh --------------------------------------------------------------
  const { refreshing, refresh } = useWalletRefresh(wallet);

  // The desktop menu's "Refresh" reaches the home through this handler.
  useEffect(() => {
    const screenKey = route.name;
    registerTransactionsHandler(refresh, screenKey);
    return () => unregisterTransactionsHandler(screenKey);
  }, [route.name, refresh, registerTransactionsHandler, unregisterTransactionsHandler]);

  // ---- Transactions ---------------------------------------------------------
  const sortedTransactions = useSortedTransactions(wallet);
  const days = useTransactionDays(sortedTransactions, HOME_TRANSACTIONS);
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: TransactionDay }) => <TransactionDayCard day={item} unit={displayUnit} walletID={walletID} />,
    [displayUnit, walletID],
  );

  // ---- Actions --------------------------------------------------------------
  const openDetails = useCallback(() => navigate('WalletDetails', { walletID }), [navigate, walletID]);
  const openHistory = useCallback(() => navigate('WalletTransactionHistory', { walletID }), [navigate, walletID]);

  const copyAddress = useCallback(async () => {
    let address: string | false | undefined;
    try {
      address = neurai
        ? await Promise.race([
            neurai.getAddressAsync(),
            new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), ADDRESS_TIMEOUT_MS)),
          ])
        : undefined;
    } catch (e) {
      console.debug('[WalletHome] getAddressAsync failed', e);
    }
    if (!address) address = wallet.getAddress?.() || undefined;
    if (!address) {
      presentAlert({ message: loc.home.copy_failed, type: AlertType.Toast });
      return;
    }
    Clipboard.setString(address);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    presentAlert({ message: loc.home.copied, type: AlertType.Toast });
  }, [neurai, wallet]);

  const actions = useMemo<HomeAction[]>(() => {
    const list: HomeAction[] = [];
    if (wallet.allowSend()) {
      list.push({
        key: 'send',
        label: loc.home.send,
        icon: 'north-east',
        testID: 'SendButton',
        onPress: () => navigate('SendNeurai', { walletID }),
      });
    }
    if (wallet.allowReceive()) {
      list.push({
        key: 'receive',
        label: loc.home.receive,
        icon: 'south-west',
        testID: 'ReceiveButton',
        onPress: () => navigate('ReceiveDetails', { walletID }),
      });
    }
    list.push({
      key: 'addresses',
      label: loc.home.addresses,
      icon: 'format-list-bulleted',
      testID: 'HomeAddressesButton',
      onPress: () => navigate('WalletAddresses', { walletID }),
    });
    list.push({ key: 'copy', label: loc.home.copy, icon: 'content-copy', testID: 'HomeCopyAddressButton', onPress: copyAddress });
    return list;
  }, [wallet, walletID, navigate, copyAddress]);

  const assetCount = neurai ? neurai.getHeldAssetsCached().length : 0;
  const tiles = useMemo<HomeTile[]>(() => {
    const first: HomeTile = depinAvailable
      ? {
          key: 'depin',
          icon: 'chat-bubble-outline',
          title: loc.home.depin_title,
          subtitle: hasNewDepinMessages ? loc.home.depin_new : loc.home.depin_none,
          dot: hasNewDepinMessages,
          button: loc.home.open,
          onPress: () => selectTab('depin'),
          testID: 'HomeTileDepin',
        }
      : {
          key: 'wallet',
          icon: 'account-balance-wallet',
          title: loc.home.wallet_title,
          subtitle: loc.home.wallet_hint,
          button: loc.home.manage,
          onPress: openDetails,
          testID: 'HomeTileWallet',
        };
    const assets: HomeTile = {
      key: 'assets',
      icon: 'layers',
      title: loc.home.assets_title,
      subtitle:
        assetCount === 0
          ? loc.home.no_assets
          : assetCount === 1
            ? loc.home.assets_one
            : String(loc.formatString(loc.home.assets_count, { count: assetCount })),
      button: loc.home.view,
      onPress: () => selectTab('assets'),
      testID: 'HomeTileAssets',
    };
    return [first, assets];
  }, [depinAvailable, hasNewDepinMessages, assetCount, selectTab, openDetails]);

  // An element, not a component: a component re-created on each render would
  // remount the whole header every time.
  const listHeader = (
    <View>
      <HomeBalance
        wallet={wallet}
        balance={balance}
        silentBalance={silentBalance}
        poolBalance={poolBalance}
        poolSeenAt={poolSeenAt}
        onOpenPool={privacyAvailable ? () => selectTab('privacy') : undefined}
        unit={displayUnit}
        hidden={hidden}
        testnet={testnet}
        unitSwitching={unitSwitching}
        onCycleUnit={cycleUnit}
        onToggleHidden={toggleHidden}
      />
      <HomeActions actions={actions} />
      {neurai && <PendingPaymentCard wallet={neurai} saveToDisk={saveToDisk} refreshKey={refreshing} />}
      <HomeTiles tiles={tiles} />
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: p.ink }]} accessibilityRole="header">
          {loc.home.transactions}
        </Text>
        {sortedTransactions.length > 0 && (
          <Pressable
            onPress={openHistory}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={loc.home.see_all_transactions}
            testID="HomeSeeAllTransactions"
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
          >
            <Text style={[styles.seeAllText, { color: p.accentText }]}>{loc.home.see_all}</Text>
            <Icon name="chevron-right" type="material" size={20} color={p.accentText} />
          </Pressable>
        )}
      </View>
    </View>
  );

  const privacyBlockedReason = !neurai
    ? loc.home.privacy_unavailable
    : !testnet
      ? loc.home.privacy_testnet_only
      : neurai.use_with_hardware_wallet || !neurai.secret
        ? loc.home.privacy_needs_keys
        : loc.home.privacy_unavailable;

  const renderUnavailable = (icon: MaterialIconName, text: string) => (
    <View style={[styles.unavailable, { paddingBottom: barSpace }]}>
      <View style={[styles.unavailableIcon, { backgroundColor: p.accentSoft }]}>
        <Icon name={icon} type="material" size={28} color={p.accentText} />
      </View>
      <Text style={[styles.unavailableText, { color: p.muted }]}>{text}</Text>
    </View>
  );

  const panel = (which: HomeTab) => [styles.flex, which !== tab && styles.hidden];
  // An open conversation's input bar owns the bottom (the floating bar hides).
  const depinBottom = conversationOpen ? 0 : barSpace;

  return (
    <View style={[styles.flex, { backgroundColor: p.ground }]} testID="TransactionsListView">
      <HomeTopBar wallet={wallet} network={network} updating={updating} onOpenWallets={onOpenWallets} onOpenWalletOptions={openDetails} />
      {serviceStale && syncNotice && (
        <View style={[styles.syncBar, { backgroundColor: p.card }]} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={p.muted} />
          <Text style={[styles.syncText, { color: p.muted }]}>
            {syncNotice === 'delayed' ? loc.wallets.neurai_service_stale : loc.wallets.neurai_service_updating}
          </Text>
        </View>
      )}

      <View style={panel('home')}>
        <FlatList<TransactionDay>
          data={days}
          extraData={[displayUnit, hidden]}
          keyExtractor={transactionDayKey}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: p.muted }]} testID="TransactionsListEmpty">
              {loc.wallets.list_empty_txs1}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: barSpace }}
          refreshControl={!isDesktop ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={p.muted} /> : undefined}
        />
      </View>

      {mounted.has('assets') && (
        <View style={[panel('assets'), { paddingBottom: barSpace }]}>
          <AssetsList walletID={walletID} onOpenDepin={depinAvailable ? () => selectTab('depin') : undefined} />
        </View>
      )}

      {mounted.has('depin') && (
        <View style={[panel('depin'), { paddingBottom: depinBottom }]}>
          {depinAvailable ? (
            <DePINChat
              ref={depinChatRef}
              walletID={walletID}
              paused={tab !== 'depin' || !isFocused}
              onConversationOpenChange={setConversationOpen}
              hasNewMessages={hasNewDepinMessages}
              unreadCounts={depinUnreadCounts}
            />
          ) : (
            renderUnavailable('chat-bubble-outline', loc.home.depin_unavailable)
          )}
        </View>
      )}

      {mounted.has('privacy') && (
        <View style={[panel('privacy'), privacyAvailable && { paddingBottom: barSpace }]}>
          {privacyAvailable ? (
            <PrivacySection walletID={walletID} hidden={tab !== 'privacy' || !isFocused} />
          ) : (
            renderUnavailable('shield', privacyBlockedReason)
          )}
        </View>
      )}

      <ExitNotice visible={exit.armed} bottom={barSpace + 4} onCancel={exit.disarm} />
      <HomeTabBar
        tab={tab}
        onSelect={selectTab}
        onScan={onScan}
        onScanLongPress={onScanLongPress}
        onOpenSettings={onOpenSettings}
        onLongPressSettings={onLongPressSettings}
        hidden={keyboardVisible || (tab === 'depin' && conversationOpen)}
      />
    </View>
  );
};

/** The double back of the home, for the home with no wallet yet. */
const NoWalletBackToExit: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const exit = useBackToExit();
  const { onBack, disarm } = exit;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [onBack]),
  );
  useEffect(() => {
    if (!isFocused) disarm();
  }, [isFocused, disarm]);
  return <ExitNotice visible={exit.armed} bottom={insets.bottom + 24} onCancel={disarm} />;
};

const WalletHome: React.FC = () => {
  const { wallet, network } = useHomeWallet();
  const { wallets, walletTransactionUpdateStatus } = useStorage();
  const navigation = useExtendedNavigation();
  // After an unlock that opened an old CryptoJS bucket (H08).
  useEncryptionUpgradeOffer();
  const connectionPoll = useContext(ConnectionPollContext);
  const p = useHomePalette();
  const updating = walletTransactionUpdateStatus !== WalletTransactionsStatus.NONE;

  // Catch-up on focus: open the WSS connection and subscribe every Neurai
  // wallet's addresses, not only the one on screen, so the others keep syncing
  // and the side panel's balances are current. Deferred until the screen is
  // interactive; the push handler does the heavy refetch in the background.
  useFocusEffect(
    useCallback(() => {
      connectionPoll?.pollConnection();
      const handle = InteractionManager.runAfterInteractions(() => {
        for (const w of wallets) {
          if (!isNeuraiWallet(w)) continue;
          w.ensureBackendConnected().catch(err => console.debug('[WalletHome] ensureBackendConnected failed', err));
        }
      });
      return () => handle.cancel();
    }, [connectionPoll, wallets]),
  );

  const onBarScanned = useCallback(
    (value: any) => {
      if (!value) return;
      try {
        // Neurai first: a scanned `nc:` pairing opens the Connect flow and an
        // `xna:` request opens the send flow; anything else falls through to
        // the older router inside the matcher.
        NeuraiUriMatch.navigationRouteFor(
          { url: value },
          completionValue => {
            triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
            // @ts-ignore: route tuples from the matcher are not typed
            navigation.navigate(...completionValue);
          },
          undefined,
          {
            onPayment: payment => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
              if (!openNeuraiPaymentUri(navigation, wallets, payment)) appAlert(loc.send.header, loc.wallets.select_no_bitcoin);
            },
          },
        );
      } catch (e: any) {
        appAlert(loc.send.details_scan_error, e.message);
      }
    },
    [navigation, wallets],
  );

  const onScan = useCallback(() => {
    scanQrHelper().then(onBarScanned);
  }, [onBarScanned]);

  // Long press on the scanner: read a QR from a picture, scan, or use the clipboard.
  const onScanLongPress = useCallback(async () => {
    const isClipboardEmpty = (await getClipboardContent())?.trim().length === 0;
    const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
    if (!isClipboardEmpty) options.push(loc.wallets.paste_from_clipboard);
    ActionSheet.showActionSheetWithOptions({ title: loc.send.header, options, cancelButtonIndex: 0 }, async buttonIndex => {
      switch (buttonIndex) {
        case 1:
          fs.showImagePickerAndReadImage()
            .then(onBarScanned)
            .catch(error => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({ title: loc.errors.error, message: error.message });
            });
          break;
        case 2:
          scanQrHelper().then(onBarScanned);
          break;
        case 3:
          if (!isClipboardEmpty) onBarScanned(await getClipboardContent());
          break;
      }
    });
  }, [onBarScanned]);

  const openWallets = useCallback(() => navigation.dispatch(DrawerActions.openDrawer()), [navigation]);
  const openSettings = useCallback(() => navigation.navigate('Settings'), [navigation]);
  const openManageWallets = useCallback(() => navigation.navigate('ManageWallets'), [navigation]);

  const openCreateWallet = useCallback(() => navigation.navigate('AddWalletRoot'), [navigation]);
  const openImportWallet = useCallback(
    () => navigation.navigate('AddWalletRoot', { screen: 'ImportNeurai', initial: false }),
    [navigation],
  );
  const openHardwareWallet = useCallback(
    () => navigation.navigate('AddWalletRoot', { screen: 'AddHardwareWallet', initial: false }),
    [navigation],
  );

  if (!wallet) {
    return (
      <View style={[styles.flex, { backgroundColor: p.ground }]} testID="Wallets">
        <HomeTopBar network={network} updating={updating} onOpenWallets={openWallets} onOpenSettings={openSettings} />
        <ScrollView>
          <Text style={[styles.guideTitle, { color: p.ink }]} accessibilityRole="header">
            {loc.wallets.add_guide_title}
          </Text>
          <AddWalletGuide onCreate={openCreateWallet} onImport={openImportWallet} onHardware={openHardwareWallet} />
        </ScrollView>
        <NoWalletBackToExit />
      </View>
    );
  }

  return (
    <WalletHomeBody
      key={wallet.getID()}
      walletID={wallet.getID()}
      network={network}
      updating={updating}
      onOpenWallets={openWallets}
      onOpenSettings={openSettings}
      onLongPressSettings={openManageWallets}
      onScan={onScan}
      onScanLongPress={onScanLongPress}
    />
  );
};

export default WalletHome;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: 'none' },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    columnGap: 8,
  },
  syncText: { fontSize: 13, flexShrink: 1 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    marginHorizontal: 20,
    marginTop: 26,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  seeAllText: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 32, marginHorizontal: 24 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, rowGap: 16 },
  unavailableIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  unavailableText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  guideTitle: { fontSize: 24, fontWeight: '700', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
});
