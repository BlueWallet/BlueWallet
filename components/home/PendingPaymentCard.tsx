/**
 * H17 · A two-step silent payment that did not finish: the transactions the
 * user approved are saved in the wallet, and this card finishes them (or lets
 * the user drop the notice). It looks at the bridge address first, so it
 * never sends again what the network already has and never offers to drop a
 * payment without saying where the coins are.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  chainedSendAmount,
  ChainedSendClosedError,
  finishChainedSend,
  type ChainedSend,
  type ChainedSendState,
  type ChainedSendWallet,
} from '../../blue_modules/neurai/chainedSends';
import loc from '../../loc';
import presentAlert from '../Alert';
import Icon from '../Icon';
import { useHomePalette } from './homeTheme';
import { appAlert } from '../AppDialog';

/** What the card needs from a wallet (every Neurai wallet has it). */
type PendingPaymentWallet = ChainedSendWallet & {
  getChainedSends(): readonly ChainedSend[];
  reconcileChainedSends(): Promise<boolean>;
  chainedSendStates(): Promise<Map<string, ChainedSendState>>;
  fetchTransactions(): Promise<unknown>;
  fetchBalance(): Promise<unknown>;
};

interface PendingPaymentCardProps {
  wallet: PendingPaymentWallet;
  saveToDisk: () => Promise<void>;
  /** Changes on every refresh of the home: the payments are looked up again. */
  refreshKey?: unknown;
}

/** A payment code is long: its start and end are enough to recognise it. */
const shortCode = (code: string) => (code.length > 24 ? `${code.slice(0, 12)}…${code.slice(-8)}` : code);

const PendingPaymentCard: React.FC<PendingPaymentCardProps> = ({ wallet, saveToDisk, refreshKey }) => {
  const p = useHomePalette();
  const [busy, setBusy] = useState<string | null>(null);
  const sends = wallet.getChainedSends();

  // Payments the network shows complete are forgotten (and the wallet saved).
  useEffect(() => {
    if (wallet.getChainedSends().length === 0) return;
    wallet
      .reconcileChainedSends()
      .then(changed => (changed ? saveToDisk() : undefined))
      .catch(error => console.debug('[PendingPayment] reconcile failed', error?.message));
  }, [wallet, saveToDisk, refreshKey]);

  /** What the network has seen of `send`; unknown (null) when the service cannot be asked. */
  const stateOf = useCallback(
    async (send: ChainedSend): Promise<ChainedSendState | null> => {
      try {
        return (await wallet.chainedSendStates()).get(send.firstTxid) ?? null;
      } catch {
        return null;
      }
    },
    [wallet],
  );

  const finish = useCallback(
    async (send: ChainedSend) => {
      setBusy(send.firstTxid);
      try {
        const state = await stateOf(send);
        if (state === 'done') {
          wallet.forgetChainedSend(send.firstTxid);
          await saveToDisk().catch(() => {});
        } else {
          // Unknown or nothing seen: send the first again too (a node that has it answers "already known").
          await finishChainedSend(wallet, send, saveToDisk, state !== 'first-seen');
        }
        presentAlert({ tone: 'success', message: loc.home.pending_payment_done });
        Promise.all([wallet.fetchTransactions(), wallet.fetchBalance()]).catch(() => {});
      } catch (error: any) {
        if (error instanceof ChainedSendClosedError && error.leg === 'second') {
          presentAlert({ message: loc.formatString(loc.send.silent_payment_closed, { reason: error.message, bridge: send.bridge }) });
        } else {
          presentAlert({ message: error?.message ?? String(error) });
        }
      } finally {
        setBusy(null);
      }
    },
    [wallet, saveToDisk, stateOf],
  );

  const discard = useCallback(
    async (send: ChainedSend) => {
      setBusy(send.firstTxid);
      const state = await stateOf(send);
      setBusy(null);
      // Unless the network shows nothing was sent, say where the coins may be.
      const message =
        state === 'not-seen'
          ? loc.home.pending_payment_discard_unsent
          : loc.formatString(loc.home.pending_payment_discard_sent, { bridge: send.bridge });
      appAlert(loc.home.pending_payment_title, message, [
        { text: loc._.cancel, style: 'cancel' },
        {
          text: loc.home.pending_payment_discard,
          style: 'destructive',
          onPress: () => {
            wallet.forgetChainedSend(send.firstTxid);
            saveToDisk().catch(() => {});
          },
        },
      ]);
    },
    [wallet, saveToDisk, stateOf],
  );

  if (sends.length === 0) return null;

  return (
    <View style={styles.list}>
      {sends.map(send => (
        <View key={send.firstTxid} style={[styles.card, { backgroundColor: p.card }]} testID="PendingPaymentCard">
          <View style={styles.head}>
            <View style={[styles.iconCircle, { backgroundColor: p.accentSoft }]}>
              <Icon name="schedule-send" type="material" size={20} color={p.accentText} />
            </View>
            <Text style={[styles.title, { color: p.ink }]}>{loc.home.pending_payment_title}</Text>
          </View>
          <Text style={[styles.text, { color: p.mutedOnCard }]}>
            {loc.formatString(loc.home.pending_payment_text, { amount: chainedSendAmount(send), to: shortCode(send.to) })}
          </Text>
          {busy === send.firstTxid ? (
            <ActivityIndicator color={p.accent} />
          ) : (
            <View style={styles.buttons}>
              <Pressable
                onPress={() => finish(send)}
                disabled={busy !== null}
                accessibilityRole="button"
                testID="PendingPaymentFinish"
                style={({ pressed }) => [styles.button, { backgroundColor: p.accent }, pressed && styles.pressed]}
              >
                <Text style={[styles.buttonText, { color: p.onAccent }]}>{loc.home.pending_payment_complete}</Text>
              </Pressable>
              <Pressable
                onPress={() => discard(send)}
                disabled={busy !== null}
                accessibilityRole="button"
                testID="PendingPaymentDiscard"
                style={({ pressed }) => [styles.button, { backgroundColor: p.ground }, pressed && styles.pressed]}
              >
                <Text style={[styles.buttonText, { color: p.ink }]}>{loc.home.pending_payment_discard}</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 22, rowGap: 12 },
  card: { borderRadius: 24, padding: 16, rowGap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  text: { fontSize: 14, lineHeight: 20 },
  buttons: { flexDirection: 'row', columnGap: 10 },
  button: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});

export default PendingPaymentCard;
