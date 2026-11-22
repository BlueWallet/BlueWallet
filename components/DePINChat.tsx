/**
 * DePIN chat tab — token-gated messaging over a DePIN-enabled Neurai node.
 *
 * Rendered inside `WalletTransactions` when the "DePIN" tab is selected (Legacy
 * wallets only). Derives the dedicated DePIN chat identity (account 100), lists
 * the DePIN tokens held at that address, and — once a token is selected — opens
 * an end-to-end encrypted group/private chat with the other holders via
 * `react-native-gifted-chat` and the `useDePINChat` hook.
 *
 * The gear button opens the shared WSS service settings through `DepinRpcEdit`.
 * The chat uses the same service as the wallet. To receive group messages the address's public key must be on-chain, so
 * when it isn't we offer a "reveal" action that burns a little XNA from the
 * DePIN address (mirrors the web wallet).
 *
 * Mirrors the Neurai web wallet's `Chat.tsx` / `useDePINChat.ts`.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IMessage } from 'react-native-gifted-chat';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NeuraiNetwork } from '../blue_modules/neurai';
import { isDepinChatSupportedNetwork, type DepinChatNetwork } from '../blue_modules/neurai/depinChatIdentity';
import { isNeuraiWallet } from '../class/wallets/is-neurai-wallet';
import { NeuraiHardwareWallet } from '../class/wallets/neurai-hardware-wallet';
import { useDePINChat } from '../hooks/useDePINChat';
import useDepinChatAssetSelection from '../hooks/useDepinChatAssetSelection';
import useDepinChatIdentity from '../hooks/useDepinChatIdentity';
import { isKnownRevealed, markRevealed } from '../blue_modules/neurai/depinRevealed';
import { useDepinChatDeviceIdentity } from '../hooks/useDepinChatDeviceIdentity';
import useDepinChatKeyboard from '../hooks/useDepinChatKeyboard';
import useDepinChatReadyState from '../hooks/useDepinChatReadyState';
import useDepinChatReveal from '../hooks/useDepinChatReveal';
import useDepinChatSetup from '../hooks/useDepinChatSetup';
import useWalletSubscribe from '../hooks/useWalletSubscribe';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';
import presentAlert from './Alert';
import Icon from './Icon';
import { useTheme } from './themes';
import { FUND_AMOUNT_XNA } from './depinChat/constants';
import DepinChatAddressCard from './depinChat/DepinChatAddressCard';
import DepinChatContactsDrawer from './depinChat/DepinChatContactsDrawer';
import DepinChatConversationPanel from './depinChat/DepinChatConversationPanel';
import DepinChatInfoModal from './depinChat/DepinChatInfoModal';
import DepinChatRevealBanner from './depinChat/DepinChatRevealBanner';
import DepinChatTokenSections from './depinChat/DepinChatTokenSections';
import type { DePINChatHandle, DePINChatProps } from './depinChat/types';
import { shortAddr } from './depinChat/utils';

export type { DePINChatHandle } from './depinChat/types';

const DePINChat = forwardRef<DePINChatHandle, DePINChatProps>(({ walletID, paused = false, onConversationOpenChange }, ref) => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation();
  const insets = useSafeAreaInsets();
  const wallet = useWalletSubscribe(walletID);
  const neurai = isNeuraiWallet(wallet) ? wallet : null;

  const network: NeuraiNetwork = neurai ? neurai.getNeuraiNetwork() : 'mainnet';
  const chainType = neurai ? neurai.network : 'xna';
  const supported = !!neurai && isDepinChatSupportedNetwork(chainType);

  // Hardware wallets never expose a mnemonic, so their DePIN identity comes from
  // the device (get_depin_identity) instead of local derivation — otherwise the
  // chat spins forever waiting for an identity that can't be derived.
  const isHardware = neurai?.type === NeuraiHardwareWallet.type;

  const secret = neurai?.secret ?? '';
  const passphrase = neurai?.passphrase ?? '';
  const mnemonicIdentity = useDepinChatIdentity({ chainType, passphrase, secret, supported: supported && !isHardware });
  const deviceId = useDepinChatDeviceIdentity({ enabled: supported && isHardware, network: chainType as DepinChatNetwork });
  const identity = isHardware ? deviceId.identity : mnemonicIdentity;

  const { chatAssets, depinBalance, getBackend, loadingAssets, pubkeyRevealed, refreshServerInfo, rpc, serverInfo } = useDepinChatSetup({
    identity,
    knownRevealed: isKnownRevealed(walletID),
    network,
    supported,
  });
  const { refreshRecipients, recipientList, selectAsset: loadAsset, selectedAsset, setSelectedAsset } = useDepinChatAssetSelection({ rpc, network, identity });
  const [activeTab, setActiveTab] = useState<string>('group');
  const [showQr, setShowQr] = useState(false);
  const [draft, setDraft] = useState('');
  /**
   * Messages submitted but not yet seen coming back from the pool.
   *
   * Kept here rather than in the hook: it is a property of this screen's view,
   * not of the channel, and it must never be confused with what the pool
   * actually holds.
   */
  const [pending, setPending] = useState<Array<{ id: string; tab: string; text: string; createdAt: Date; hash?: string }>>([]);
  // Which flap-tab of the section page is open: token chat picker or the
  // experimental IoT area.
  const [activeSection, setActiveSection] = useState<'chat' | 'iot'>('chat');
  const [showInfo, setShowInfo] = useState(false);
  // A reveal is permanent: settle it for the wallet card's badge and for the
  // next chat open, which then skips the pubkey poll entirely.
  useEffect(() => {
    if (pubkeyRevealed === true) markRevealed(walletID);
  }, [pubkeyRevealed, walletID]);

  const lastKnownReady = useDepinChatReadyState({
    identity,
    pubkeyRevealed,
    serverInfo,
  });

  const { keyboardHeight, messagesListRef } = useDepinChatKeyboard(!paused);
  const {
    reveal: handleReveal,
    revealPending,
    revealing,
  } = useDepinChatReveal({
    getBackend,
    identity,
    network,
    rpc,
    wallet: neurai,
    device: isHardware ? deviceId.device : null,
  });

  // Back handling is owned by WalletTransactions (which also owns the tab
  // state): on a back action it calls goBack() first, so an open token chat
  // closes before the tab or the screen does.
  useImperativeHandle(
    ref,
    () => ({
      goBack: () => {
        if (selectedAsset == null) return false;
        setSelectedAsset(null);
        return true;
      },
    }),
    [selectedAsset, setSelectedAsset],
  );

  // The host hides its own bottom controls while a conversation's input bar owns the bottom.
  useEffect(() => {
    onConversationOpenChange?.(selectedAsset != null);
  }, [selectedAsset, onConversationOpenChange]);

  const {
    groupMessages,
    privateConversations,
    totalUnread,
    groupUnread,
    error,
    lastPoll,
    stats,
    fetchStats,
    sendMessage,
    checkAssetValidity,
    setIsPolling,
    createPrivateConversation,
    deviceApprovalPending,
  } = useDePINChat({
    rpc,
    selectedAsset,
    identity,
    recipientList,
    onMembershipChanged: () => { refreshRecipients().catch(error => console.debug('DePIN recipient refresh failed', error)); },
    activeTab,
    walletID,
    paused,
    network,
    device: isHardware ? deviceId.device : null,
    // The device rebooted or was unplugged: drop the dead handle so the screen
    // falls back to the connect button instead of retrying a broken link.
    onDeviceLost: isHardware ? deviceId.reset : undefined,
  });

  // Contacts drawer (mirrors the web wallet's left sidebar): Public Group,
  // then open private conversations, then the token holders you can start a
  // private chat with.
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
    Animated.timing(drawerAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [drawerAnim]);
  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setDrawerVisible(false));
  }, [drawerAnim]);
  const selectConversation = useCallback(
    (tab: string) => {
      if (tab !== 'group' && !privateConversations.has(tab)) createPrivateConversation(tab);
      setActiveTab(tab);
      closeDrawer();
    },
    [privateConversations, createPrivateConversation, closeDrawer],
  );

  // Chat info modal: server DePIN characteristics (depingetmsginfo) plus live
  // pool stats (depinpoolstats) and the member list.
  const openInfo = useCallback(() => {
    setShowInfo(true);
    fetchStats();
    refreshServerInfo();
  }, [fetchStats, refreshServerInfo]);

  const selectAsset = useCallback(
    (assetName: string) =>
      loadAsset(assetName, {
        checkAssetValidity,
        onAssetSelected: () => setActiveTab('group'),
        setIsPolling,
      }),
    [checkAssetValidity, loadAsset, setIsPolling],
  );

  const copyAddress = useCallback(() => {
    if (!identity) return;
    Clipboard.setString(identity.address);
    presentAlert({ message: loc.depin.address_copied });
  }, [identity]);

  // Not enough XNA at the chat address for the reveal burn: jump to the parent
  // wallet's Send screen with the chat address and the amount pre-filled, so
  // the user only has to confirm.
  const goFundDepinAddress = useCallback(() => {
    if (!identity) return;
    navigate('SendNeurai', { walletID, address: identity.address, amount: FUND_AMOUNT_XNA });
  }, [identity, navigate, walletID]);

  const messages = useMemo<IMessage[]>(() => {
    const src = activeTab === 'group' ? groupMessages : (privateConversations.get(activeTab)?.messages ?? []);
    const confirmed = src.map((m, i) => ({
      _id: `${m.messageHash ?? m.sender}-${m.timestamp}-${i}`,
      text: m.message,
      createdAt: new Date(m.timestamp * 1000),
      // Last 4 chars as the display name: every address on a network starts
      // with the same prefix, so first-letter avatars would all look alike.
      user: { _id: m.sender, name: m.sender.slice(-4) },
      pending: false,
    }));

    // A sent message is shown at once and marked pending until the pool hands it
    // back. The two are matched by the hash the pool assigned, not by text and
    // timestamp: those can drift by a second between the copy and the message,
    // and then the copy never clears.
    const confirmedHashes = new Set(src.map(m => m.messageHash).filter(Boolean));
    const stillPending = pending
      .filter(p => p.tab === activeTab && !(p.hash && confirmedHashes.has(p.hash)))
      .map(p => ({
        _id: p.id,
        text: p.text,
        createdAt: p.createdAt,
        user: { _id: identity?.address ?? '', name: (identity?.address ?? '').slice(-4) },
        pending: true,
      }));

    // Oldest first: paired with GiftedChat's `inverted={false}` this renders
    // top-to-bottom (first message at the top, newest at the bottom).
    return [...confirmed, ...stillPending].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }, [activeTab, groupMessages, privateConversations, pending, identity?.address]);

  // With a non-inverted list, GiftedChat does NOT follow new messages — they
  // appear below the visible area while the view stays frozen. Whenever a
  // message arrives (sent or received) or the conversation tab changes, slide
  // to the end so the latest message is always in view. The small delay lets
  // the list commit the new row before measuring the scroll target.
  useEffect(() => {
    setPending([]);
  }, [selectedAsset]);

  const messageCount = messages.length;
  useEffect(() => {
    if (messageCount === 0) return;
    const t = setTimeout(() => messagesListRef.current?.scrollToEnd?.({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messageCount, activeTab, messagesListRef]);

  // We render our own input bar (below) instead of GiftedChat's built-in
  // InputToolbar, which proved unreliable to display in this embedded layout.
  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const payload = activeTab === 'group' ? text : `@${activeTab} ${text}`;
    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // On screen immediately, so the chat does not look frozen while the message
    // is built, encrypted and submitted.
    setPending(prev => [...prev, { id, tab: activeTab, text, createdAt: new Date() }]);
    setDraft('');

    sendMessage(payload)
      .then((hash: string | null) => {
        // Record what the pool called it. The copy clears when a message with
        // that hash comes back, and not before: it stays pending while it is
        // genuinely unconfirmed, which is the truth.
        if (typeof hash === 'string' && hash) {
          setPending(prev => prev.map(p => (p.id === id ? { ...p, hash } : p)));
        }
      })
      .catch((e: any) => {
        // Nothing was sent, so nothing should be left on screen pretending it was.
        setPending(prev => prev.filter(p => p.id !== id));
        presentAlert({ message: e?.message ?? loc.depin.send_failed });
      });
  }, [draft, activeTab, sendMessage]);

  const stylesHook = {
    root: { backgroundColor: colors.background },
    text: { color: colors.foregroundColor },
    subtext: { color: colors.alternativeTextColor },
    card: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder },
    chip: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder },
    chipActive: { backgroundColor: colors.elevated, borderColor: colors.foregroundColor },
    chipText: { color: colors.foregroundColor },
    banner: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder },
    // The folder panel and its selected tab must share one surface for the
    // seam between them to disappear. `elevated` sits a step above the chips'
    // `inputBackgroundColor`, so the tokens inside read as recessed on it.
    panel: { backgroundColor: colors.elevated, borderColor: colors.formBorder },
    tabLine: { borderColor: colors.formBorder },
    // The float Send/Receive buttons are hidden on this tab, so the old flat
    // 120 of bottom padding was dead space holding the panel up short of the
    // screen edge. Mirror the 16 used on the sides, over the gesture bar.
    scrollContent: { paddingBottom: (insets.bottom || 0) + 16 },
    // With the keyboard open the chat column already ends right above it, so
    // the input bar only needs a small padding instead of the nav-bar inset.
    inputBar: {
      backgroundColor: colors.elevated,
      borderTopColor: colors.formBorder,
      paddingBottom: keyboardHeight > 0 ? 8 : insets.bottom || 8,
    },
    inputField: { color: colors.foregroundColor, backgroundColor: colors.inputBackgroundColor },
    // RN reports the keyboard height without the system nav-bar inset when the
    // app draws edge-to-edge, so pad by both — otherwise the input bar ends up
    // mostly hidden behind the keyboard (only a few px visible).
    chatRoot: { paddingBottom: keyboardHeight > 0 ? keyboardHeight + (insets.bottom || 0) : 0 },
  };

  const gearButton = (
    <Pressable
      onPress={() => navigate('DepinRpcEdit', { network })}
      style={styles.gear}
      accessibilityLabel={loc.depin.config}
      testID="DepinChatConfig"
    >
      <Icon name="settings" type="material" size={22} color="#f97316" />
    </Pressable>
  );

  if (!neurai || !supported) {
    return (
      <View style={[styles.center, stylesHook.root]}>
        <Text style={[styles.info, stylesHook.subtext]}>{loc.depin.not_supported_pq}</Text>
      </View>
    );
  }

  if (!identity) {
    // Hardware wallets: don't spin forever — offer to connect the device and
    // reveal its DePIN identity (one on-device approval).
    if (isHardware) {
      const busy = deviceId.phase === 'connecting' || deviceId.phase === 'revealing';
      return (
        <View style={[styles.center, stylesHook.root]}>
          {busy ? (
            <>
              <ActivityIndicator />
              <Text style={[styles.info, stylesHook.subtext]}>
                {deviceId.phase === 'revealing' ? loc.depin.device_confirm_reveal : loc.depin.device_connecting}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.info, stylesHook.subtext]}>{loc.depin.device_connect_hint}</Text>
              {deviceId.error ? <Text style={[styles.info, { color: colors.failedColor }]}>{deviceId.error}</Text> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void deviceId.reveal();
                }}
                style={styles.connectBtn}
              >
                <Text style={styles.connectBtnText}>{loc.depin.device_connect_button}</Text>
              </Pressable>
            </>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.center, stylesHook.root]}>
        <ActivityIndicator />
      </View>
    );
  }

  const assetNames = Object.keys(chatAssets);
  // Access per token: the DePIN server serves exactly one token — green when
  // this asset is the one it serves (and the pool is enabled), red when not,
  // neutral while the server hasn't answered yet.
  const serverTokenNorm = serverInfo?.token ? serverInfo.token.replace(/^&/, '').toUpperCase() : null;
  const tokenHasAccess = (name: string): boolean | null =>
    serverInfo == null ? null : !!serverInfo.enabled && serverTokenNorm === name.replace(/^&/, '').toUpperCase();
  // Fully ready to operate: server pool enabled AND our pubkey is on-chain.
  // Until both checks have answered, fall back to the remembered state so the
  // badge doesn't flash red on every entry.
  const readyKnown = serverInfo != null && pubkeyRevealed != null;
  const isReady = readyKnown ? serverInfo.enabled === true && pubkeyRevealed === true : (lastKnownReady ?? false);
  // Chat section availability drives the DePIN Chat flap-tab color: green when
  // the server pool is up and serves one of the held tokens; red = inert tab.
  const chatActive =
    serverInfo == null ? (lastKnownReady ?? false) : serverInfo.enabled === true && assetNames.some(n => tokenHasAccess(n) === true);
  const revealBanner = (
    <DepinChatRevealBanner
      depinBalance={depinBalance}
      onFund={goFundDepinAddress}
      onReveal={handleReveal}
      pubkeyRevealed={pubkeyRevealed}
      revealPending={revealPending}
      revealing={revealing}
      stylesHook={stylesHook}
    />
  );

  // No token selected yet — the section page: the DePIN card (title, address,
  // derivation, Ready flap), then the folder tabs: DePIN Chat (tokens) and the
  // experimental IoT area, both sharing one panel below them.
  if (!selectedAsset) {
    return (
      <ScrollView style={[styles.flex, stylesHook.root]} contentContainerStyle={[styles.scrollContent, stylesHook.scrollContent]}>
        <DepinChatAddressCard
          gearButton={gearButton}
          identity={identity}
          isReady={isReady}
          onCopy={copyAddress}
          onToggleQr={() => setShowQr(value => !value)}
          showQr={showQr}
          stylesHook={stylesHook}
        />

        <DepinChatTokenSections
          activeSection={activeSection}
          assetNames={assetNames}
          chatActive={chatActive}
          iconColor={colors.alternativeTextColor}
          loadingAssets={loadingAssets}
          onSelectAsset={selectAsset}
          onSelectSection={setActiveSection}
          revealBanner={revealBanner}
          stylesHook={stylesHook}
          tokenHasAccess={tokenHasAccess}
        />
      </ScrollView>
    );
  }

  const privateTabs = Array.from(privateConversations.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  // Holders you could start a private chat with: pubkey on-chain (required for
  // encryption) and no conversation open yet. Yourself is listed as notes.
  const holderContacts = recipientList.filter(r => r.pubkey && !privateConversations.has(r.address));
  const activeConvName =
    activeTab === 'group' ? loc.depin.tab_group : (privateConversations.get(activeTab)?.displayName ?? shortAddr(activeTab));

  return (
    <DepinChatConversationPanel
      activeConversationName={activeConvName}
      activeTab={activeTab}
      draft={draft}
      error={error}
      gearButton={gearButton}
      identityAddress={identity.address}
      lastPoll={lastPoll}
      messages={messages}
      messagesListRef={messagesListRef}
      onBack={() => setSelectedAsset(null)}
      onChangeDraft={setDraft}
      onOpenDrawer={openDrawer}
      unreadCount={totalUnread}
      onOpenInfo={openInfo}
      onSend={handleSend}
      overlays={
        <>
          <DepinChatInfoModal
            onClose={() => setShowInfo(false)}
            recipients={recipientList}
            selectedAsset={selectedAsset}
            serverInfo={serverInfo}
            stats={stats}
            stylesHook={stylesHook}
            visible={showInfo}
          />
          <DepinChatContactsDrawer
            activeTab={activeTab}
            closeDrawer={closeDrawer}
            drawerAnim={drawerAnim}
            groupUnread={groupUnread}
            holderContacts={holderContacts}
            identityAddress={identity.address}
            privateTabs={privateTabs}
            selectConversation={selectConversation}
            stylesHook={stylesHook}
            visible={drawerVisible}
          />
        </>
      }
      placeholderColor={colors.alternativeTextColor}
      revealBanner={revealBanner}
      selectedAsset={selectedAsset}
      status={deviceApprovalPending ? loc.depin.device_confirm_session : null}
      stylesHook={stylesHook}
    />
  );
});

DePINChat.displayName = 'DePINChat';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { padding: 16, flexGrow: 1 },
  gear: { padding: 8 },
  info: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  connectBtn: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10, backgroundColor: '#f97316' },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default DePINChat;
