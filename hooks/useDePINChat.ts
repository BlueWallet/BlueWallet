/**
 * DePIN chat client hook — React Native port of the Neurai web wallet's
 * `useDePINChat`.
 *
 * Talks to a DePIN-enabled Neurai node over JSON-RPC (`depinreceiveseq` /
 * `depinsubmitmsg` / `depinpoolstats` / `checkdepinvalidity` / `depingetmsginfo`)
 * and does all encryption/decryption client-side via `blue_modules/neurai/
 * depinMsg` (ECIES + AES-256-GCM). Messages are polled every 5s (incremental by
 * admission sequence) and de-duplicated.
 *
 * Differences from the web wallet:
 *   - The transport is injected as `rpc(method, params)` (built from
 *     `getDepinRpcBackend` by the caller) rather than `wallet.rpc`.
 *   - Identity (address / WIF / pubkey) comes from the dedicated DePIN chat
 *     identity (account 100), not the wallet's address window.
 *   - Private-message recipient mapping is persisted in AsyncStorage instead of
 *     localStorage (hydrated into an in-memory map for synchronous lookups).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';

import { normalizeDepinToken, type DepinSequenceCursor } from '../blue_modules/neurai/depinMsg';
import type { NeuraiNetwork } from '../blue_modules/neurai';
import { getVerifiedPool, getVerifiedPoolStats, summarizeVerifiedPool } from '../blue_modules/neurai/depinPool';
import { auditRecipients } from '../blue_modules/neurai/depinRecipientAudit';
import { sendDepinGroupMessage, sendDepinPrivateMessage, softwareIdentity } from '../blue_modules/neurai/depinSend';
import {
  explainDepinReceiveRejection,
  readableMessages,
  receiveDepinPage,
  type ChallengeState,
  type DepinPlainMessage,
} from '../blue_modules/neurai/depinReceive';
import { getDepinRpcConfig } from '../blue_modules/neurai/depinRpcOverrides';
import type { DepinRpc } from './useDepinChatSetup';
import type { RawRpcCall } from '../blue_modules/neurai/depinRpcAdapter';
import type { DepinChatIdentity } from '../blue_modules/neurai/depinChatIdentity';
import { isMeaningfulSignature, markPoolSeen, poolSignature, setUnreadCount } from '../blue_modules/neurai/depinPoolSeen';
import { loadReadMarks, markMessagesRead } from '../blue_modules/neurai/depinReadMarks';
import {
  forgetDeviceSession,
  isDeviceLinkLost,
  isDeviceRateLimited,
  isDeviceStopError,
  receiveDevicePage,
  sendDeviceMessage,
  type DeviceChannel,
} from '../blue_modules/neurai/depinDevice';

const DEPIN_POLL_INTERVAL_MS = 5_000;
/** A device poll spans many serial round trips and counts against the session's per-minute budget. */
const DEVICE_POLL_INTERVAL_MS = 10_000;
/** Device pages are small (two rows), so a poll reads a few more of them. */
const DEVICE_PAGES_PER_POLL = 5;
const PRIVATE_MSG_PREFIX = 'depin_private_msg_';

/** Bound each poll; its admission cursor continues on the next tick. */
const MAX_PAGES_PER_POLL = 2;
/** Consecutive poll failures before polling stops, so a failing device isn't hammered every 5s. */
const MAX_CONSECUTIVE_FAILURES = 4;

/**
 * Decrypted conversations kept per `address|token` for the lifetime of the app
 * process, so leaving a channel and coming back does not re-decrypt everything
 * (each message is a device round-trip on a hardware wallet). Deliberately
 * in-memory: plaintext chat is never written to disk.
 */
interface CachedChannel {
  groupMessages: DePINMessage[];
  groupUnread: number;
  privateConversations: Map<string, PrivateConversation>;
  lastTimestamp: number;
  seenKeys: string[];
  cursor: DepinSequenceCursor | null;
}
const channelCache = new Map<string, CachedChannel>();

