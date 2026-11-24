/**
 * One address of a wallet: what it is (index, receive or change, used or
 * not), its QR over the address, ready to be scanned, and what can be done
 * with it: copy it, ask for an amount (typed right under the QR, which
 * follows it), show the wallet's silent payment code instead (ECDSA wallets),
 * look it up in the explorer, share it and copy its private key. Then the
 * transactions that touched it, by day like the history.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BigNumber from 'bignumber.js';
import { Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';

import { XNAToLocalCurrency } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isTestnetChain } from '../../blue_modules/neurai/networkConfig';
import { SILENT_PAYMENT_ACCENT, silentPaymentTint } from '../../blue_modules/neurai/silentPayments';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import { useAddressMenu } from '../../components/addresses/useAddressMenu';
import HomeActions, { HomeAction } from '../../components/home/HomeActions';
import { TransactionDayCard, transactionDayKey, useTransactionDays } from '../../components/home/TransactionDayList';
import Icon from '../../components/Icon';
import QRCode from '../../components/QRCode';
import QrStaggerReveal from '../../components/QrStaggerReveal';
import {
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { getBlockExplorerUrl, getBlockExplorerUrlForWallet, getTestnetBlockExplorerUrl } from '../../models/blockExplorer';
import { XnaUnit } from '../../models/xnaUnits';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const PAGE = 20;
const MAX_QR_SIZE = 260;
/** Room around the QR across the screen: the screen's, the card's, the panel's and the white tile's padding. */
const QR_SIDE_ROOM = 16 + 16 + 14 + 8;
/** Purple frame of the silent payment code, inside the same tile so nothing moves. */
const SILENT_FRAME_WIDTH = 4;
const AMOUNT_DECIMALS = 8;

/** What was typed, as an amount: digits and one point (a comma is one too), at most 8 decimals. */
const cleanAmount = (text: string): string => {
  const [whole, ...rest] = text
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')
    .split('.');
  return rest.length > 0 ? `${whole}.${rest.join('').slice(0, AMOUNT_DECIMALS)}` : whole;
};

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'AddressDetails'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'AddressDetails'>;

