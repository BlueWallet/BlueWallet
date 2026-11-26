/**
 * Conversations of a token chat, sliding in from the left: the group, the
 * private conversations (with what was said last and how much is unread) and
 * the token holders a private conversation can be started with.
 */
import React, { useMemo } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PrivateConversation, RecipientInfo } from '../../hooks/useDePINChat';
import loc from '../../loc';
import Icon from '../Icon';
import { SettingsCard, SettingsSectionLabel, useSettingsPalette } from '../settings/SettingsUI';
import { RoundIconButton, SenderAvatar, UnreadBadge } from './DepinUI';
import { shortAddr } from './utils';

interface DepinChatContactsDrawerProps {
  activeTab: string;
  /** Unread arrivals in the public group. */
  groupUnread: number;
  closeDrawer: () => void;
  drawerAnim: Animated.Value;
  holderContacts: RecipientInfo[];
  identityAddress: string;
  privateTabs: PrivateConversation[];
  selectConversation: (address: string) => void;
  selectedAsset: string;
  visible: boolean;
}

const DRAWER_WIDTH = 320;

const ConversationRow: React.FC<{
  avatar: React.ReactNode;
  title: string;
  subtitle?: string;
  unread?: number;
  selected?: boolean;
  divider?: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ avatar, title, subtitle, unread = 0, selected, divider, onPress, testID }) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={[title, subtitle, unread > 0 ? (loc.formatString(loc.depin.unread_count, { count: unread }) as string) : '']
        .filter(Boolean)
        .join(', ')}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        selected && { backgroundColor: p.selectedBg },
        pressed && styles.pressed,
      ]}
    >
      {avatar}
      <View style={styles.texts}>
        <Text style={[styles.rowTitle, { color: p.ink }, unread > 0 && styles.rowTitleUnread]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {unread > 0 ? <UnreadBadge count={unread} /> : selected ? <Icon name="check" type="material" size={20} color={p.accentText} /> : null}
    </Pressable>
  );
};

const DepinChatContactsDrawer = ({
  activeTab,
  groupUnread,
  closeDrawer,
  drawerAnim,
  holderContacts,
  identityAddress,
  privateTabs,
  selectConversation,
  selectedAsset,
  visible,
}: DepinChatContactsDrawerProps) => {
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const drawerTranslateX = useMemo(() => drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH, 0] }), [drawerAnim]);

  if (!visible) return null;

  const nameOf = (address: string) => (address === identityAddress ? loc.depin.contacts_me : shortAddr(address));
  const lastLine = (conversation: PrivateConversation) => {
    const last = conversation.messages[conversation.messages.length - 1];
    if (!last) return shortAddr(conversation.address);
    return last.sender === identityAddress ? `${loc.depin.you}: ${last.message}` : last.message;
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: drawerAnim }]}>
        <Pressable style={styles.flex} onPress={closeDrawer} accessibilityRole="button" accessibilityLabel={loc._.close} />
      </Animated.View>
      <Animated.View
        style={[styles.drawer, { backgroundColor: p.ground, transform: [{ translateX: drawerTranslateX }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
            {loc.depin.conversations_title}
          </Text>
          <RoundIconButton icon="close" label={loc._.close} onPress={closeDrawer} testID="DepinContactsClose" />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
          <View>
            <SettingsSectionLabel>{loc.depin.chats_label}</SettingsSectionLabel>
            <SettingsCard style={styles.card}>
              <ConversationRow
                avatar={
                  <View style={[styles.groupAvatar, { backgroundColor: p.accentSoft }]}>
                    <Icon name="groups" type="material" size={22} color={p.accentText} />
                  </View>
                }
                title={loc.depin.tab_group}
                subtitle={loc.formatString(loc.depin.group_subtitle, { token: selectedAsset }) as string}
                unread={groupUnread}
                selected={activeTab === 'group'}
                onPress={() => selectConversation('group')}
                testID="DepinDrawerGroup"
              />
              {privateTabs.map(conversation => (
                <ConversationRow
                  key={conversation.address}
                  avatar={<SenderAvatar address={conversation.address} size={40} me={conversation.address === identityAddress} />}
                  title={nameOf(conversation.address)}
                  subtitle={lastLine(conversation)}
                  unread={conversation.unreadCount}
                  selected={activeTab === conversation.address}
                  divider
                  onPress={() => selectConversation(conversation.address)}
                  testID={`DepinDrawerPrivate-${conversation.address}`}
                />
              ))}
            </SettingsCard>
          </View>

          {holderContacts.length > 0 && (
            <View>
              <SettingsSectionLabel>{loc.depin.holders_label}</SettingsSectionLabel>
              <SettingsCard style={styles.card}>
                {holderContacts.map((contact, index) => (
                  <ConversationRow
                    key={contact.address}
                    avatar={<SenderAvatar address={contact.address} size={40} me={contact.address === identityAddress} />}
                    title={nameOf(contact.address)}
                    subtitle={contact.address === identityAddress ? loc.depin.notes_subtitle : loc.depin.start_private}
                    divider={index > 0}
                    onPress={() => selectConversation(contact.address)}
                    testID={`DepinDrawerHolder-${contact.address}`}
                  />
                ))}
              </SettingsCard>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  drawer: {
    width: DRAWER_WIDTH,
    maxWidth: '88%',
    height: '100%',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  content: { paddingHorizontal: 12, paddingTop: 8, rowGap: 20 },
  card: { paddingHorizontal: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 14 },
  groupAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, rowGap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowTitleUnread: { fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 18 },
});

export default DepinChatContactsDrawer;
