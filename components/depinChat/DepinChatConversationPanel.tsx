/**
 * An open token chat, on its own squared ground so it never reads as part of
 * the wallet screens: a floating header (the menu with the conversations and
 * the chat's options, who this conversation is with, the chat info), the
 * messages and the input bar. Leaving is the system back, or "Leave" in the
 * menu.
 */
import React, { type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import loc from '../../loc';
import Icon from '../Icon';
import { useSettingsPalette } from '../settings/SettingsUI';
import type { ChatMessage, ChatRow } from './chatRows';
import { ChatWallpaper, useChatPalette } from './chatTheme';
import DepinMessageList from './DepinMessageList';
import { SenderAvatar } from './DepinUI';

interface DepinChatConversationPanelProps {
  /** 'group' or the address of the other side of a private conversation. */
  activeTab: string;
  /** Who the conversation is with: the token, a short address, or your notes. */
  title: string;
  subtitle: string;
  /** The chat is connecting or waiting for the device: shown in place of the subtitle. */
  busyNote: string | null;
  /** The server cannot be reached, or refused the read. */
  error: string | null;
  draft: string;
  identityAddress: string;
  messages: ChatMessage[];
  messagesListRef: React.MutableRefObject<FlatList<ChatRow> | null>;
  /** Something unread in a conversation that is not on screen: a dot on the menu. */
  unreadElsewhere: boolean;
  onChangeDraft: (draft: string) => void;
  onOpenMenu: () => void;
  onOpenInfo: () => void;
  onSend: () => void;
  overlays: ReactNode;
  revealBanner: ReactNode;
  selectedAsset: string;
  /** Bottom space under the input bar (gesture bar, or a little above the keyboard). */
  inputBottom: number;
  /** Lifts the whole chat above the keyboard. */
  keyboardOffset: number;
}

const DepinChatConversationPanel = ({
  activeTab,
  title,
  subtitle,
  busyNote,
  error,
  draft,
  identityAddress,
  messages,
  messagesListRef,
  unreadElsewhere,
  onChangeDraft,
  onOpenMenu,
  onOpenInfo,
  onSend,
  overlays,
  revealBanner,
  selectedAsset,
  inputBottom,
  keyboardOffset,
}: DepinChatConversationPanelProps) => {
  const p = useSettingsPalette();
  const c = useChatPalette();
  const isGroup = activeTab === 'group';
  const isNotes = activeTab === identityAddress;
  const canSend = draft.trim().length > 0;
  const placeholder = isGroup
    ? loc.depin.input_placeholder
    : (loc.formatString(loc.depin.input_placeholder_private_to, { name: title }) as string);

  return (
    <View style={[styles.flex, { paddingBottom: keyboardOffset }]}>
      <ChatWallpaper />

      <View style={[styles.header, { backgroundColor: p.card }]}>
        <Pressable
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel={unreadElsewhere ? `${loc.depin.menu}, ${loc.home.depin_new}` : loc.depin.menu}
          hitSlop={6}
          testID="DepinChatMenu"
          style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
        >
          <Icon name="menu" type="material" size={26} color={p.ink} />
          {unreadElsewhere ? (
            <View style={[styles.menuDot, { backgroundColor: p.unread, borderColor: p.card }]} testID="DepinUnreadDot" />
          ) : null}
        </Pressable>

        <Pressable
          onPress={onOpenInfo}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${busyNote ?? subtitle}. ${loc.depin.info_title}`}
          testID="DepinChatTitle"
          style={({ pressed }) => [styles.who, pressed && styles.pressed]}
        >
          {isGroup ? (
            <View style={[styles.channelAvatar, { backgroundColor: p.accentSoft }]}>
              <Icon name="tag" type="material" size={22} color={p.accentText} />
            </View>
          ) : (
            <SenderAvatar address={activeTab} size={40} me={isNotes} />
          )}
          <View style={styles.whoTexts}>
            <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
              {title}
            </Text>
            {busyNote ? (
              <View style={styles.subtitleRow} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={p.accentText} style={styles.busySpinner} />
                <Text style={[styles.subtitle, { color: p.accentText }]} numberOfLines={1}>
                  {busyNote}
                </Text>
              </View>
            ) : (
              <View style={styles.subtitleRow}>
                {isGroup ? null : <Icon name="lock" type="material" size={13} color={p.mutedOnCard} />}
                <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={onOpenInfo}
          accessibilityRole="button"
          accessibilityLabel={loc.depin.info_title}
          hitSlop={6}
          testID="DepinChatInfo"
          style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
        >
          <Icon name="info-outline" type="material" size={24} color={p.mutedOnCard} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.noteWrap} accessibilityLiveRegion="polite">
          <View style={[styles.errorNote, { backgroundColor: p.fail.bg }]} testID="DepinChatError">
            <Icon name="cloud-off" type="material" size={16} color={p.fail.fg} />
            <Text style={[styles.errorText, { color: p.fail.fg }]}>{`${error} — ${loc.depin.connection_retrying}`}</Text>
          </View>
        </View>
      ) : null}

      {revealBanner}

      <DepinMessageList
        messages={messages}
        me={identityAddress}
        isGroup={isGroup}
        listRef={messagesListRef}
        empty={
          <View style={[styles.empty, { backgroundColor: c.pill }]} testID="DepinChatEmpty">
            <Icon name={isGroup ? 'forum' : 'lock'} type="material" size={28} color={p.accentText} />
            <Text style={[styles.emptyTitle, { color: p.ink }]}>{loc.depin.chat_empty_title}</Text>
            <Text style={[styles.emptyText, { color: c.pillText }]}>
              {isGroup
                ? loc.formatString(loc.depin.chat_empty_group, { token: selectedAsset })
                : loc.formatString(loc.depin.chat_empty_private, { name: title })}
            </Text>
          </View>
        }
      />

      <View style={[styles.inputBar, { paddingBottom: inputBottom }]}>
        <View style={[styles.field, { backgroundColor: p.card }]}>
          <TextInput
            style={[styles.input, { color: p.ink }]}
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
        </View>
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={loc.home.send}
          accessibilityState={{ disabled: !canSend }}
          testID="DepinChatSend"
          style={({ pressed }) => [styles.send, { backgroundColor: p.button }, !canSend && styles.disabled, pressed && styles.pressed]}
        >
          <Icon name="send" type="material" size={22} color="#ffffff" />
        </Pressable>
      </View>

      {overlays}
    </View>
  );
};

const FLOAT_SHADOW = {
  shadowColor: '#111827',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.45 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 24,
    ...FLOAT_SHADOW,
  },
  menu: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  menuDot: { position: 'absolute', top: 9, right: 8, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: 48, paddingLeft: 4 },
  channelAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  whoTexts: { flex: 1, rowGap: 1 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
  busySpinner: { transform: [{ scale: 0.7 }], marginLeft: -4, marginRight: -2 },
  subtitle: { fontSize: 13, flexShrink: 1 },
  noteWrap: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 4 },
  errorNote: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  errorText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  empty: { alignItems: 'center', rowGap: 8, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 22, maxWidth: 320 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 8, paddingHorizontal: 10, paddingTop: 6 },
  field: { flex: 1, borderRadius: 24, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, ...FLOAT_SHADOW },
  input: { fontSize: 16, maxHeight: 128, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 0 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...FLOAT_SHADOW },
});

export default DepinChatConversationPanel;