/** Nonces are single-use across automatic and manual reads. */
const pollLock = { current: false };

/** The RPC client rejects with the raw JSON error object (no `.message`), so dig the real message out. */
const describeRpcError = (err: any): string | null => {
  if (typeof err?.message === 'string' && err.message.length > 0) return err.message;
  const nested = err?.error?.error?.message ?? err?.error?.message;
  if (typeof nested === 'string' && nested.length > 0) return nested;
  return null;
};

export interface DePINMessage {
  recipient: string;
  sender: string;
  message: string;
  timestamp: number;
  date: string;
  expires: string;
  messageHash?: string;
  messageType?: 'private' | 'group';
  contactAddress?: string;
}

export interface PrivateConversation {
  address: string;
  displayName: string;
  unreadCount: number;
  lastMessageTime: number;
  messages: DePINMessage[];
}

export interface PoolStats {
  enabled: boolean;
  token: string;
  total_messages: number;
  total_size_bytes: number;
  memory_usage_bytes: number;
  oldest_message?: string;
  newest_message?: string;
  unique_senders: number;
  avg_message_size: number;
  expiring_in_24h: number;
}

export interface AssetValidity {
  has_asset: boolean;
  amount?: number;
  valid?: 0 | 1;
  blocked?: boolean;
}

export interface RecipientInfo {
  address: string;
  pubkey: string | null;
}

const shortAddr = (a: string) => (a.length > 8 ? `${a.substring(0, 4)}…${a.substring(a.length - 4)}` : a);

/** What marks a message as read: the hash the pool gave it. */
const readKey = (message: DePINMessage) => message.messageHash ?? `${message.sender}-${message.timestamp}`;

