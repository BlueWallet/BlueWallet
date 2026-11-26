/**
 * An open token chat: a header with the way back, the token and the
 * conversation on screen (tap to change it), the conversations button with
 * the unread count and the chat info; a notice when a message arrives in
 * another conversation; the messages; and the input bar.
 */
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { Bubble, Day, GiftedChat, type IMessage } from 'react-native-gifted-chat';

import loc from '../../loc';
import Icon from '../Icon';
import { useSettingsPalette } from '../settings/SettingsUI';
import { DepinStatusTone, RoundIconButton, SenderAvatar, StatusLine, addressTag } from './DepinUI';

// Delivery state on our own messages, on the orange bubble: both above 3.5:1.
const TICK_PENDING = '#fcd34d';
const TICK_DELIVERED = '#86efac';

/** A message waiting in a conversation that is not on screen. */
export interface DepinUnreadNotice {
  tab: string;
  /** Who it is from: the group's name or a sender's short address. */
  name: string;
  count: number;
  /** Last message, as a preview. */
  preview: string;
  /** Address to draw the avatar for; none for the group. */
  address?: string;
}

interface DepinChatConversationPanelProps {
  activeConversationName: string;
  activeTab: string;
  draft: string;
  identityAddress: string;
  messages: IMessage[];
  messagesListRef: any;
  notice: DepinUnreadNotice | null;
  onBack: () => void;
  onChangeDraft: (draft: string) => void;
  onDismissNotice: () => void;
  onOpenDrawer: () => void;
  onOpenInfo: () => void;
  onOpenNotice: (tab: string) => void;
  onSend: () => void;
  overlays: ReactNode;
  revealBanner: ReactNode;
  selectedAsset: string;
  /** What the chat is doing when it is not simply up to date (connecting, a device approval, an error). */
  status: { text: string; tone: DepinStatusTone; busy: boolean } | null;
  /** Unread in the conversations not on screen. */
  unreadElsewhere: number;
  /** Bottom space under the input bar (gesture bar, or a little above the keyboard). */
  inputBottom: number;
  /** Lifts the whole chat above the keyboard. */
  keyboardOffset: number;
}

