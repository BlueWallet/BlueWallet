/**
 * One transaction: what it did to the wallet (direction, amount, status), and
 * a few details from the node (date, fee for a send, block, the other side's
 * addresses), the user's note, its ID and the explorer. The wallet's own
 * history is shown at once; the node's details fill in when they arrive, and
 * their absence (offline) leaves the rest usable.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { absSats, satsToXna, xnaToSats } from '../../blue_modules/neurai/amounts';
import { formatAssetAmount } from '../../blue_modules/neurai/assetUtils';
import { usePrivacyTxKind } from '../../blue_modules/neurai/privacy/txTags';
import {
  counterparties,
  isSelfTransfer,
  parseVerboseTransaction,
  type Counterparty,
  type TxDetails,
} from '../../blue_modules/neurai/transactionDetails';
import type { Transaction } from '../../class/wallets/types';
import presentAlert, { AlertType } from '../../components/Alert';
import Icon, { type MaterialIconName } from '../../components/Icon';
import NeuraiLoader from '../../components/NeuraiLoader';
import {
  SettingsBadge,
  SettingsButton,
  SettingsCard,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsStatusLine,
  useSettingsPalette,
  type SettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { getBlockExplorerUrlForWallet } from '../../models/blockExplorer';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

type RouteProps = RouteProp<DetailViewStackParamList, 'TransactionStatus'>;

/** Addresses shown per side; the rest are counted. */
const MAX_ADDRESSES = 3;
/** Characters shown strong at each end of an address: what people check at a glance. */
const ADDRESS_ENDS = 6;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Direction = 'sent' | 'received' | 'pending';

const DIRECTION: Record<Direction, { icon: MaterialIconName; colors: (p: SettingsPalette) => { bg: string; fg: string } }> = {
  sent: { icon: 'call-made', colors: p => ({ bg: p.fail.bg, fg: p.fail.dot }) },
  received: { icon: 'call-received', colors: p => ({ bg: p.ok.bg, fg: p.ok.dot }) },
  pending: { icon: 'schedule', colors: p => ({ bg: p.warnIconBg, fg: p.accent }) },
};

