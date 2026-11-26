/**
 * The areas of the DePIN section, chosen with a segmented control: the chats
 * of the DePIN tokens held at the DePIN address, the IoT test area, and the
 * DePIN address itself.
 * Each token is a row saying whether this server opens its chat and whether
 * it has messages waiting.
 */
import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import loc from '../../loc';
import Icon from '../Icon';
import {
  SettingsBadge,
  SettingsCard,
  SettingsIconCircle,
  SettingsSectionLabel,
  SettingsSegmented,
  useSettingsPalette,
} from '../settings/SettingsUI';
import { UnreadBadge } from './DepinUI';

export type DepinSection = 'chat' | 'iot' | 'address';

interface DepinChatTokenSectionsProps {
  activeSection: DepinSection;
  /** What the Address tab shows: the DePIN address card. */
  addressPanel: ReactNode;
  assetNames: string[];
  /** The server has new traffic not read yet (it serves one token: the one with access). */
  hasNewMessages: boolean;
  loadingAssets: boolean;
  onSelectAsset: (assetName: string) => void;
  onSelectSection: (section: DepinSection) => void;
  tokenHasAccess: (assetName: string) => boolean | null;
  /** Unread messages per token, as the chat last counted them. */
  unreadCounts: Record<string, number>;
}

const TokenRow: React.FC<{
  name: string;
  access: boolean | null;
  unread: number;
  isNew: boolean;
  divider: boolean;
  onPress: () => void;
}> = ({ name, access, unread, isNew, divider, onPress }) => {
  const p = useSettingsPalette();
  const tone = access === true ? p.ok : access === false ? p.fail : p.idle;
  const state = access === true ? loc.depin.token_open : access === false ? loc.depin.token_closed : loc.depin.token_checking;
  const news =
    unread > 0 ? (loc.formatString(loc.depin.unread_count, { count: unread }) as string) : isNew ? loc.depin.new_badge : undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, state, news].filter(Boolean).join(', ')}
      testID={`DepinAsset-${name}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        pressed && styles.pressed,
      ]}
    >
      <SettingsIconCircle icon="forum" muted={access === false} />
      <View style={styles.texts}>
        <Text style={[styles.rowTitle, { color: p.ink }]}>{name}</Text>
        <View style={styles.subtitleRow}>
          <View style={[styles.dot, { backgroundColor: tone.dot }]} />
          <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{state}</Text>
        </View>
      </View>
      {unread > 0 ? <UnreadBadge count={unread} /> : isNew ? <SettingsBadge label={loc.depin.new_badge} tone="ok" /> : null}
      <Icon name="chevron-right" type="material" size={22} color={p.mutedOnCard} />
    </Pressable>
  );
};

const DepinChatTokenSections = ({
  activeSection,
  addressPanel,
  assetNames,
  hasNewMessages,
  loadingAssets,
  onSelectAsset,
  onSelectSection,
  tokenHasAccess,
  unreadCounts,
}: DepinChatTokenSectionsProps) => {
  const p = useSettingsPalette();
  return (
    <>
      <SettingsSegmented<DepinSection>
        segments={[
          { value: 'chat', label: loc.depin.tab_chat, icon: 'forum', testID: 'DepinSectionChat' },
          { value: 'iot', label: `${loc.depin.tab_iot} · ${loc.depin.iot_test_badge}`, icon: 'memory', testID: 'DepinSectionIot' },
          { value: 'address', label: loc.depin.area_address, icon: 'qr-code-2', testID: 'DepinSectionAddress' },
        ]}
        value={activeSection}
        onChange={onSelectSection}
        testID="DepinSections"
      />

      {activeSection === 'chat' ? (
        <View>
          <SettingsSectionLabel>{loc.depin.tokens_label}</SettingsSectionLabel>
          <SettingsCard>
            {loadingAssets && assetNames.length === 0 ? (
              <ActivityIndicator style={styles.loader} color={p.accent} accessibilityLabel={loc.depin.token_checking} />
            ) : assetNames.length === 0 ? (
              <View style={styles.empty} testID="DepinNoTokens">
                <SettingsIconCircle icon="token" muted />
                <Text style={[styles.emptyText, { color: p.mutedOnCard }]}>{loc.depin.no_token}</Text>
              </View>
            ) : (
              assetNames.map((name, index) => {
                const access = tokenHasAccess(name);
                return (
                  <TokenRow
                    key={name}
                    name={name}
                    access={access}
                    unread={unreadCounts[name] ?? 0}
                    isNew={hasNewMessages && access === true}
                    divider={index > 0}
                    onPress={() => onSelectAsset(name)}
                  />
                );
              })
            )}
          </SettingsCard>
        </View>
      ) : activeSection === 'address' ? (
        addressPanel
      ) : (
        <SettingsCard style={styles.iot} testID="DepinIotArea">
          <View style={styles.iotHead}>
            <SettingsIconCircle icon="memory" />
            <View style={styles.texts}>
              <View style={styles.iotTitleRow}>
                <Text style={[styles.rowTitle, { color: p.ink }]}>{loc.depin.tab_iot}</Text>
                <SettingsBadge label={loc.depin.iot_test_badge} />
              </View>
              <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{loc.depin.iot_placeholder}</Text>
            </View>
          </View>
        </SettingsCard>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  loader: { marginVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 68, paddingVertical: 10 },
  texts: { flex: 1, rowGap: 3 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subtitle: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  empty: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12, paddingVertical: 16 },
  emptyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  iot: { paddingVertical: 16 },
  iotHead: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12 },
  iotTitleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
});

export default DepinChatTokenSections;
