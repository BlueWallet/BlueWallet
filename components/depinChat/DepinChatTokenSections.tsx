import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import loc from '../../loc';
import Icon from '../Icon';

// Cap on the selected tab. Same brand orange as the send button and the rest
// of the wallet's accents; the tabs themselves stay neutral so the green/red
// server dot is the only colored signal competing for attention.
const TAB_ACCENT = '#f97316';

interface DepinChatTokenSectionsProps {
  activeSection: 'chat' | 'iot';
  assetNames: string[];
  chatActive: boolean;
  iconColor: string;
  loadingAssets: boolean;
  onSelectAsset: (assetName: string) => void;
  onSelectSection: (section: 'chat' | 'iot') => void;
  revealBanner: ReactNode;
  stylesHook: any;
  tokenHasAccess: (assetName: string) => boolean | null;
}

const DepinChatTokenSections = ({
  activeSection,
  assetNames,
  chatActive,
  iconColor,
  loadingAssets,
  onSelectAsset,
  onSelectSection,
  revealBanner,
  stylesHook,
  tokenHasAccess,
}: DepinChatTokenSectionsProps) => {
  // The selected tab shares the panel's surface and leaves a gap in the top
  // line, so the two read as one folder sheet. Unselected tabs are shorter and
  // keep the line running underneath, sitting visually behind the panel.
  // Selection lives in the shape and the orange cap only — never in the border
  // color, which is what previously left Chat outlined in green while IoT was
  // open. Server health stays on its own dot.
  const tabStyle = (selected: boolean) =>
    selected ? [styles.tab, stylesHook.panel, styles.tabActive] : [styles.tab, styles.tabIdle, stylesHook.tabLine];

  return (
    <>
      <View style={styles.tabsRow}>
        <View style={[styles.tabFill, styles.tabFillLead, stylesHook.tabLine]} />

        {/* Always selectable: it holds the token list even when no held token opens a chat on this
            server (the red dot says so). Gating it trapped the user on IoT. */}
        <Pressable
          onPress={() => onSelectSection('chat')}
          style={[tabStyle(activeSection === 'chat'), !chatActive && styles.tabMuted]}
          testID="DepinSectionChat"
        >
          <View style={[styles.chipDot, chatActive ? styles.chipDotOk : styles.chipDotNo]} />
          <Text style={[styles.tabText, activeSection === 'chat' ? stylesHook.chipText : stylesHook.subtext]}>{loc.depin.tab_chat}</Text>
        </Pressable>

        <Pressable onPress={() => onSelectSection('iot')} style={tabStyle(activeSection === 'iot')} testID="DepinSectionIot">
          <Text style={[styles.tabText, activeSection === 'iot' ? stylesHook.chipText : stylesHook.subtext]}>{loc.depin.tab_iot}</Text>
          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>{loc.depin.iot_test_badge}</Text>
          </View>
        </Pressable>

        <View style={[styles.tabFill, styles.flex, stylesHook.tabLine]} />
      </View>

      <View style={[styles.panel, stylesHook.panel]}>
        {activeSection === 'chat' ? (
          <>
            <Text style={[styles.sectionLabel, stylesHook.subtext]}>{loc.depin.tokens_label}</Text>
            {loadingAssets && assetNames.length === 0 ? (
              <ActivityIndicator style={styles.loader} />
            ) : assetNames.length === 0 ? (
              <Text style={[styles.info, stylesHook.subtext]}>{loc.depin.no_token}</Text>
            ) : (
              <View style={styles.chipsWrap}>
                {assetNames.map(assetName => {
                  const access = tokenHasAccess(assetName);
                  return (
                    <Pressable
                      key={assetName}
                      onPress={() => onSelectAsset(assetName)}
                      style={[styles.chip, stylesHook.chip, access === true && styles.chipAccess, access === false && styles.chipNoAccess]}
                      testID={`DepinAsset-${assetName}`}
                    >
                      {access != null && <View style={[styles.chipDot, access ? styles.chipDotOk : styles.chipDotNo]} />}
                      <Text style={[styles.chipText, stylesHook.chipText]}>{assetName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.iotTitleRow}>
              <Icon name="memory" type="material" size={18} color={iconColor} />
              <Text style={[styles.iotTitle, stylesHook.text]}>{loc.depin.tab_iot}</Text>
            </View>
            <Text style={[styles.iotDesc, stylesHook.subtext]}>{loc.depin.iot_placeholder}</Text>
          </>
        )}
      </View>

      {activeSection === 'chat' ? revealBanner : null}
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  info: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  loader: { marginVertical: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipAccess: { borderColor: '#16a34a', borderWidth: 1.5, backgroundColor: 'rgba(22, 163, 74, 0.10)' },
  chipNoAccess: { borderColor: '#dc2626', borderWidth: 1.5, backgroundColor: 'rgba(220, 38, 38, 0.08)' },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipDotOk: { backgroundColor: '#16a34a' },
  chipDotNo: { backgroundColor: '#dc2626' },
  chipText: { fontSize: 14, fontWeight: '600' },

  // Folder tabs. The row's two fills plus each unselected tab's bottom border
  // draw one continuous line across the panel's top; the selected tab simply
  // omits its own, leaving the mouth of the folder. Nothing overlaps, so there
  // are no negative margins or z-index games to get wrong.
  tabsRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 },
  tabFill: { borderBottomWidth: 1 },
  tabFillLead: { width: 14 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tabActive: { paddingTop: 8, paddingBottom: 11, borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 3, borderTopColor: TAB_ACCENT },
  tabIdle: { paddingTop: 6, paddingBottom: 8, borderBottomWidth: 1 },
  tabMuted: { opacity: 0.65 },
  tabText: { fontSize: 14, fontWeight: '700' },
  // flexGrow, not flex: with a short token list the panel takes the leftover
  // height down to the bottom of the screen instead of hugging its content;
  // with a long one it keeps its natural height and the page scrolls.
  panel: {
    padding: 14,
    flexGrow: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },

  testBadge: { backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  testBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  iotTitleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8, marginBottom: 4 },
  iotTitle: { fontSize: 15, fontWeight: '700' },
  iotDesc: { fontSize: 13, lineHeight: 19 },
});

export default DepinChatTokenSections;