const TransactionStatus: React.FC = () => {
  const { params } = useRoute<RouteProps>();
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { wallets, txMetadata, saveToDisk } = useStorage();
  const { selectedBlockExplorer, selectedTestnetBlockExplorer } = useSettings();
  const privacyKind = usePrivacyTxKind(params.walletID ?? '', params.hash ?? '');

  const wallet = useMemo(
    () => (params.walletID ? wallets.find(w => w.getID() === params.walletID) : undefined),
    [params.walletID, wallets],
  );
  const [tx, setTx] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState<TxDetails | null>(null);
  const [detailsState, setDetailsState] = useState<'loading' | 'ok' | 'unavailable'>('loading');
  const [memo, setMemo] = useState('');
  const savedMemo = useRef('');

  useFocusEffect(
    useCallback(() => {
      const candidate =
        (wallet ? wallet.getTransactions() : wallets.flatMap(w => w.getTransactions())).find(
          (t: Transaction) => t.hash === params.hash || t.txid === params.hash,
        ) ?? null;
      setTx(candidate);
      setIsLoading(false);
    }, [params.hash, wallet, wallets]),
  );

  useEffect(() => {
    if (!params.hash) return;
    savedMemo.current = txMetadata[params.hash]?.memo ?? '';
    setMemo(savedMemo.current);
  }, [params.hash, txMetadata]);

  // The node's view of it: fee, block, addresses. Optional: the screen works without.
  const hash = tx?.hash;
  useEffect(() => {
    if (!wallet || !hash) return;
    let live = true;
    setDetailsState('loading');
    wallet
      .getBackend()
      .rpc<unknown>('getrawtransaction', [hash, true])
      .then(raw => {
        if (!live) return;
        const parsed = parseVerboseTransaction(raw);
        setDetails(parsed);
        setDetailsState(parsed ? 'ok' : 'unavailable');
      })
      .catch(error => {
        console.debug('[TransactionStatus] details unavailable:', error?.message);
        if (live) setDetailsState('unavailable');
      });
    return () => {
      live = false;
    };
  }, [wallet, hash]);

  const saveMemo = useCallback(
    (text: string) => {
      if (!hash || text === savedMemo.current) return;
      txMetadata[hash] = { memo: text };
      savedMemo.current = text;
      saveToDisk().catch(() => {}); // the provider reports a failed save
    },
    [hash, txMetadata, saveToDisk],
  );
  // Leaving with the note still being typed saves it too.
  const latestMemo = useRef(memo);
  latestMemo.current = memo;
  useEffect(() => () => saveMemo(latestMemo.current), [saveMemo]);

  const explorerUrl = useMemo(
    () => getBlockExplorerUrlForWallet(wallet as never, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url),
    [wallet, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url],
  );

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: p.ground }]}>
        <NeuraiLoader />
      </View>
    );
  }

  const header = <SettingsScreenHeader title={loc.transactions.details_title} onBack={() => navigation.goBack()} />;

  if (!tx) {
    return (
      <View style={[styles.root, { backgroundColor: p.ground }]}>
        {header}
        <View style={styles.content}>
          <SettingsCard style={styles.missing}>
            <Text style={[styles.missingText, { color: p.mutedOnCard }]}>{loc.transactions.details_not_found}</Text>
            <Text style={[styles.hash, { color: p.ink }]} selectable>
              {params.hash}
            </Text>
          </SettingsCard>
        </View>
      </View>
    );
  }

  const confirmations = details?.confirmations ?? tx.confirmations;
  const isAsset = !!tx.assetName;
  const assetSats = xnaToSats(tx.assetAmount ?? '0');
  const sent = isAsset ? assetSats < 0n : (tx.value ?? 0n) < 0n;
  const direction: Direction = confirmations > 0 ? (sent ? 'sent' : 'received') : 'pending';
  const look = DIRECTION[direction];
  const lookColors = look.colors(p);
  const ownAddresses = new Set(wallet?.getAllExternalAddresses() ?? []);
  const isOwn = (address: string) => ownAddresses.has(address);
  // HD wallets know which of their addresses are change.
  const changeAddresses = new Set((wallet?.getAddressEntries?.() ?? []).filter(entry => entry.change).map(entry => entry.address));
  const toSelf = sent && !!details && isSelfTransfer(details, isOwn);
  const title = privacyKind
    ? { deposit: loc.privacy.tx_deposit, withdraw: loc.privacy.tx_withdraw, other: loc.privacy.tx_other }[privacyKind]
    : direction === 'pending'
      ? loc.transactions.pending
      : toSelf
        ? loc.transactions.self_transfer
        : sent
          ? loc.transactions.list_title_sent
          : loc.transactions.list_title_received;
  const amount = isAsset
    ? `${sent ? '−' : '+'}${formatAssetAmount(satsToXna(absSats(assetSats)))} ${tx.assetName}`
    : `${sent ? '−' : '+'}${satsToXna(absSats(tx.value ?? 0n))} XNA`;
  const status =
    confirmations > 0
      ? String(
          confirmations === 1
            ? loc.transactions.status_confirmed_one
            : loc.formatString(loc.transactions.status_confirmed, { count: confirmations.toLocaleString() }),
        )
      : loc.transactions.status_pending;
  const time = details?.time ?? tx.timestamp;

  const others = details ? counterparties(details, sent, isOwn) : [];

  /** A tap copies the whole value and says so briefly: no buttons, so the value gets the full width. */
  const copy = (value: string, notice: string) => {
    Clipboard.setString(value);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    presentAlert({ message: notice, type: AlertType.Toast });
  };

  /** The whole address, wrapping freely, its two ends strong and the middle soft. */
  const addressText = (address: string) => {
    const split = address.length > ADDRESS_ENDS * 2 + 2;
    return (
      <Text style={[styles.address, { color: p.mutedOnCard }]}>
        {split ? (
          <>
            <Text style={[styles.addressEnd, { color: p.ink }]}>{address.slice(0, ADDRESS_ENDS)}</Text>
            {address.slice(ADDRESS_ENDS, -ADDRESS_ENDS)}
            <Text style={[styles.addressEnd, { color: p.ink }]}>{address.slice(-ADDRESS_ENDS)}</Text>
          </>
        ) : (
          address
        )}
      </Text>
    );
  };

  const partyAmount = (party: Counterparty): string | null => {
    if (!sent) return null;
    if (party.asset?.amount) return `${formatAssetAmount(party.asset.amount)} ${party.asset.name}`;
    return party.valueSats !== null ? `${satsToXna(party.valueSats)} XNA` : null;
  };

  const openExplorer = () => {
    Linking.openURL(`${explorerUrl}/tx/${tx.hash}`).catch(error => console.warn('Failed to open explorer:', error?.message));
  };

  const row = (label: string, value: React.ReactNode, testID?: string) => (
    <View style={[styles.row, { borderTopColor: p.divider }]} testID={testID}>
      <Text style={[styles.rowLabel, { color: p.mutedOnCard }]}>{label}</Text>
      <View style={styles.rowValueBox}>
        {typeof value === 'string' ? <Text style={[styles.rowValue, { color: p.ink }]}>{value}</Text> : value}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="TransactionStatus">
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <SettingsCard style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: lookColors.bg }]}>
            <Icon name={look.icon} type="material" size={30} color={lookColors.fg} />
          </View>
          <Text style={[styles.heroTitle, { color: p.mutedOnCard }]}>{title}</Text>
          <Text
            style={[styles.amount, { color: direction === 'received' ? p.ok.dot : p.ink }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            testID="TransactionAmount"
          >
            {amount}
          </Text>
          <SettingsStatusLine tone={confirmations > 0 ? 'ok' : 'idle'} busy={confirmations === 0} text={status} testID="TransactionState" />
        </SettingsCard>

        <View>
          <SettingsSectionLabel>{loc.transactions.details_section}</SettingsSectionLabel>
          <SettingsCard>
            <View style={styles.firstRow}>
              <Text style={[styles.rowLabel, { color: p.mutedOnCard }]}>{loc.transactions.date}</Text>
              <Text style={[styles.rowValue, { color: p.ink }]}>{dayjs(time * 1000).format('LLL')}</Text>
            </View>
            {sent && details?.feeSats !== null && details?.feeSats !== undefined
              ? row(loc.transactions.details_fee, `${satsToXna(details.feeSats)} XNA`, 'TransactionFee')
              : null}
            {details?.blockHeight ? row(loc.transactions.details_block, details.blockHeight.toLocaleString(), 'TransactionBlock') : null}
            {others.length > 0 ? (
              <View style={[styles.parties, { borderTopColor: p.divider }]} testID="TransactionCounterparties">
                <Text style={[styles.rowLabel, { color: p.mutedOnCard }]}>
                  {sent ? loc.transactions.details_paid_to : loc.transactions.details_paid_from}
                  {others.length > 1 ? ` · ${loc.formatString(loc.transactions.details_addresses, { count: others.length })}` : ''}
                </Text>
                {others.slice(0, MAX_ADDRESSES).map(party => {
                  const value = partyAmount(party);
                  return (
                    <Pressable
                      key={party.address}
                      onPress={() => copy(party.address, loc.home.copied)}
                      accessibilityRole="button"
                      accessibilityLabel={[value, party.own ? loc.transactions.details_own : null, party.address]
                        .filter(Boolean)
                        .join(', ')}
                      accessibilityHint={loc.transactions.details_copy}
                      testID="TransactionCounterparty"
                      style={({ pressed }) => [styles.party, { backgroundColor: p.ground }, pressed && styles.pressed]}
                    >
                      {value || party.own ? (
                        <View style={styles.partyHead}>
                          {value ? <Text style={[styles.partyAmount, { color: p.ink }]}>{value}</Text> : null}
                          {party.own ? (
                            <SettingsBadge
                              label={changeAddresses.has(party.address) ? loc.transactions.details_change : loc.transactions.details_own}
                              tone="ok"
                            />
                          ) : null}
                        </View>
                      ) : null}
                      {addressText(party.address)}
                    </Pressable>
                  );
                })}
                {others.length > MAX_ADDRESSES ? (
                  <Text style={[styles.more, { color: p.mutedOnCard }]}>
                    {loc.formatString(loc.transactions.details_more, { count: others.length - MAX_ADDRESSES })}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {detailsState === 'loading' ? (
              <View style={[styles.row, { borderTopColor: p.divider }]}>
                <SettingsStatusLine tone="idle" busy compact text={loc.transactions.details_loading} />
              </View>
            ) : null}
            {detailsState === 'unavailable' ? (
              <View style={[styles.row, { borderTopColor: p.divider }]}>
                <Text style={[styles.more, { color: p.mutedOnCard }]}>{loc.transactions.details_unavailable}</Text>
              </View>
            ) : null}
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.transactions.details_note}</SettingsSectionLabel>
          <SettingsCard style={styles.noteCard}>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              onBlur={() => saveMemo(memo)}
              placeholder={loc.send.details_note_placeholder}
              placeholderTextColor={p.mutedOnCard}
              style={[styles.note, { backgroundColor: p.ground, color: p.ink }]}
              multiline
              testID="TransactionDetailsMemoInput"
            />
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.transactions.txid}</SettingsSectionLabel>
          <SettingsCard style={styles.idCard}>
            <Pressable
              onPress={() => copy(tx.hash, loc.transactions.txid_copied)}
              accessibilityRole="button"
              accessibilityLabel={`${loc.transactions.txid}, ${tx.hash}`}
              accessibilityHint={loc.transactions.details_copy_txid}
              testID="TransactionCopyID"
              style={({ pressed }) => [styles.idBox, { backgroundColor: p.ground }, pressed && styles.pressed]}
            >
              <Text style={[styles.hash, { color: p.ink }]} testID="TransactionID">
                {tx.hash}
              </Text>
            </Pressable>
            {explorerUrl ? (
              <SettingsButton
                title={loc.transactions.details_view_in_browser}
                icon="open-in-new"
                variant="secondary"
                onPress={openExplorer}
                testID="TransactionOpenExplorer"
              />
            ) : null}
          </SettingsCard>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 18 },
  hero: { alignItems: 'center', paddingVertical: 22, rowGap: 8 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 15, fontWeight: '600' },
  amount: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6, maxWidth: '100%' },
  firstRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: 16, paddingVertical: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    columnGap: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  rowLabel: { fontSize: 14 },
  rowValueBox: { flexShrink: 1, alignItems: 'flex-end' },
  rowValue: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  parties: { rowGap: 10, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  party: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  partyHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4, marginBottom: 4 },
  partyAmount: { fontSize: 15, fontWeight: '700' },
  address: { fontSize: 14, lineHeight: 20, fontFamily: MONO },
  addressEnd: { fontWeight: '700' },
  more: { fontSize: 13 },
  noteCard: { paddingVertical: 14 },
  note: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top' },
  idCard: { paddingVertical: 14, rowGap: 14 },
  idBox: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  hash: { fontSize: 13, lineHeight: 19, fontFamily: MONO },
  missing: { paddingVertical: 16, rowGap: 10 },
  missingText: { fontSize: 14 },
  pressed: { opacity: 0.6 },
});

export default TransactionStatus;