const AddressDetails: React.FC = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { walletID, address, index, change } = useRoute<RouteProps>().params;
  const { wallets } = useStorage();
  const wallet = wallets.find(w => w.getID() === walletID);
  const neurai = wallet && isNeuraiWallet(wallet) ? wallet : undefined;
  const allowSignVerifyMessage = (wallet && 'allowSignVerifyMessage' in wallet && wallet.allowSignVerifyMessage()) ?? false;
  const { exportPrivateKey, canExportPrivateKey } = useAddressMenu({ walletID, address, allowSignVerifyMessage });

  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect, isPrivacyBlurEnabled]),
  );

  const [explorerUrl, setExplorerUrl] = useState('');
  useEffect(() => {
    Promise.all([getBlockExplorerUrl(), getTestnetBlockExplorerUrl()])
      .then(([mainnet, testnet]) => setExplorerUrl(getBlockExplorerUrlForWallet(wallet, mainnet, testnet)))
      .catch(() => {});
  }, [wallet]);

  // The amount asked for: typed under the QR, which carries it.
  const [amount, setAmount] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const amountInput = useRef<TextInput>(null);
  const amountValue = useMemo(() => {
    const value = new BigNumber(amount);
    return value.isFinite() && value.gt(0) ? value.toFixed() : '';
  }, [amount]);
  const testnet = !!neurai && isTestnetChain(neurai.network);
  const fiat = amountValue && !testnet ? XNAToLocalCurrency(amountValue) : '';

  // NIP-047: like the node, only strict ECDSA wallets have a silent payment code. It is the wallet's, not the address's.
  const silentWallet = wallet instanceof NeuraiECDSAWallet ? wallet : undefined;
  const [silentCode, setSilentCode] = useState('');
  const [showSilent, setShowSilent] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const silentShown = showSilent && silentCode.length > 0;

  const uri = useMemo(
    () => DeeplinkSchemaMatch.bip21encode(address, amountValue ? { amount: amountValue } : undefined, 'xna'),
    [address, amountValue],
  );
  const qrValue = silentShown ? DeeplinkSchemaMatch.bip21encode(silentCode, undefined, 'xna') : uri;
  const shownText = silentShown ? silentCode : address;
  const qrSize = Math.max(160, Math.min(width - QR_SIDE_ROOM * 2, MAX_QR_SIZE));

  // `wallets` changes identity after every fetch or push, so these follow them.
  const known = !!neurai?.addressActivityKnown();
  const txids = neurai?.getAddressTxids(address);
  const used = !!txids && txids.length > 0;
  const transactions = useMemo(() => {
    const own = new Set(txids ?? []);
    return (wallet?.getTransactions() ?? []).filter(tx => own.has(tx.txid)).sort((a, b) => b.timestamp - a.timestamp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, wallets, txids?.join()]);
  const [shown, setShown] = useState(PAGE);
  const days = useTransactionDays(transactions, shown);
  const unit = wallet?.getPreferredBalanceUnit() ?? XnaUnit.XNA;

  const copy = useCallback(() => {
    Clipboard.setString(shownText);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    presentAlert({ message: loc.home.copied, type: AlertType.Toast });
  }, [shownText]);

  // What a sender needs: the silent payment code, the address with the amount asked for, or the address.
  const share = useCallback(() => {
    Share.open({ message: silentShown ? silentCode : amountValue ? uri : address }).catch(error => console.debug('Share:', error));
  }, [silentShown, silentCode, amountValue, uri, address]);

  const editAmount = useCallback(() => {
    if (editingAmount) {
      amountInput.current?.blur();
      Keyboard.dismiss();
    } else if (amountInput.current) {
      amountInput.current.focus();
    } else {
      // The field shows up and takes the focus.
      setEditingAmount(true);
    }
  }, [editingAmount]);

  const clearAmount = useCallback(() => {
    setAmount('');
    amountInput.current?.blur();
    Keyboard.dismiss();
    setEditingAmount(false);
  }, []);

  const toggleSilent = useCallback(() => {
    if (showSilent || !silentWallet) {
      setShowSilent(false);
      return;
    }
    Keyboard.dismiss();
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
    if (silentCode) {
      setShowSilent(true);
      return;
    }
    setSilentLoading(true);
    // The first derivation holds the JS thread for a moment: let the button show its spinner first.
    setTimeout(() => {
      try {
        setSilentCode(silentWallet.getSilentPaymentCode());
        setShowSilent(true);
      } catch (error) {
        presentAlert({ title: loc.errors.error, message: (error as Error).message });
      } finally {
        setSilentLoading(false);
      }
    }, 0);
  }, [showSilent, silentWallet, silentCode]);

  const actions = useMemo<HomeAction[]>(() => {
    const list: HomeAction[] = [{ key: 'copy', label: loc.home.copy, icon: 'content-copy', testID: 'AddressCopy', onPress: copy }];
    if (!silentShown) {
      const active = editingAmount || !!amountValue;
      list.push({
        key: 'amount',
        label: loc.receive.action_amount,
        icon: 'request-quote',
        testID: 'AddressAmount',
        onPress: editAmount,
        fill: active ? p.accent : undefined,
        tint: active ? p.onAccent : undefined,
      });
    }
    if (silentWallet) {
      list.push({
        key: 'silent',
        label: silentShown ? loc.receive.show_address : loc.receive.silent_payments,
        icon: silentShown ? 'qr-code-2' : 'visibility-off',
        testID: 'AddressSilentPayments',
        onPress: toggleSilent,
        fill: silentShown ? SILENT_PAYMENT_ACCENT : undefined,
        tint: silentShown ? '#FFFFFF' : silentPaymentTint(p.dark),
        loading: silentLoading,
      });
    }
    if (explorerUrl) {
      list.push({
        key: 'explorer',
        label: loc.addresses.explorer,
        icon: 'travel-explore',
        testID: 'AddressExplorer',
        onPress: () => Linking.openURL(`${explorerUrl}/address/${encodeURIComponent(address)}`),
      });
    }
    list.push({ key: 'share', label: loc.receive.action_share, icon: 'share', testID: 'AddressShare', onPress: share });
    return list;
  }, [
    copy,
    share,
    editAmount,
    toggleSilent,
    silentShown,
    silentWallet,
    silentLoading,
    editingAmount,
    amountValue,
    explorerUrl,
    address,
    p,
  ]);

  const branch = change ? loc.addresses.type_change : loc.addresses.type_receive;
  const status = !known && !used ? undefined : used ? loc.addresses.used : loc.addresses.unused;
  const showAmount = !silentShown && (editingAmount || amount.length > 0);
  const tileQrSize = silentShown ? qrSize - SILENT_FRAME_WIDTH * 2 : qrSize;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="AddressDetails">
      <SettingsScreenHeader title={loc.addresses.address} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <SettingsCard style={styles.hero}>
          <View style={styles.heroHead}>
            <View style={[styles.badge, { backgroundColor: p.accentSoft }]}>
              <Text style={[styles.badgeText, { color: p.accentText }]} numberOfLines={1} adjustsFontSizeToFit>
                {index}
              </Text>
            </View>
            <View style={styles.texts}>
              <Text style={[styles.heroTitle, { color: p.ink }]}>{branch}</Text>
              {status && (
                <View style={styles.statusRow} testID="AddressStatus">
                  <View style={[styles.dot, { backgroundColor: used ? p.mutedOnCard : p.ok.dot }]} />
                  <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{status}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: p.ground }]}>
            {silentShown && (
              <View style={styles.silentBadge} testID="AddressSilentBadge">
                <Text style={styles.silentBadgeText}>{loc.receive.silent_payments}</Text>
              </View>
            )}
            <View style={[styles.qrTile, silentShown && styles.qrTileSilent]} testID="AddressQr">
              <QrStaggerReveal size={tileQrSize} maskColor="#FFFFFF" runKey={silentShown ? `silent|${silentCode}` : address}>
                <QRCode value={qrValue} size={tileQrSize} />
              </QrStaggerReveal>
            </View>

            {showAmount && (
              <View style={styles.amountBlock}>
                <View style={[styles.amountField, { backgroundColor: p.card, borderColor: editingAmount ? p.accent : p.card }]}>
                  <TextInput
                    ref={amountInput}
                    value={amount}
                    onChangeText={text => setAmount(cleanAmount(text))}
                    onFocus={() => setEditingAmount(true)}
                    onBlur={() => setEditingAmount(false)}
                    autoFocus
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    placeholder="0"
                    placeholderTextColor={p.mutedOnCard}
                    selectionColor={p.accent}
                    accessibilityLabel={loc.receive.action_amount}
                    style={[styles.amountInput, { color: p.ink }]}
                    testID="AddressAmountInput"
                  />
                  <Text style={[styles.amountUnit, { color: p.mutedOnCard }]}>XNA</Text>
                  <Pressable
                    onPress={clearAmount}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={loc.receive.reset}
                    testID="AddressAmountClear"
                    style={({ pressed }) => [styles.amountClear, { backgroundColor: p.ground }, pressed && styles.pressed]}
                  >
                    <Icon name="close" type="material" size={16} color={p.mutedOnCard} />
                  </Pressable>
                </View>
                {!!fiat && fiat !== '...' && <Text style={[styles.fiat, { color: p.mutedOnCard }]}>≈ {fiat}</Text>}
              </View>
            )}

            <Pressable
              onPress={copy}
              accessibilityRole="button"
              accessibilityLabel={`${loc.transactions.details_copy}, ${shownText}`}
              style={({ pressed }) => [styles.addressBox, pressed && styles.pressed]}
            >
              <Text style={[styles.address, { color: p.ink }]} selectable testID="AddressText">
                {shownText}
              </Text>
            </Pressable>
          </View>
        </SettingsCard>

        <HomeActions actions={actions} />

        {canExportPrivateKey && (
          <SettingsCard>
            <SettingsRow icon="key" title={loc.addresses.copy_private_key} onPress={exportPrivateKey} testID="AddressPrivateKey" />
          </SettingsCard>
        )}

        <View>
          <SettingsSectionLabel>{loc.addresses.transactions}</SettingsSectionLabel>
          {days.length > 0 ? (
            <View style={styles.days}>
              {days.map(day => (
                <TransactionDayCard key={transactionDayKey(day)} day={day} unit={unit} walletID={walletID} />
              ))}
              {transactions.length > shown && (
                <Pressable
                  onPress={() => setShown(n => n + PAGE)}
                  accessibilityRole="button"
                  testID="AddressTransactionsMore"
                  style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                >
                  <Text style={[styles.moreText, { color: p.accentText }]}>
                    {String(loc.formatString(loc.addresses.show_more, { count: Math.min(PAGE, transactions.length - shown) }))}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <SettingsCard>
              <Text style={[styles.empty, { color: p.mutedOnCard }]} testID="AddressNoTransactions">
                {known ? loc.addresses.no_transactions : '…'}
              </Text>
            </SettingsCard>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default AddressDetails;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16, rowGap: 14 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 18, fontWeight: '700' },
  texts: { flex: 1, rowGap: 4 },
  heroTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  panel: { borderRadius: 20, padding: 14, paddingBottom: 6, alignItems: 'center', rowGap: 12 },
  qrTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  qrTileSilent: { borderWidth: SILENT_FRAME_WIDTH, borderColor: SILENT_PAYMENT_ACCENT, padding: 8 - SILENT_FRAME_WIDTH },
  silentBadge: { backgroundColor: SILENT_PAYMENT_ACCENT, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  silentBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  amountBlock: { alignSelf: 'stretch', alignItems: 'center', rowGap: 6 },
  amountField: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingLeft: 16,
    paddingRight: 10,
  },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 0 },
  amountUnit: { fontSize: 15, fontWeight: '600' },
  amountClear: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fiat: { fontSize: 13, fontWeight: '500' },
  addressBox: { alignSelf: 'stretch', borderRadius: 14, paddingHorizontal: 6, paddingVertical: 8 },
  address: { fontFamily: 'monospace', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  days: { rowGap: 4 },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
