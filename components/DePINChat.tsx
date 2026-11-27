/**
 * DePIN section of a wallet — token-gated messaging over a DePIN-enabled
 * Neurai node.
 *
 * Rendered by the wallet home's DePIN tab (Legacy and ECDSA wallets). Derives
 * the dedicated DePIN chat identity (account 100), lists the DePIN tokens held
 * at that address, and — once a token is selected — opens an end-to-end
 * encrypted group/private chat with the other holders through the
 * `useDePINChat` hook, drawn by `DepinMessageList`.
 *
 * The gear button opens `DepinRpcEdit`: the wallet's WSS service, or one for
 * DePIN alone. To receive group messages the address's public key must be
 * on-chain, so when it isn't we offer a "reveal" action that burns a little
 * XNA from the DePIN address (mirrors the web wallet).
 *
 * Mirrors the Neurai web wallet's `Chat.tsx` / `useDePINChat.ts`.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NeuraiNetwork } from '../blue_modules/neurai';
import { isDepinChatSupportedNetwork, type DepinChatNetwork } from '../blue_modules/neurai/depinChatIdentity';
import { getDepinRpcConfig, getIncompatibleDepinServer } from '../blue_modules/neurai/depinRpcOverrides';
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
import { ConnectNoticeCard } from './ConnectUI';
import NeuraiLoader from './NeuraiLoader';
import { SettingsButton, useSettingsPalette } from './settings/SettingsUI';
import { FUND_AMOUNT_XNA } from './depinChat/constants';
import { DepinAddressPanel, DepinHeaderCard, type DepinReadiness } from './depinChat/DepinChatAddressCard';
import DepinChatContactsDrawer from './depinChat/DepinChatContactsDrawer';
import type { ChatMessage } from './depinChat/chatRows';
import DepinChatConversationPanel from './depinChat/DepinChatConversationPanel';
import DepinChatInfoModal from './depinChat/DepinChatInfoModal';
import DepinChatRevealBanner from './depinChat/DepinChatRevealBanner';
import DepinChatTokenSections, { type DepinSection } from './depinChat/DepinChatTokenSections';
import { addressTag } from './depinChat/DepinUI';
import type { DePINChatHandle, DePINChatProps } from './depinChat/types';
import Icon, { type MaterialIconName } from './Icon';

export type { DePINChatHandle } from './depinChat/types';

const NO_UNREAD: Record<string, number> = {};

const DePINChat = forwardRef<DePINChatHandle, DePINChatProps>(
  ({ walletID, paused = false, onConversationOpenChange, hasNewMessages = false, unreadCounts = NO_UNREAD }, ref) => {
    const p = useSettingsPalette();
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

    const { chatAssets, depinBalance, depinIncoming, getBackend, loadingAssets, pubkeyRevealed, refreshServerInfo, rpc, serverInfo } =
      useDepinChatSetup({
        identity,
        knownRevealed: isKnownRevealed(walletID),
        network,
        supported,
        paused,
      });
    const {
      refreshRecipients,
      recipientList,
      selectAsset: loadAsset,
      selectedAsset,
      setSelectedAsset,
    } = useDepinChatAssetSelection({ rpc, network, identity });
    const [activeTab, setActiveTab] = useState<string>('group');
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
    const [activeSection, setActiveSection] = useState<DepinSection>('chat');
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
      onMembershipChanged: () => {
        refreshRecipients().catch(error => console.debug('DePIN recipient refresh failed', error));
      },
      activeTab,
      walletID,
      paused,
      network,
      device: isHardware ? deviceId.device : null,
      // The device rebooted or was unplugged: drop the dead handle so the screen
      // falls back to the connect button instead of retrying a broken link.
      onDeviceLost: isHardware ? deviceId.reset : undefined,
    });

    // The chat's menu (mirrors the web wallet's left sidebar): the general
    // channel, the open private conversations, the token holders you can start
    // a private chat with, and the chat's options.
    const [drawerVisible, setDrawerVisible] = useState(false);
    const drawerAnim = useRef(new Animated.Value(0)).current;
    const openDrawer = useCallback(() => {
      setDrawerVisible(true);
      Animated.timing(drawerAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }, [drawerAnim]);
    const closeDrawer = useCallback(() => {
      Animated.timing(drawerAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setDrawerVisible(false));
    }, [drawerAnim]);

    // Back is owned by the wallet home (which also owns the tab state): on a
    // back action it calls goBack() first, so the open menu closes, then the
    // token chat, before the tab does. The chat has no back arrow of its own.
    useImperativeHandle(
      ref,
      () => ({
        goBack: () => {
          if (drawerVisible) {
            closeDrawer();
            return true;
          }
          if (selectedAsset == null) return false;
          setSelectedAsset(null);
          return true;
        },
      }),
      [drawerVisible, closeDrawer, selectedAsset, setSelectedAsset],
    );
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

    // Not enough XNA at the chat address for the reveal burn: jump to the parent
    // wallet's Send screen with the chat address and the amount pre-filled, so
    // the user only has to confirm.
    const goFundDepinAddress = useCallback(() => {
      if (!identity) return;
      navigate('SendNeurai', { walletID, address: identity.address, amount: FUND_AMOUNT_XNA });
    }, [identity, navigate, walletID]);

    const messages = useMemo<ChatMessage[]>(() => {
      const src = activeTab === 'group' ? groupMessages : (privateConversations.get(activeTab)?.messages ?? []);
      const confirmed = src.map((m, i) => ({
        id: `${m.messageHash ?? m.sender}-${m.timestamp}-${i}`,
        text: m.message,
        createdAt: new Date(m.timestamp * 1000),
        sender: m.sender,
        pending: false,
      }));

      // A sent message is shown at once and marked pending until the pool hands it
      // back. The two are matched by the hash the pool assigned, not by text and
      // timestamp: those can drift by a second between the copy and the message,
      // and then the copy never clears.
      const confirmedHashes = new Set(src.map(m => m.messageHash).filter(Boolean));
      const stillPending = pending
        .filter(item => item.tab === activeTab && !(item.hash && confirmedHashes.has(item.hash)))
        .map(item => ({
          id: item.id,
          text: item.text,
          createdAt: item.createdAt,
          sender: identity?.address ?? '',
          pending: true,
        }));

      // Oldest first; the list draws them bottom-up from the newest.
      return [...confirmed, ...stillPending].sort((a, b) => +a.createdAt - +b.createdAt);
    }, [activeTab, groupMessages, privateConversations, pending, identity?.address]);

    useEffect(() => {
      setPending([]);
    }, [selectedAsset]);

    // Another conversation opens on its latest message.
    useEffect(() => {
      messagesListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    }, [activeTab, messagesListRef]);

    const handleSend = useCallback(() => {
      const text = draft.trim();
      if (!text) return;
      const payload = activeTab === 'group' ? text : `@${activeTab} ${text}`;
      const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // On screen immediately, so the chat does not look frozen while the message
      // is built, encrypted and submitted.
      setPending(prev => [...prev, { id, tab: activeTab, text, createdAt: new Date() }]);
      setDraft('');
      // What you send is where you look, even if you had scrolled up.
      messagesListRef.current?.scrollToOffset?.({ offset: 0, animated: true });

      sendMessage(payload)
        .then((hash: string | null) => {
          // Record what the pool called it. The copy clears when a message with
          // that hash comes back, and not before: it stays pending while it is
          // genuinely unconfirmed, which is the truth.
          if (typeof hash === 'string' && hash) {
            setPending(prev => prev.map(item => (item.id === id ? { ...item, hash } : item)));
          }
        })
        .catch((e: any) => {
          // Nothing was sent, so nothing should be left on screen pretending it was.
          setPending(prev => prev.filter(item => item.id !== id));
          presentAlert({ message: e?.message ?? loc.depin.send_failed });
        });
    }, [draft, activeTab, sendMessage, messagesListRef]);

    const openServer = useCallback(() => navigate('DepinRpcEdit', { network }), [navigate, network]);

    if (!neurai || !supported) {
      return <CenteredState icon="forum" text={loc.depin.not_supported_pq} />;
    }

    if (!identity) {
      // Hardware wallets: don't spin forever — offer to connect the device and
      // reveal its DePIN identity (one on-device approval).
      if (isHardware) {
        const busy = deviceId.phase === 'connecting' || deviceId.phase === 'revealing';
        if (busy) {
          return (
            <View style={[styles.center, { backgroundColor: p.ground }]}>
              <NeuraiLoader label={deviceId.phase === 'revealing' ? loc.depin.device_confirm_reveal : loc.depin.device_connecting} />
            </View>
          );
        }
        return (
          <CenteredState icon="usb" text={loc.depin.device_connect_hint} error={deviceId.error ?? undefined}>
            <SettingsButton
              title={loc.depin.device_connect_button}
              icon="usb"
              onPress={() => {
                deviceId.reveal().catch(() => {});
              }}
              testID="DepinConnectDevice"
            />
          </CenteredState>
        );
      }

      return (
        <View style={[styles.center, { backgroundColor: p.ground }]}>
          <NeuraiLoader />
        </View>
      );
    }

    const assetNames = Object.keys(chatAssets);
    // Access per token: the DePIN server serves exactly one token — open when
    // this asset is the one it serves (and the pool is enabled), closed when
    // not, unknown while the server hasn't answered yet.
    const serverTokenNorm = serverInfo?.token ? serverInfo.token.replace(/^&/, '').toUpperCase() : null;
    const tokenHasAccess = (name: string): boolean | null =>
      serverInfo == null ? null : !!serverInfo.enabled && serverTokenNorm === name.replace(/^&/, '').toUpperCase();
    // Until both checks have answered, the remembered state stands in, so the
    // status doesn't flash "not ready" on every entry.
    const readyKnown = serverInfo != null && pubkeyRevealed != null;
    // Kept from an older version and refused by the current policy: DePIN
    // talks to no server until the user changes it.
    const incompatibleServer = getIncompatibleDepinServer(network);
    const readiness: DepinReadiness = incompatibleServer
      ? 'server_incompatible'
      : readyKnown
        ? pubkeyRevealed === false
          ? 'needs_reveal'
          : serverInfo.enabled !== true
            ? 'server_off'
            : 'ready'
        : lastKnownReady
          ? 'ready'
          : 'checking';
    const revealProps = {
      depinBalance,
      depinIncoming,
      onFund: goFundDepinAddress,
      onReveal: handleReveal,
      pubkeyRevealed,
      revealPending,
      revealing,
    };

    // No token selected yet — the section page: the DePIN card (status and
    // server), what is still missing to receive, then the chat tokens, the IoT
    // area or the DePIN address, one at a time.
    if (!selectedAsset) {
      return (
        <ScrollView
          style={[styles.flex, { backgroundColor: p.ground }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DepinHeaderCard readiness={readiness} onOpenServer={openServer} />
          {incompatibleServer ? (
            <View style={styles.serverNotice}>
              <ConnectNoticeCard
                tone="warn"
                text={loc.formatString(loc.depin.server_incompatible, { url: incompatibleServer })}
                testID="DepinServerIncompatible"
              />
              <SettingsButton title={loc.depin.server_change} icon="dns" onPress={openServer} testID="DepinServerChange" />
            </View>
          ) : null}
          <DepinChatRevealBanner {...revealProps} />
          <DepinChatTokenSections
            activeSection={activeSection}
            addressPanel={<DepinAddressPanel identity={identity} />}
            assetNames={assetNames}
            hasNewMessages={hasNewMessages}
            loadingAssets={loadingAssets}
            onSelectAsset={selectAsset}
            onSelectSection={setActiveSection}
            tokenHasAccess={tokenHasAccess}
            unreadCounts={unreadCounts}
          />
        </ScrollView>
      );
    }

    const privateTabs = Array.from(privateConversations.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    // Holders you could start a private chat with: pubkey on-chain (required for
    // encryption) and no conversation open yet. Yourself is listed as notes.
    const holderContacts = recipientList.filter(r => r.pubkey && !privateConversations.has(r.address));
    const isGroup = activeTab === 'group';
    const title = isGroup ? selectedAsset : activeTab === identity.address ? loc.depin.contacts_me : addressTag(activeTab);
    const subtitle = isGroup
      ? `${loc.depin.channel_general} · ${loc.formatString(loc.depin.members_count, { count: recipientList.length })}`
      : `${loc.depin.private_chat} · ${selectedAsset}`;
    const busyNote = deviceApprovalPending ? loc.depin.device_confirm_session : !lastPoll && !error ? loc.depin.connecting : null;

    return (
      <DepinChatConversationPanel
        activeTab={activeTab}
        title={title}
        subtitle={subtitle}
        busyNote={busyNote}
        error={error}
        draft={draft}
        identityAddress={identity.address}
        inputBottom={keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 10)}
        // RN reports the keyboard height without the system nav-bar inset when
        // the app draws edge-to-edge, so lift by both — otherwise the input bar
        // ends up mostly hidden behind the keyboard.
        keyboardOffset={keyboardHeight > 0 ? keyboardHeight + (insets.bottom || 0) : 0}
        messages={messages}
        messagesListRef={messagesListRef}
        unreadElsewhere={totalUnread > 0}
        onChangeDraft={setDraft}
        onOpenMenu={openDrawer}
        onOpenInfo={openInfo}
        onSend={handleSend}
        overlays={
          <>
            <DepinChatInfoModal
              identityAddress={identity.address}
              onClose={() => setShowInfo(false)}
              onOpenServer={openServer}
              recipients={recipientList}
              selectedAsset={selectedAsset}
              serverInfo={serverInfo}
              serverUrl={getDepinRpcConfig(network).url}
              stats={stats}
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
              selectedAsset={selectedAsset}
              visible={drawerVisible}
              onOpenInfo={openInfo}
              onOpenServer={openServer}
              onLeave={() => setSelectedAsset(null)}
            />
          </>
        }
        revealBanner={<DepinChatRevealBanner {...revealProps} compact />}
        selectedAsset={selectedAsset}
      />
    );
  },
);

DePINChat.displayName = 'DePINChat';

/** A state with nothing else on the page: an icon, what is going on and, maybe, what to do. */
const CenteredState: React.FC<{ icon: MaterialIconName; text: string; error?: string; children?: React.ReactNode }> = ({
  icon,
  text,
  error,
  children,
}) => {
  const p = useSettingsPalette();
  return (
    <View style={[styles.center, { backgroundColor: p.ground }]}>
      <View style={[styles.stateIcon, { backgroundColor: p.accentSoft }]}>
        <Icon name={icon} type="material" size={28} color={p.accentText} />
      </View>
      <Text style={[styles.info, { color: p.muted }]}>{text}</Text>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: p.fail.bg }]} accessibilityLiveRegion="polite">
          <Text style={[styles.errorText, { color: p.fail.fg }]}>{error}</Text>
        </View>
      ) : null}
      {children ? <View style={styles.stateAction}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, rowGap: 14 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20, flexGrow: 1 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  info: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  errorBox: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'stretch' },
  errorText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  stateAction: { alignSelf: 'stretch', marginTop: 4 },
  serverNotice: { rowGap: 12 },
});

export default DePINChat;
