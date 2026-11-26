/**
 * The messages of a conversation as messaging apps draw them: bubbles with a
 * tail on the last of each run, the sender's name in colour on the first one
 * in a group, the time and the delivery mark inside the bubble, a heading for
 * each day, and a button back to the latest messages when scrolled up.
 *
 * The list is inverted (newest at the bottom, index 0), so it stays on the
 * latest message as new ones arrive without measuring anything.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import dayjs from 'dayjs';
import Svg, { Path } from 'react-native-svg';

import loc from '../../loc';
import Icon from '../Icon';
import { useSettingsPalette } from '../settings/SettingsUI';
import { buildChatRows, ChatMessage, ChatRow } from './chatRows';
import { senderNameColor, useChatPalette } from './chatTheme';
import { addressTag, avatarColor, SenderAvatar, UnreadBadge } from './DepinUI';

/** Scrolled further up than this, the button back to the latest messages shows. */
const SHOW_LATEST_AFTER = 240;
const COPIED_MS = 1_500;
const AVATAR = 32;
/** Figure spaces fit a digit each: room left at the end of the text for the time. */
const FIGURE_SPACE = ' ';

interface DepinMessageListProps {
  messages: ChatMessage[];
  me: string;
  isGroup: boolean;
  listRef: React.MutableRefObject<FlatList<ChatRow> | null>;
  empty: React.ReactNode;
}

const Tail: React.FC<{ side: 'left' | 'right'; color: string }> = ({ side, color }) => (
  <Svg width={9} height={14} viewBox="0 0 9 14" style={side === 'right' ? styles.tailRight : styles.tailLeft} pointerEvents="none">
    <Path d={side === 'right' ? 'M0 0 C0 7 2 11 9 14 L0 14 Z' : 'M9 0 C9 7 7 11 0 14 L9 14 Z'} fill={color} />
  </Svg>
);

interface MessageRowProps {
  row: ChatRow;
  isGroup: boolean;
  onCopy: (text: string) => void;
}

const MessageRowBase = ({ row, isGroup, onCopy }: MessageRowProps) => {
  const c = useChatPalette();
  const { message, mine, runStart, runEnd } = row;
  const time = dayjs(message.createdAt).format('HH:mm');
  const showName = !mine && isGroup && runStart;
  const showAvatarColumn = !mine && isGroup;
  const fill = mine ? c.outgoing : c.incoming;
  const who = mine ? loc.depin.you : addressTag(message.sender);
  const state = mine ? (message.pending ? loc.depin.sending : loc.depin.delivered) : '';
  // The side the tail is on gets tighter corners between the bubbles of a run.
  const corners = mine
    ? { borderTopRightRadius: runStart ? 18 : 6, borderBottomRightRadius: runEnd ? 4 : 6 }
    : { borderTopLeftRadius: runStart ? 18 : 6, borderBottomLeftRadius: runEnd ? 4 : 6 };

  return (
    <View>
      {row.day ? (
        <View style={styles.dayWrap}>
          <View style={[styles.dayPill, { backgroundColor: c.pill }]}>
            <Text style={[styles.dayText, { color: c.pillText }]} accessibilityRole="header">
              {row.day}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.line, mine ? styles.lineOut : styles.lineIn, runStart ? styles.runGap : styles.inRunGap]}>
        {showAvatarColumn ? runEnd ? <SenderAvatar address={message.sender} size={AVATAR} /> : <View style={styles.avatarSpace} /> : null}
        <Pressable
          onLongPress={() => onCopy(message.text)}
          delayLongPress={350}
          accessibilityLabel={[`${who}: ${message.text}`, time, state].filter(Boolean).join(', ')}
          accessibilityHint={loc.depin.copy_hint}
          style={({ pressed }) => [
            styles.bubble,
            mine ? styles.bubbleOut : styles.bubbleIn,
            corners,
            { backgroundColor: fill },
            pressed && styles.pressed,
          ]}
          testID={mine ? 'DepinMessageOut' : 'DepinMessageIn'}
        >
          {showName ? (
            <Text style={[styles.name, { color: senderNameColor(avatarColor(message.sender), c.dark) }]} numberOfLines={1}>
              {addressTag(message.sender)}
            </Text>
          ) : null}
          <Text style={[styles.text, { color: mine ? c.outgoingText : c.incomingText }]}>
            {message.text}
            <Text style={styles.spacer}>{FIGURE_SPACE.repeat(time.length + (mine ? 5 : 2))}</Text>
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.time, { color: mine ? c.timeOut : c.timeIn }]}>{time}</Text>
            {mine ? <Icon name={message.pending ? 'schedule' : 'done-all'} type="material" size={15} color={c.tick} /> : null}
          </View>
          {runEnd ? <Tail side={mine ? 'right' : 'left'} color={fill} /> : null}
        </Pressable>
      </View>
    </View>
  );
};

