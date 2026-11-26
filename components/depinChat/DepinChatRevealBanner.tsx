/**
 * The step left before the chat can receive: publishing the DePIN address's
 * public key with a small burn. Says what is missing (funds, funds on their
 * way, the reveal itself) and offers the one action that moves it forward.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import loc from '../../loc';
import Icon from '../Icon';
import { SettingsButton, useSettingsPalette } from '../settings/SettingsUI';
import { FUND_AMOUNT_XNA, REVEAL_AMOUNT_XNA } from './constants';

interface DepinChatRevealBannerProps {
  depinBalance: number | null;
  /** XNA sent to the DePIN address that is still in the mempool. */
  depinIncoming: number;
  onFund: () => void;
  onReveal: () => void;
  pubkeyRevealed: boolean | null;
  revealPending: boolean;
  revealing: boolean;
  /** Inside the conversation: tighter, under the header. */
  compact?: boolean;
}

const DepinChatRevealBanner = ({
  depinBalance,
  depinIncoming,
  onFund,
  onReveal,
  pubkeyRevealed,
  revealPending,
  revealing,
  compact,
}: DepinChatRevealBannerProps) => {
  const p = useSettingsPalette();
  if (pubkeyRevealed !== false) return null;

  const needsFunding = depinBalance !== null && depinBalance < REVEAL_AMOUNT_XNA;
  // Enough is on its way: the reveal can only spend it once it is confirmed.
  const fundsArriving = needsFunding && depinBalance + depinIncoming >= REVEAL_AMOUNT_XNA;
  const description = fundsArriving
    ? loc.formatString(loc.depin.reveal_funds_arriving, { amount: Number(depinIncoming.toFixed(8)), ticker: 'XNA' })
    : loc.formatString(needsFunding ? loc.depin.reveal_need_funds : loc.depin.reveal_desc, {
        amount: needsFunding ? FUND_AMOUNT_XNA : REVEAL_AMOUNT_XNA,
        ticker: 'XNA',
      });

  return (
    <View
      style={[styles.banner, compact && styles.compact, { backgroundColor: p.warnBg, borderColor: p.warnBorder }]}
      accessibilityLiveRegion="polite"
      testID="DepinRevealBanner"
    >
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: p.warnIconBg }]}>
          <Icon name="key" type="material" size={20} color={p.accentText} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
            {loc.depin.reveal_title}
          </Text>
          <Text style={[styles.desc, { color: p.muted }]}>{description}</Text>
        </View>
      </View>
      {fundsArriving ? (
        <SettingsButton title={loc.depin.reveal_confirming} onPress={() => {}} disabled icon="schedule" testID="DepinFundsArriving" />
      ) : needsFunding ? (
        <SettingsButton
          title={loc.formatString(loc.depin.reveal_send_button, { amount: FUND_AMOUNT_XNA, ticker: 'XNA' }) as string}
          onPress={onFund}
          icon="arrow-upward"
          testID="DepinFundAddress"
        />
      ) : (
        <SettingsButton
          title={
            revealPending
              ? loc.depin.reveal_waiting
              : (loc.formatString(loc.depin.reveal_button, { amount: REVEAL_AMOUNT_XNA, ticker: 'XNA' }) as string)
          }
          onPress={onReveal}
          disabled={revealPending}
          loading={revealing}
          icon={revealPending ? 'schedule' : 'local-fire-department'}
          testID="DepinRevealPubkey"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { borderRadius: 24, borderWidth: 1, padding: 16, rowGap: 14 },
  compact: { marginHorizontal: 16, marginBottom: 8, padding: 14, rowGap: 12, borderRadius: 20 },
  head: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, rowGap: 4 },
  title: { fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 19 },
});

export default DepinChatRevealBanner;