export function useDePINChat(params: {
  rpc: DepinRpc | null;
  selectedAsset: string | null;
  identity: DepinChatIdentity | null;
  recipientList: RecipientInfo[];
  onMembershipChanged?: () => void;
  /** Conversation currently on screen ('group' or a contact address) — its arrivals are already read. */
  activeTab?: string;
  /** Wallet showing the chat, for the per-wallet "already seen" marker. */
  walletID: string;
  /**
   * Chain the chat runs on. Needed to identify the endpoint whose pool key is
   * pinned: a pin must never be inherited across networks.
   */
  network: NeuraiNetwork;
  /** Connected NeuraiHW device — required when `identity.deviceBacked` (no local WIF). */
  device?: NeuraiESP32 | null;
  /** Called when the USB link dies (device rebooted/unplugged) so the owner can reconnect. */
  onDeviceLost?: () => void;
  /** Chat is mounted but not on screen: skip automatic polling until it is shown again. */
  paused?: boolean;
}) {
  const {
    rpc,
    selectedAsset,
    identity,
    recipientList,
    onMembershipChanged,
    activeTab = 'group',
    walletID,
    network,
    device = null,
    onDeviceLost,
    paused = false,
  } = params;
  const onDeviceLostRef = useRef(onDeviceLost);
  onDeviceLostRef.current = onDeviceLost;
  // The visible conversation is read by definition; keep it in a ref so message
  // ingestion can consult it without re-creating the polling callbacks.
  const onMembershipChangedRef = useRef(onMembershipChanged);
  onMembershipChangedRef.current = onMembershipChanged;
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Software identities keep local keys; a device-backed one signs and opens on the NeuraiHW.
  const deviceBacked = !!identity?.deviceBacked;
  const canCrypt = !!identity?.wif || (deviceBacked && !!device);
  /** The device is showing the session approval (token, pool root, pool key) and waits for the owner. */
  const [deviceApprovalPending, setDeviceApprovalPending] = useState(false);

  const [groupMessages, setGroupMessages] = useState<DePINMessage[]>([]);
  const [privateConversations, setPrivateConversations] = useState<Map<string, PrivateConversation>>(new Map());
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Set when an independent node does not confirm every recipient the DePIN
   * server listed. A warning, not an error: the message was sent, and the
   * audit is advisory (see depinRecipientAudit).
   */
  const [recipientWarning, setRecipientWarning] = useState<string | null>(null);
  const [stats, setStats] = useState<PoolStats | null>(null);
  /** Unread arrivals in the public group (private ones live in each conversation). */
  const [groupUnread, setGroupUnread] = useState(0);

  // Opening a conversation reads it: clear its badge as soon as it is on screen.
  useEffect(() => {
    if (activeTab === 'group') {
      setGroupUnread(0);
      return;
    }
    setPrivateConversations(prev => {
      const conversation = prev.get(activeTab);
      if (!conversation || conversation.unreadCount === 0) return prev;
      const updated = new Map(prev);
      updated.set(activeTab, { ...conversation, unreadCount: 0 });
      return updated;
    });
  }, [activeTab, privateConversations]);

  // What is on screen is read, and stays read after a restart.
  useEffect(() => {
    if (paused || !selectedAsset) return;
    const visible = activeTab === 'group' ? groupMessages : (privateConversations.get(activeTab)?.messages ?? []);
    markMessagesRead(walletID, selectedAsset, visible.map(readKey));
  }, [paused, selectedAsset, walletID, activeTab, groupMessages, privateConversations]);

  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  const effectiveAddress = identity?.address ?? null;

  // Mirrors of the message state, so the channel-switch cleanup can stash the
  // latest values without re-running on every incoming message.
  const groupMessagesRef = useRef<DePINMessage[]>([]);
  const privateConversationsRef = useRef<Map<string, PrivateConversation>>(new Map());
  useEffect(() => {
    groupMessagesRef.current = groupMessages;
  }, [groupMessages]);
  useEffect(() => {
    privateConversationsRef.current = privateConversations;
  }, [privateConversations]);
  const groupUnreadRef = useRef(0);
  useEffect(() => {
    groupUnreadRef.current = groupUnread;
  }, [groupUnread]);

  const lastTimestampRef = useRef<number>(0);
  const cursorRef = useRef<DepinSequenceCursor | null>(null);
  const channelEpochRef = useRef(0);
  const membershipRef = useRef<string | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const seenMessageKeysRef = useRef<Set<string>>(new Set());
  // Stop an obsolete channel's in-flight page before publishing it.
  const pollAbortRef = useRef(false);
  // The next nonce is single-use, so manual and automatic reads share a lock.
  const challengeRef = useRef<ChallengeState | null>(null);
  // In-memory mirror of persisted private-message recipient mapping (hash -> address).
  const privateMsgRecipientsRef = useRef<Map<string, string>>(new Map());

  // Hydrate the private-message recipient map from AsyncStorage once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const mine = keys.filter(k => k.startsWith(PRIVATE_MSG_PREFIX));
        if (mine.length === 0 || cancelled) return;
        const pairs = await AsyncStorage.multiGet(mine);
        for (const [k, v] of pairs) {
          if (v) privateMsgRecipientsRef.current.set(k.slice(PRIVATE_MSG_PREFIX.length), v);
        }
      } catch (e) {
        console.debug('useDePINChat: failed to hydrate private msg map', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rememberPrivateRecipient = useCallback((hash: string, address: string) => {
    if (!hash || !address) return;
    privateMsgRecipientsRef.current.set(hash, address);
    AsyncStorage.setItem(PRIVATE_MSG_PREFIX + hash, address).catch(() => {});
  }, []);

  const getContactAddress = useCallback(
    (messageHash: string, sender: string, myAddr: string, messageType?: 'private' | 'group'): string | undefined => {
      if (messageType !== 'private') return undefined;
      if (sender === myAddr) {
        return privateMsgRecipientsRef.current.get(messageHash) ?? myAddr;
      }
      return sender;
    },
    [],
  );

  // Keep the admission cursor with its decrypted history when changing channels.
  useEffect(() => {
    const key =
      effectiveAddress && selectedAsset ? `${network}|${getDepinRpcConfig(network).url}|${effectiveAddress}|${selectedAsset}` : null;
    const cached = key ? channelCache.get(key) : undefined;

    channelEpochRef.current++;
    membershipRef.current = null;
    consecutiveFailuresRef.current = 0;
    // A challenge is bound to token + address, so it cannot cross a channel.
    challengeRef.current = null;
    setError(null);
    setLastPoll(null);

    if (cached) {
      lastTimestampRef.current = cached.lastTimestamp;
      cursorRef.current = cached.cursor ?? null;
      seenMessageKeysRef.current = new Set(cached.seenKeys);
      setGroupMessages(cached.groupMessages);
      setGroupUnread(cached.groupUnread);
      setPrivateConversations(new Map(cached.privateConversations));
    } else {
      lastTimestampRef.current = 0;
      cursorRef.current = null;
      seenMessageKeysRef.current = new Set();
      setGroupMessages([]);
      setGroupUnread(0);
      setPrivateConversations(new Map());
    }

    return () => {
      if (!key) return;
      channelCache.set(key, {
        groupMessages: groupMessagesRef.current,
        groupUnread: groupUnreadRef.current,
        privateConversations: privateConversationsRef.current,
        lastTimestamp: lastTimestampRef.current,
        seenKeys: Array.from(seenMessageKeysRef.current),
        cursor: cursorRef.current,
      });
    };
  }, [selectedAsset, effectiveAddress, network, rpc]);

  /** The channel as the device path needs it: the session is bound to token, pool and endpoint. */
  const deviceChannel = useCallback(
    (pool: DeviceChannel['pool'], token: string): DeviceChannel | null =>
      device && rpc
        ? {
            device,
            call: rpc as unknown as RawRpcCall,
            serviceUrl: getDepinRpcConfig(network).url,
            token: normalizeDepinToken(token),
            pool,
            onApproval: setDeviceApprovalPending,
          }
        : null,
    [device, rpc, network],
  );

  /** The USB link died: drop the session and let the screen offer to reconnect. */
  const handleDeviceError = useCallback(
    (err: unknown) => {
      if (!deviceBacked || !isDeviceLinkLost(err)) return;
      forgetDeviceSession(device);
      onDeviceLostRef.current?.();
    },
    [deviceBacked, device],
  );

  // `read`: messages already seen on screen, in this session or an earlier one.
  const ingestItems = useCallback((myAddr: string, decrypted: DePINMessage[], read: Set<string>) => {
    const isNew = (m: DePINMessage) => m.sender !== myAddr && !read.has(readKey(m));
    const newGroup: DePINMessage[] = [];
    const privateUpdates = new Map<string, DePINMessage[]>();
    for (const msg of decrypted) {
      if (msg.messageType === 'private' && msg.contactAddress) {
        if (!privateUpdates.has(msg.contactAddress)) privateUpdates.set(msg.contactAddress, []);
        privateUpdates.get(msg.contactAddress)!.push(msg);
      } else {
        newGroup.push(msg);
      }
    }
    if (newGroup.length > 0) {
      setGroupMessages(prev => [...prev, ...newGroup].sort((a, b) => a.timestamp - b.timestamp));
      // Only count what the user is not looking at, and never your own echo.
      const unseen = activeTabRef.current === 'group' ? 0 : newGroup.filter(isNew).length;
      if (unseen > 0) setGroupUnread(prev => prev + unseen);
    }
    if (privateUpdates.size > 0) {
      setPrivateConversations(prev => {
        const updated = new Map(prev);
        for (const [contact, msgs] of privateUpdates.entries()) {
          const existing = updated.get(contact);
          const all = existing ? [...existing.messages, ...msgs].sort((a, b) => a.timestamp - b.timestamp) : msgs;
          // Messages landing in the open conversation are read on arrival, and
          // your own outgoing ones never count.
          const unseen = activeTabRef.current === contact ? 0 : msgs.filter(isNew).length;
          updated.set(contact, {
            address: contact,
            displayName: contact === myAddr ? 'Me' : shortAddr(contact),
            unreadCount: (existing?.unreadCount || 0) + unseen,
            lastMessageTime: Math.max(...all.map(m => m.timestamp)),
            messages: all,
          });
        }
        return updated;
      });
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!selectedAsset || !effectiveAddress || !canCrypt || !rpc) return;
    const channelEpoch = channelEpochRef.current;

    // Bootstrap fixes the current pool instance/revision before private reads.
    // Keep reading by admission cursor even when count/timestamp stats are unchanged.
    let pool = await getVerifiedPool({
      call: rpc as unknown as RawRpcCall,
      network,
      url: getDepinRpcConfig(network).url,
    });

    if (channelEpoch !== channelEpochRef.current) return;
    const signature = poolSignature(summarizeVerifiedPool(pool));
    const readMarks = await loadReadMarks(walletID, selectedAsset);
    if (channelEpoch !== channelEpochRef.current) return;
    // Publish verified pages incrementally while the admission cursor advances.
    const toChatMessage = (meta: Omit<DepinPlainMessage, 'plaintext'>, plaintext: string): DePINMessage => {
      const ts = typeof meta.timestamp === 'number' ? meta.timestamp : Math.floor(Date.now() / 1000);
      // Some clients send private messages as plain "@recipient text" without
      // tagging message_type — route those to the private conversation (and
      // strip the prefix) instead of showing them raw in the group chat.
      const privMatch = plaintext.match(/^@(N[a-zA-Z0-9]{33,34}|t[a-zA-Z0-9]{33,34}|(?:nq|tnq)1r[a-z0-9]{58})\s+([\s\S]*)$/);
      const messageType = privMatch ? 'private' : meta.messageType;
      let contactAddress = getContactAddress(meta.hash, meta.sender, effectiveAddress, messageType);
      if (privMatch && meta.sender === effectiveAddress) contactAddress = privMatch[1];
      return {
        recipient: effectiveAddress,
        sender: meta.sender,
        message: privMatch ? privMatch[2] : plaintext,
        timestamp: ts,
        date: new Date(ts * 1000).toLocaleString(),
        expires: '',
        messageHash: meta.hash,
        messageType,
        contactAddress,
      };
    };

    // Publishes a page that arrived already verified and decrypted (RPC 6).
    const ingestVerified = (resolved: DepinPlainMessage[]) => {
      const seen = seenMessageKeysRef.current;
      let maxTimestamp = lastTimestampRef.current;
      const fresh: DePINMessage[] = [];
      for (const msg of resolved) {
        maxTimestamp = Math.max(maxTimestamp, msg.timestamp);
        if (seen.has(msg.hash)) continue;
        seen.add(msg.hash);
        fresh.push(toChatMessage(msg, msg.plaintext));
      }
      lastTimestampRef.current = maxTimestamp;
      if (fresh.length > 0) ingestItems(effectiveAddress, fresh, readMarks);
    };

    const membership = [pool.context.instance_id, pool.context.membership_revision].join('|');
    if (membershipRef.current !== membership) {
      challengeRef.current = null;
      onMembershipChangedRef.current?.();
      membershipRef.current = membership;
    }
    if (channelEpoch !== channelEpochRef.current) return;
    let caughtUp = false;

    if (deviceBacked) {
      // The device signs each request, verifies the pool's reply and opens the rows.
      const channel = deviceChannel(pool, selectedAsset);
      if (!channel) throw new Error('Connect the NeuraiHW device to read this channel');
      for (let page = 0; page < DEVICE_PAGES_PER_POLL; page++) {
        const previousCursor = cursorRef.current;
        const result = await receiveDevicePage({ ...channel, cursor: previousCursor });
        if (channelEpoch !== channelEpochRef.current) return;
        ingestVerified(result.messages);
        cursorRef.current = result.cursor;
        caughtUp = !result.hasMore;
        if (pollAbortRef.current || caughtUp) break;
        if (previousCursor && result.cursor.stream_id === previousCursor.stream_id && result.cursor.after_seq === previousCursor.after_seq)
          throw new Error('DePIN cursor made no progress');
      }
      if (caughtUp && isMeaningfulSignature(signature)) markPoolSeen(walletID, signature);
      setLastPoll(new Date());
      return;
    }

    if (!identity?.wif) throw new Error('No local DePIN signing identity');
    const receiveIdentity = await softwareIdentity(String(identity.wif), network, identity.address);
    for (let page = 0; page < MAX_PAGES_PER_POLL; page++) {
      const previousCursor = cursorRef.current;
      try {
        const result = await receiveDepinPage({
          call: rpc as unknown as RawRpcCall,
          identity: receiveIdentity,
          token: normalizeDepinToken(selectedAsset),
          pool,
          network,
          previous: challengeRef.current,
          cursor: previousCursor,
          limit: 100,
          refreshPool: () => getVerifiedPool({ call: rpc as unknown as RawRpcCall, network, url: getDepinRpcConfig(network).url }),
        });
        if (channelEpoch !== channelEpochRef.current) return;
        pool = result.pool;
        challengeRef.current = result.next;
        ingestVerified(readableMessages(result.messages));
        cursorRef.current = result.cursor;
        if (result.membershipChanged) {
          onMembershipChangedRef.current?.();
          membershipRef.current = [pool.context.instance_id, pool.context.membership_revision].join('|');
        }
        caughtUp = !result.hasMore;
        if (pollAbortRef.current || caughtUp) break;
        if (previousCursor && result.cursor.stream_id === previousCursor.stream_id && result.cursor.after_seq === previousCursor.after_seq)
          throw new Error('DePIN cursor made no progress');
      } catch (error) {
        if (channelEpoch !== channelEpochRef.current) return;
        challengeRef.current = null;
        throw error;
      }
    }

    if (caughtUp && isMeaningfulSignature(signature)) markPoolSeen(walletID, signature);
    setLastPoll(new Date());
  }, [
    rpc,
    network,
    selectedAsset,
    effectiveAddress,
    identity,
    getContactAddress,
    ingestItems,
    deviceBacked,
    deviceChannel,
    canCrypt,
    walletID,
  ]);

  // Automatic polling every 5s while connected.
  useEffect(() => {
    if (paused || !selectedAsset || !effectiveAddress || !isPolling || !rpc) return;
    let active = true;
    pollAbortRef.current = false;

    const run = async () => {
      if (pollLock.current) return; // another read owns the single-use nonce
      pollLock.current = true;
      try {
        await pollOnce();
        if (active) {
          consecutiveFailuresRef.current = 0;
          setError(null);
        }
      } catch (err: any) {
        console.warn('useDePINChat: poll failed:', describeRpcError(err) ?? err);
        // The device spent its per-minute budget; the next tick goes through.
        if (deviceBacked && isDeviceRateLimited(err)) return;
        // Declined session, old firmware or a lost link: only the owner can fix
        // these, and retrying on a timer would keep prompting the device.
        if (deviceBacked && (isDeviceStopError(err) || isDeviceLinkLost(err))) {
          handleDeviceError(err);
          if (active) {
            setError(describeRpcError(err) ?? 'The device could not read this channel');
            setIsPolling(false);
          }
          return;
        }
        // The first poll right after selecting a token often races a cold RPC
        // connection; polling keeps retrying every 5s, so only surface an error
        // after it fails repeatedly (the UI shows a "checking…" state meanwhile).
        consecutiveFailuresRef.current += 1;
        // Some RPC-6 rejections describe a state polling cannot escape —
        // say what it is instead of repeating the node's wording.
        const explained = explainDepinReceiveRejection(describeRpcError(err) ?? err);
        if (active && (explained || consecutiveFailuresRef.current >= 2)) {
          setError(explained ?? describeRpcError(err) ?? 'Failed to fetch messages');
        }
        // Re-entering the channel or a manual refresh permits another attempt.
        if (active && consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          console.warn('useDePINChat: polling stopped after repeated failures');
          setIsPolling(false);
        }
      } finally {
        pollLock.current = false;
      }
    };

    run();
    const interval = setInterval(run, deviceBacked ? DEVICE_POLL_INTERVAL_MS : DEPIN_POLL_INTERVAL_MS);
    return () => {
      active = false;
      pollAbortRef.current = true; // stop an in-flight page from publishing
      clearInterval(interval);
    };
  }, [paused, rpc, selectedAsset, effectiveAddress, isPolling, pollOnce, deviceBacked, handleDeviceError]);

  const refreshMessages = useCallback(async () => {
    if (pollLock.current) return;
    pollLock.current = true;
    const epoch = channelEpochRef.current;
    try {
      await pollOnce();
      if (epoch === channelEpochRef.current) setError(null);
    } catch (err: any) {
      console.debug('useDePINChat: manual refresh failed', err?.message ?? err);
      handleDeviceError(err);
      if (epoch === channelEpochRef.current) setError(describeRpcError(err) ?? 'Failed to fetch messages');
    } finally {
      pollLock.current = false;
    }
  }, [pollOnce, handleDeviceError]);

  const fetchStats = useCallback(async (): Promise<PoolStats | null> => {
    if (!rpc) return null;
    try {
      const pool = await getVerifiedPool({ call: rpc as unknown as RawRpcCall, network, url: getDepinRpcConfig(network).url });
      const result = (await getVerifiedPoolStats({ call: rpc as unknown as RawRpcCall, pool })) as unknown as PoolStats;
      setStats(result);
      return result;
    } catch (e) {
      console.debug('useDePINChat: depinpoolstats failed', e);
      return null;
    }
  }, [rpc, network]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!selectedAsset || !effectiveAddress || !identity?.publicKey || !canCrypt) {
        throw new Error('DePIN chat not ready');
      }
      if (!rpc) throw new Error('No DePIN RPC backend');

      const privateMatch = message.match(/^@(N[a-zA-Z0-9]{33,34}|t[a-zA-Z0-9]{33,34}|(?:nq|tnq)1r[a-z0-9]{58})\s+([\s\S]*)$/);
      const isPrivate = !!privateMatch;
      const targetAddress = isPrivate ? privateMatch![1] : null;
      const cleaned = isPrivate ? privateMatch![2] : message;

      const senderPubKey = String(identity.publicKey).trim().toLowerCase();
      const timestamp = Math.floor(Date.now() / 1000);

      // Verify the current pool identity before building a signed RPC 6 request.
      const pool = await getVerifiedPool({
        call: rpc as unknown as RawRpcCall,
        network,
        url: getDepinRpcConfig(network).url,
      });

      // C1 remains separate: the current audit hook has no independent source
      // and reports independent:false. Pool signatures and address/key binding
      // do not prove asset ownership; this hook never claims otherwise.
      const auditedAddresses = isPrivate && targetAddress ? [targetAddress] : recipientList.map(r => r.address);
      auditRecipients({ addresses: auditedAddresses, token: normalizeDepinToken(selectedAsset), network })
        .then(audit => {
          if (audit.independent && !audit.ok && audit.unconfirmed.length > 0) {
            setRecipientWarning(
              `${audit.unconfirmed.length} recipient address(es) are not confirmed as active holders of ` +
                `${selectedAsset} by ${audit.auditUrl}. The DePIN server may be listing addresses that do ` +
                `not hold the token. Your message was still sent.`,
            );
          } else {
            setRecipientWarning(null);
          }
        })
        .catch(e => console.debug('useDePINChat: recipient audit failed', e));

      // A private message goes to one holder and to us, and to nobody else. A
      // group message is resolved and encrypted to every holder by the library.
      if (deviceBacked) {
        const channel = deviceChannel(pool, selectedAsset);
        if (!channel) throw new Error('Connect the NeuraiHW device to send');
        let deviceSent: { messageHash: string };
        try {
          deviceSent = await sendDeviceMessage({ ...channel, message: cleaned, toAddress: isPrivate ? targetAddress : null });
        } catch (err) {
          handleDeviceError(err);
          throw err;
        }
        if (isPrivate && targetAddress) rememberPrivateRecipient(deviceSent.messageHash, targetAddress);
        return deviceSent.messageHash;
      }

      const chatIdentity = await softwareIdentity(String(identity.wif), network, identity.address);
      const sent =
        isPrivate && targetAddress
          ? await sendDepinPrivateMessage({
              call: rpc as unknown as RawRpcCall,
              pool,
              identity: chatIdentity,
              token: selectedAsset,
              toAddress: targetAddress,
              message: cleaned,
              timestamp,
              network,
              senderPubKey,
              privateKey: String(identity.wif),
            })
          : await sendDepinGroupMessage({
              call: rpc as unknown as RawRpcCall,
              pool,
              identity: chatIdentity,
              token: selectedAsset,
              message: cleaned,
              timestamp,
              network,
            });
      const result = sent.messageHash;

      // Local bookkeeping is now only a convenience: the `@address` tag travels
      // inside the encrypted payload, so this message places itself correctly on
      // any device, not just this one.
      if (isPrivate && targetAddress && typeof result === 'string') {
        rememberPrivateRecipient(result, targetAddress);
      }

      // Only a completed receive scan marks the pool as read. A send receipt
      // cannot prove that concurrent messages from others have been read.
      return result;
    },
    [
      rpc,
      network,
      selectedAsset,
      effectiveAddress,
      identity,
      recipientList,
      rememberPrivateRecipient,
      deviceBacked,
      canCrypt,
      deviceChannel,
      handleDeviceError,
    ],
  );

  const checkAssetValidity = useCallback(async (): Promise<AssetValidity | null> => {
    if (!selectedAsset || !effectiveAddress || !rpc) return null;
    try {
      return (await rpc('checkdepinvalidity', [selectedAsset, effectiveAddress])) as AssetValidity;
    } catch (e) {
      console.debug('useDePINChat: checkdepinvalidity failed', e);
      return null;
    }
  }, [rpc, selectedAsset, effectiveAddress]);

  const createPrivateConversation = useCallback(
    (address: string) => {
      setPrivateConversations(prev => {
        if (prev.has(address)) return prev;
        const updated = new Map(prev);
        updated.set(address, {
          address,
          displayName: address === effectiveAddress ? 'Me' : shortAddr(address),
          unreadCount: 0,
          lastMessageTime: Math.floor(Date.now() / 1000),
          messages: [],
        });
        return updated;
      });
    },
    [effectiveAddress],
  );

  const totalUnread = groupUnread + Array.from(privateConversations.values()).reduce((sum, c) => sum + c.unreadCount, 0);
  // The wallet's DePIN marker (home tile, tab bar) stays on while this is above zero.
  useEffect(() => {
    if (selectedAsset) setUnreadCount(walletID, selectedAsset, totalUnread);
  }, [walletID, selectedAsset, totalUnread]);

  return {
    groupMessages,
    privateConversations,
    groupUnread,
    /** Unread across every conversation — drives the badge on the contacts button. */
    totalUnread,
    isPolling,
    setIsPolling,
    /** The device waits for the owner to approve the DePIN session. */
    deviceApprovalPending,
    error,
    /** Advisory: the independent node did not confirm every listed recipient. */
    recipientWarning,
    stats,
    lastPoll,
    sendMessage,
    refreshMessages,
    fetchStats,
    checkAssetValidity,
    createPrivateConversation,
  };
}