const MessageRow = React.memo(MessageRowBase);

const DepinMessageList = ({ messages, me, isGroup, listRef, empty }: DepinMessageListProps) => {
  const p = useSettingsPalette();
  const c = useChatPalette();
  const rows = useMemo(
    () => buildChatRows(messages, me, { today: loc.transactions.date_today, yesterday: loc.transactions.date_yesterday }).reverse(),
    [messages, me],
  );

  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const seenCount = useRef(messages.length);
  useEffect(() => {
    const added = messages.length - seenCount.current;
    seenCount.current = messages.length;
    if (added > 0 && awayFromLatest) setNewBelow(count => count + added);
  }, [messages.length, awayFromLatest]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const away = event.nativeEvent.contentOffset.y > SHOW_LATEST_AFTER;
    setAwayFromLatest(away);
    if (!away) setNewBelow(0);
  }, []);

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );
  const onCopy = useCallback((text: string) => {
    Clipboard.setString(text);
    AccessibilityInfo.announceForAccessibility(loc.depin.message_copied);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, []);

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: ChatRow }) => <MessageRow row={item} isGroup={isGroup} onCopy={onCopy} />,
    [isGroup, onCopy],
  );

  return (
    <View style={styles.flex}>
      {rows.length === 0 ? (
        // Outside the list: an inverted list draws its empty state upside down.
        <View style={styles.emptyWrap}>{empty}</View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          inverted
          keyExtractor={row => row.message.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={64}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          windowSize={11}
          testID="DepinMessageList"
        />
      )}

      {awayFromLatest && rows.length > 0 ? (
        <Pressable
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          accessibilityRole="button"
          accessibilityLabel={loc.depin.scroll_to_latest}
          testID="DepinScrollToLatest"
          style={({ pressed }) => [styles.latest, { backgroundColor: p.card }, pressed && styles.pressed]}
        >
          <Icon name="keyboard-arrow-down" type="material" size={26} color={p.ink} />
          <UnreadBadge count={newBelow} style={styles.latestBadge} />
        </Pressable>
      ) : null}

      {copied ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: c.pill }]}>
            <Icon name="check" type="material" size={16} color={c.pillText} />
            <Text style={[styles.toastText, { color: c.pillText }]}>{loc.depin.message_copied}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  content: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dayWrap: { alignItems: 'center', marginTop: 14, marginBottom: 6 },
  dayPill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  dayText: { fontSize: 13, fontWeight: '600' },
  line: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 6 },
  lineIn: { justifyContent: 'flex-start', paddingRight: 48 },
  lineOut: { justifyContent: 'flex-end', paddingLeft: 48 },
  runGap: { marginTop: 8 },
  inRunGap: { marginTop: 2 },
  avatarSpace: { width: AVATAR },
  bubble: { borderRadius: 18, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7, maxWidth: '100%', flexShrink: 1 },
  bubbleIn: { marginLeft: 6 },
  bubbleOut: { marginRight: 6 },
  name: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  text: { fontSize: 16, lineHeight: 22 },
  spacer: { fontSize: 12, color: 'transparent' },
  meta: { position: 'absolute', right: 10, bottom: 5, flexDirection: 'row', alignItems: 'center', columnGap: 3 },
  time: { fontSize: 11 },
  tailRight: { position: 'absolute', right: -7, bottom: 0 },
  tailLeft: { position: 'absolute', left: -7, bottom: 0 },
  latest: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  latestBadge: { position: 'absolute', top: -6, right: -4 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', columnGap: 6, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  toastText: { fontSize: 13, fontWeight: '600' },
});

export default DepinMessageList;