const DepinChatConversationPanel = ({
  activeConversationName,
  activeTab,
  draft,
  identityAddress,
  messages,
  messagesListRef,
  notice,
  onBack,
  onChangeDraft,
  onDismissNotice,
  onOpenDrawer,
  onOpenInfo,
  onOpenNotice,
  onSend,
  overlays,
  revealBanner,
  selectedAsset,
  status,
  unreadElsewhere,
  inputBottom,
  keyboardOffset,
}: DepinChatConversationPanelProps) => {
  const p = useSettingsPalette();
  const isGroup = activeTab === 'group';
  const canSend = draft.trim().length > 0;
  const placeholder = isGroup
    ? loc.depin.input_placeholder
    : (loc.formatString(loc.depin.input_placeholder_private_to, { name: activeConversationName }) as string);

  return (
    <View style={[styles.flex, { backgroundColor: p.ground, paddingBottom: keyboardOffset }]}>
      <View style={styles.header}>
        <RoundIconButton icon="arrow-back" label={loc.depin.back_to_tokens} onPress={onBack} testID="DepinChatBack" />
        <Pressable
          onPress={onOpenDrawer}
          accessibilityRole="button"
          accessibilityLabel={`${selectedAsset}, ${activeConversationName}. ${loc.depin.change_conversation}`}
          testID="DepinActiveConversation"
          style={({ pressed }) => [styles.headerTitle, pressed && styles.pressed]}
        >
          <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
            {selectedAsset}
          </Text>
          <View style={styles.conversationRow}>
            <Icon name={isGroup ? 'groups' : 'lock'} type="material" size={15} color={p.muted} />
            <Text style={[styles.conversationName, { color: p.muted }]} numberOfLines={1}>
              {activeConversationName}
            </Text>
            <Icon name="expand-more" type="material" size={18} color={p.muted} />
          </View>
        </Pressable>
        <RoundIconButton
          icon="forum"
          label={loc.depin.conversations_title}
          onPress={onOpenDrawer}
          badge={unreadElsewhere}
          testID="DepinContactsOpen"
        />
        <RoundIconButton icon="info-outline" label={loc.depin.info_title} onPress={onOpenInfo} testID="DepinChatInfo" />
      </View>

      {revealBanner}

      {status ? (
        <View style={styles.statusWrap}>
          <View style={[styles.statusPill, { backgroundColor: p.card }]}>
            <StatusLine tone={status.tone} text={status.text} busy={status.busy} testID="DepinChatStatus" />
          </View>
        </View>
      ) : null}

      {notice ? (
        <Pressable
          onPress={() => onOpenNotice(notice.tab)}
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${noticeTitle(notice)}. ${notice.preview}. ${loc.home.open}`}
          testID="DepinUnreadNotice"
          style={({ pressed }) => [styles.notice, { backgroundColor: p.card }, pressed && styles.pressed]}
        >
          {notice.address ? (
            <SenderAvatar address={notice.address} size={36} />
          ) : (
            <View style={[styles.noticeGroup, { backgroundColor: p.accentSoft }]}>
              <Icon name="groups" type="material" size={20} color={p.accentText} />
            </View>
          )}
          <View style={styles.noticeTexts}>
            <Text style={[styles.noticeTitle, { color: p.ink }]} numberOfLines={1}>
              {noticeTitle(notice)}
            </Text>
            <Text style={[styles.noticePreview, { color: p.mutedOnCard }]} numberOfLines={1}>
              {notice.preview}
            </Text>
          </View>
          <Text style={[styles.noticeOpen, { color: p.accentText }]}>{loc.home.open}</Text>
          <Pressable
            onPress={onDismissNotice}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={loc._.close}
            testID="DepinUnreadNoticeClose"
            style={({ pressed }) => [styles.noticeClose, pressed && styles.pressed]}
          >
            <Icon name="close" type="material" size={18} color={p.mutedOnCard} />
          </Pressable>
        </Pressable>
      ) : null}

      <View style={styles.flex}>
        <GiftedChat
          messages={messages}
          user={{ _id: identityAddress }}
          isInverted={false}
          renderInputToolbar={() => null}
          keyboardProviderProps={{ enabled: false } as any}
          messagesContainerRef={messagesListRef}
          messagesContainerStyle={{ backgroundColor: p.ground }}
          timeTextStyle={{ left: { color: p.mutedOnCard }, right: { color: 'rgba(255, 255, 255, 0.85)' } }}
          renderBubble={(props: any) => {
            const message: IMessage = props.currentMessage;
            const mine = message.user?._id === identityAddress;
            const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const who = mine ? loc.depin.you : addressTag(String(message.user?._id ?? ''));
            const state = mine ? (message.pending ? loc.depin.sending : loc.depin.delivered) : '';
            return (
              <Bubble
                {...props}
                wrapperStyle={{ left: [styles.bubble, { backgroundColor: p.card }], right: [styles.bubble, { backgroundColor: p.button }] }}
                textStyle={{ left: [styles.bubbleText, { color: p.ink }], right: [styles.bubbleText, styles.onButton] }}
                touchableProps={{ accessibilityLabel: [`${who}: ${message.text}`, time, state].filter(Boolean).join(', ') }}
                // An amber clock while the pool has not handed the message
                // back, a green check once it has: what the web wallet shows.
                renderTicks={(current: IMessage) => {
                  if (current.user?._id !== identityAddress) return null;
                  return current.pending ? (
                    <FontAwesome6 name="clock" iconStyle="regular" size={12} color={TICK_PENDING} style={styles.tick} />
                  ) : (
                    <FontAwesome6 name="circle-check" iconStyle="regular" size={12} color={TICK_DELIVERED} style={styles.tick} />
                  );
                }}
              />
            );
          }}
          renderAvatar={(props: any) => <SenderAvatar address={String(props?.currentMessage?.user?._id ?? '')} size={34} />}
          renderDay={(props: any) => (
            <Day
              {...props}
              wrapperStyle={[styles.day, { backgroundColor: p.card }]}
              textProps={{ style: [styles.dayText, { color: p.mutedOnCard }] }}
              dateFormatCalendar={{ sameDay: `[${loc.transactions.date_today}]` }}
            />
          )}
          renderChatEmpty={() => (
            <View style={styles.empty} testID="DepinChatEmpty">
              <View style={[styles.emptyIcon, { backgroundColor: p.accentSoft }]}>
                <Icon name={isGroup ? 'forum' : 'lock'} type="material" size={26} color={p.accentText} />
              </View>
              <Text style={[styles.emptyTitle, { color: p.ink }]}>{loc.depin.chat_empty_title}</Text>
              <Text style={[styles.emptyText, { color: p.muted }]}>
                {isGroup
                  ? loc.formatString(loc.depin.chat_empty_group, { token: selectedAsset })
                  : loc.formatString(loc.depin.chat_empty_private, { name: activeConversationName })}
              </Text>
            </View>
          )}
        />
      </View>

      <View style={[styles.inputBar, { backgroundColor: p.card, paddingBottom: inputBottom }]}>
        <TextInput
          style={[styles.inputField, { backgroundColor: p.ground, color: p.ink }]}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder={placeholder}
          placeholderTextColor={p.mutedOnCard}
          selectionColor={p.accent}
          accessibilityLabel={placeholder}
          multiline
          underlineColorAndroid="transparent"
          testID="DepinChatInput"
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={loc.home.send}
          accessibilityState={{ disabled: !canSend }}
          testID="DepinChatSend"
          style={({ pressed }) => [styles.sendBtn, { backgroundColor: p.button }, !canSend && styles.disabled, pressed && styles.pressed]}
        >
          <Icon name="send" type="material" size={20} color="#ffffff" />
        </Pressable>
      </View>

      {overlays}
    </View>
  );
};

const noticeTitle = (notice: DepinUnreadNotice): string =>
  notice.address
    ? (loc.formatString(notice.count > 1 ? loc.depin.notice_private_many : loc.depin.notice_private, {
        count: notice.count,
        name: notice.name,
      }) as string)
    : (loc.formatString(notice.count > 1 ? loc.depin.notice_group_many : loc.depin.notice_group, { count: notice.count }) as string);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  onButton: { color: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', columnGap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  headerTitle: { flex: 1, paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  conversationRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4, marginTop: 1 },
  conversationName: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  statusWrap: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  statusPill: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '100%' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  noticeGroup: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  noticeTexts: { flex: 1, rowGap: 1 },
  noticeTitle: { fontSize: 14, fontWeight: '700' },
  noticePreview: { fontSize: 13 },
  noticeOpen: { fontSize: 14, fontWeight: '700' },
  noticeClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 18 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  tick: { marginLeft: 6 },
  day: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  dayText: { fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40, rowGap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  inputField: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default DepinChatConversationPanel;
