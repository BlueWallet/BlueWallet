/**
 * Send screen for Neurai wallets, in the settings style: who gets it, what
 * (XNA or an asset), how much, which coins (optional), then a review of the
 * built transaction before it is sent.
 *
 * The engine in `@neuraiproject/neurai-jswallet` selects coins, builds and
 * signs the transaction. The wallet supplies a local rate of 0.012 XNA per
 * 1,000 vbytes (the default min-relay rate plus 20%); libraries calculate the
 * fee from the selected inputs and serialized outputs, without asking a node.
 *
 * "Max" spends the whole balance (or the ticked coins) with the fee deducted
 * (see `buildSendMaxTransaction` and the hardware wallet's `sendMax` path).
 * Silent payment coins (ECDSA wallets) are only spent when picked, apart from
 * the rest. A hardware wallet builds the transaction here and signs it on the
 * device.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { amountFromInput, satsToXna, xnaToSats } from '../../blue_modules/neurai/amounts';
import { formatAssetAmount, type NeuraiAssetType, type NeuraiHeldAsset } from '../../blue_modules/neurai/assetUtils';
import { looksLikeSilentPaymentCode, SILENT_PAYMENT_ACCENT, silentPaymentTint } from '../../blue_modules/neurai/silentPayments';
import {
  ChainedSendClosedError,
  ChainedSendNotSavedError,
  sendChainedPayment,
  type ChainedSend,
} from '../../blue_modules/neurai/chainedSends';
import { computeTxid } from '@neuraiproject/neurai-create-transaction';
import { useNeuraiHwDevice } from '../../blue_modules/neurai-hw/useNeuraiHwDevice';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { parseNeuraiPaymentUri, type NeuraiPaymentUri } from '../../class/neurai-uri-match';
import type { NeuraiBuildTransactionResult, NeuraiTransactionTarget, WalletCoin } from '../../class/wallets/abstract-neurai-wallet';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';
import { NeuraiHardwareWallet, type NeuraiHwUnsignedSend } from '../../class/wallets/neurai-hardware-wallet';
import presentAlert from '../../components/Alert';
import CoinControl, { coinKey, sumSats } from '../../components/CoinControl';
import { ConnectFooter } from '../../components/ConnectUI';
import Icon, { MaterialIconName } from '../../components/Icon';
import NeuraiLoader, { untilLoaderPainted } from '../../components/NeuraiLoader';
import {
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegment,
  SettingsSegmented,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { getBlockExplorerUrlForWallet } from '../../models/blockExplorer';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

/** Human label for an asset type, for the picker rows. */
function assetTypeLabel(type: NeuraiAssetType): string {
  switch (type) {
    case 'sub':
      return loc.assets.type_sub;
    case 'unique':
      return loc.assets.type_unique;
    case 'owner':
      return loc.assets.type_owner;
    case 'restricted':
      return loc.assets.type_restricted;
    case 'qualifier':
      return loc.assets.type_qualifier;
    case 'depin':
      return loc.assets.type_depin;
    default:
      return loc.assets.type_root;
  }
}

/** A send that reached the network: its ID to copy, and the way to see it in the explorer. */
const presentSent = (txid: string, explorerUrl: string) =>
  presentAlert({
    tone: 'success',
    title: loc.send.sent_title,
    message: loc.send.sent_text,
    detail: { label: loc.transactions.txid, value: txid },
    buttons: [
      { text: loc.send.sent_view_explorer, onPress: () => Linking.openURL(`${explorerUrl}/tx/${txid}`).catch(() => {}) },
      { text: loc._.ok, style: 'default' },
    ],
    options: { cancelable: true },
  });

/**
 * Resolves once the next frame is drawn. Creating the engine or signing blocks
 * the JS thread; waiting first lets the loader show (it keeps moving on the
 * UI thread).
 */
const afterNextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** Coins a send picks by hand: the wallet's own, or its silent payments. */
type CoinSource = 'wallet' | 'silent';

type Kind = 'xna' | 'asset';
const KINDS: SettingsSegment<Kind>[] = [
  { value: 'xna', label: 'XNA', icon: 'toll', testID: 'SendNeuraiKindXna' },
  { value: 'asset', label: loc.send.asset, icon: 'layers', testID: 'SendNeuraiAssetSwitch' },
];

/** Silent payment colour behind an icon or on a tag. */
const SILENT_SOFT = { light: '#f3e8ff', dark: 'rgba(124, 58, 237, 0.22)' };
const SILENT_TEXT = { light: '#6b21a8', dark: '#d8b4fe' };

/** A small rounded button with an icon and a word, for the recipient field. */
const FieldButton: React.FC<{ icon: MaterialIconName; label: string; onPress: () => void; disabled?: boolean; testID: string }> = ({
  icon,
  label,
  onPress,
  disabled,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.fieldButton, { backgroundColor: p.ground }, (pressed || disabled) && styles.pressed]}
    >
      <Icon name={icon} type="material" size={18} color={p.ink} />
      <Text style={[styles.fieldButtonText, { color: p.ink }]}>{label}</Text>
    </Pressable>
  );
};

/** One line of the review: what, and how much (or to whom). */
const ReviewRow: React.FC<{ label: string; value: string; strong?: boolean; mono?: boolean; divider?: boolean; testID?: string }> = ({
  label,
  value,
  strong,
  mono,
  divider,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <View
      style={[styles.reviewRow, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
      testID={testID}
    >
      <Text style={[styles.reviewLabel, { color: p.mutedOnCard }]}>{label}</Text>
      <Text
        style={[styles.reviewValue, strong && styles.reviewStrong, mono && styles.mono, { color: p.ink }]}
        numberOfLines={1}
        ellipsizeMode={mono ? 'middle' : 'tail'}
      >
        {value}
      </Text>
    </View>
  );
};

type RouteProps = RouteProp<DetailViewStackParamList, 'SendNeurai'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'SendNeurai'>;

const SendNeurai: React.FC = () => {
  const p = useSettingsPalette();
  const { wallets, saveToDisk } = useStorage();
  const { isPQAddressReuseEnabled, selectedBlockExplorer, selectedTestnetBlockExplorer } = useSettings();
  const { navigate, goBack } = useExtendedNavigation<NavigationProps>();
  const { params } = useRoute<RouteProps>();
  const found = wallets.find(w => w.getID() === params.walletID);
  const wallet = isNeuraiWallet(found) ? found : null;
  const hwWallet = wallet && wallet.type === NeuraiHardwareWallet.type ? (wallet as NeuraiHardwareWallet) : null;
  const hw = useNeuraiHwDevice();

  const [address, setAddress] = useState(params.address ?? '');
  const [amount, setAmount] = useState(params.amount ? String(params.amount) : '');
  const [draft, setDraft] = useState<NeuraiBuildTransactionResult | null>(null);
  const [hwDraft, setHwDraft] = useState<NeuraiHwUnsignedSend | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  // "Send max" defers the amount to build time (it is `balance − fee`, only
  // known once the fee is computed), so we track it as a mode rather than a
  // typed amount. Any manual edit to the amount field cancels it.
  const [isSendMax, setIsSendMax] = useState(false);
  // Asset send mode: a switch reveals an asset picker; when an asset is selected
  // the amount is denominated in that asset and the network fee is still paid in
  // XNA. Available for every Neurai wallet, including the hardware wallet (which
  // builds the transfer for the device to sign).
  const canSendAssets = !!wallet;
  const [isAssetMode, setIsAssetMode] = useState(false);
  const [heldAssets, setHeldAssets] = useState<NeuraiHeldAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<NeuraiHeldAsset | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  // Coin control: a switch lists the wallet's coins and the send spends only
  // the ticked ones. Silent payment coins (ECDSA wallets) have a list of their
  // own and normal sends never touch them, so no transaction ties them to the
  // rest of the wallet. The hardware wallet builds its sends on its own.
  const canControlCoins = !hwWallet;
  const silentWallet = wallet instanceof NeuraiECDSAWallet ? wallet : null;
  const [walletCoins, setWalletCoins] = useState<WalletCoin[]>([]);
  const [silentCoins, setSilentCoins] = useState<WalletCoin[]>([]);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [coinSource, setCoinSource] = useState<CoinSource | null>(null);
  const [selectedCoinKeys, setSelectedCoinKeys] = useState<ReadonlySet<string>>(new Set());

  const resetDrafts = useCallback(() => {
    setDraft(null);
    setHwDraft(null);
  }, []);

  const onChangeAddress = useCallback(
    (v: string) => {
      // The field wraps long addresses and codes, but they are one line.
      setAddress(v.replace(/[\r\n]+/g, ''));
      resetDrafts();
    },
    [resetDrafts],
  );
  const onChangeAmount = useCallback(
    (v: string) => {
      setAmount(v);
      setIsSendMax(false);
      resetDrafts();
    },
    [resetDrafts],
  );

  useEffect(() => {
    silentWallet
      ?.listSilentPaymentCoins()
      .then(setSilentCoins)
      .catch(err => console.debug('SendNeurai: listSilentPaymentCoins failed', err));
  }, [silentWallet]);
  const sourceCoins = useMemo(
    () => (coinSource === 'silent' ? silentCoins : coinSource === 'wallet' ? walletCoins : []),
    [coinSource, silentCoins, walletCoins],
  );
  const selectedCoins = sourceCoins.filter(c => selectedCoinKeys.has(coinKey(c)));

  // Available balance is stored in sats on the wallet; convert to whole XNA
  // for display next to the amount field so the user knows the cap without
  // backing out to the wallet view. With coin control it is the ticked coins;
  // silent payment coins only count when they are the ones being spent.
  const walletSats = (wallet?.getBalance() ?? 0n) - sumSats(silentCoins);
  const availableSats = coinSource ? sumSats(selectedCoins) : walletSats > 0n ? walletSats : 0n;
  const availableXna = satsToXna(availableSats);
  const assetAvailable = selectedAsset?.amount ?? '0';
  const amountUnit = isAssetMode && selectedAsset ? selectedAsset.name : 'XNA';

  const onToggleAssetMode = useCallback(
    async (on: boolean, preselect?: string) => {
      setIsAssetMode(on);
      if (on) setCoinSource(null);
      setIsSendMax(false);
      setSelectedAsset(null);
      setAmount('');
      resetDrafts();
      if (!on || !wallet) return;
      // Always refresh so the picker reflects the latest holdings (e.g. an asset
      // that landed on a change address after a previous send), not a stale cache.
      setIsLoadingAssets(true);
      try {
        await wallet.refreshHeldAssets();
      } catch (err: any) {
        presentAlert({ tone: 'error', message: err?.message ?? String(err) });
      } finally {
        setIsLoadingAssets(false);
      }
      const assets = wallet.getHeldAssetsCached();
      setHeldAssets(assets);
      // The asset the screen was opened for, or the only one held: spare the user a tap.
      const wanted = preselect ? assets.find(asset => asset.name === preselect) : undefined;
      if (wanted) setSelectedAsset(wanted);
      else if (assets.length === 1) setSelectedAsset(assets[0]);
    },
    [wallet, resetDrafts],
  );

  // Opened from an asset: start in asset mode with it chosen.
  const openedForAsset = useRef(false);
  useEffect(() => {
    if (openedForAsset.current || !params.assetName) return;
    openedForAsset.current = true;
    onToggleAssetMode(true, params.assetName);
  }, [params.assetName, onToggleAssetMode]);

  const onSwitchCoinSource = useCallback(
    async (source: CoinSource, on: boolean) => {
      setCoinSource(on ? source : null);
      setSelectedCoinKeys(new Set());
      setIsSendMax(false);
      setAmount('');
      resetDrafts();
      if (!on || !wallet) return;
      setIsAssetMode(false);
      setSelectedAsset(null);
      // Fetch again so the list leaves out what a previous send spent.
      setIsLoadingCoins(true);
      try {
        await afterNextFrame();
        if (source === 'silent' && silentWallet) {
          const coins = await silentWallet.listSilentPaymentCoins();
          setSilentCoins(coins);
          // A single coin is the only possible choice: tick it.
          if (coins.length === 1) setSelectedCoinKeys(new Set([coinKey(coins[0])]));
        } else {
          setWalletCoins(await wallet.listCoins());
        }
      } catch (err: any) {
        presentAlert({ tone: 'error', message: err?.message ?? String(err) });
      } finally {
        setIsLoadingCoins(false);
      }
    },
    [wallet, silentWallet, resetDrafts],
  );

  const onToggleCoin = useCallback(
    (coin: WalletCoin) => {
      const next = new Set(selectedCoinKeys);
      if (!next.delete(coinKey(coin))) next.add(coinKey(coin));
      setSelectedCoinKeys(next);
      // "Send max" follows the selection.
      if (isSendMax) setAmount(satsToXna(sumSats(sourceCoins.filter(c => next.has(coinKey(c))))));
      resetDrafts();
    },
    [selectedCoinKeys, sourceCoins, isSendMax, resetDrafts],
  );

  const onPickAsset = useCallback(
    (asset: NeuraiHeldAsset) => {
      setSelectedAsset(asset);
      setAmount('');
      resetDrafts();
      setIsAssetPickerOpen(false);
    },
    [resetDrafts],
  );

  // Use the callback path of ScanQRCode (it calls back + goBack()) instead of
  // the popTo path: SendNeurai lives inside the nested DetailViewScreensStack
  // while ScanQRCode is registered at the top-level DetailViewStack, so
  // popTo('SendNeurai') from the modal can't find it across navigators.
  const handleScanned = useCallback(
    (data: string) => {
      // `xna:` payment requests (also `XNA:` and `xna://`) are parsed by the
      // shared matcher in `class/neurai-uri-match.ts`; a string with no scheme
      // is taken as a bare address, as before.
      const trimmed = data.trim();
      const parsed: NeuraiPaymentUri | undefined = trimmed.toLowerCase().startsWith('xna:')
        ? parseNeuraiPaymentUri(trimmed)
        : { address: trimmed };
      if (parsed?.address) setAddress(parsed.address);
      if (parsed?.amount) setAmount(parsed.amount);
      resetDrafts();
    },
    [resetDrafts],
  );

  const openScanner = useCallback(() => {
    navigate('ScanQRCode', { onBarScanned: handleScanned, showFileImportButton: false });
  }, [navigate, handleScanned]);

  // A pasted payment request fills the amount too, like a scanned one.
  const pasteAddress = useCallback(async () => {
    const text = (await Clipboard.getString()).trim();
    if (text) handleScanned(text);
  }, [handleScanned]);

  const fillMax = useCallback(() => {
    if (isAssetMode) {
      if (selectedAsset) setAmount(formatAssetAmount(selectedAsset.amount));
    } else {
      setIsSendMax(true);
      setAmount(availableXna);
    }
    resetDrafts();
  }, [isAssetMode, selectedAsset, availableXna, resetDrafts]);

  // The review shows up under everything: bring it into view.
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (draft || hwDraft) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  }, [draft, hwDraft]);

  const buildDraft = useCallback(async () => {
    if (!wallet) return;
    Keyboard.dismiss();
    resetDrafts();
    if (!address.trim()) {
      presentAlert({ tone: 'error', message: loc.send.details_address_field_is_not_valid });
      return;
    }
    // NIP-047 payment code: the wallet derives the one-time address from the inputs it spends.
    const isSilentPayment = looksLikeSilentPaymentCode(address);
    if (isSilentPayment) {
      if (hwWallet) {
        presentAlert({ tone: 'error', message: loc.send.silent_payment_hardware });
        return;
      }
      if (isAssetMode) {
        presentAlert({ tone: 'error', message: loc.send.silent_payment_no_assets });
        return;
      }
    } else if (!wallet.isAddressValid(address.trim())) {
      presentAlert({ tone: 'error', message: loc.send.details_address_field_is_not_valid });
      return;
    }
    let xna = '0';
    try {
      if (!isSendMax || isAssetMode) xna = amountFromInput(amount.replace(',', '.'));
    } catch {
      presentAlert({ tone: 'error', message: loc.send.details_amount_field_is_not_valid });
      return;
    }
    if (isAssetMode && !selectedAsset) {
      presentAlert({ tone: 'warning', message: loc.assets.send_select });
      return;
    }
    if (coinSource && selectedCoins.length === 0) {
      presentAlert({ tone: 'warning', message: loc.send.select_coins });
      return;
    }

    // Hardware wallet: build the unsigned transaction now (no device needed);
    // signing happens on the device in the next step.
    if (hwWallet) {
      setIsBuilding(true);
      try {
        let unsigned: NeuraiHwUnsignedSend;
        if (isAssetMode && selectedAsset) {
          unsigned = await hwWallet.buildUnsignedAssetSend(address.trim(), selectedAsset.name, xna);
        } else if (isSendMax) {
          unsigned = await hwWallet.buildUnsignedSend(address.trim(), 0n, { sendMax: true });
        } else {
          unsigned = await hwWallet.buildUnsignedSend(address.trim(), xnaToSats(xna));
        }
        setHwDraft(unsigned);
      } catch (err: any) {
        presentAlert({ tone: 'error', message: err?.message ?? String(err) });
      } finally {
        setIsBuilding(false);
      }
      return;
    }

    setIsBuilding(true);
    try {
      await untilLoaderPainted();
      let result: NeuraiBuildTransactionResult;
      // PQ wallets with address reuse on should send change back to the static
      // receive address; otherwise the engine picks a fresh index and surprises
      // the user who explicitly disabled rotation. (Reused by both the XNA and
      // the asset path — the wallet also routes asset change there for PQ.)
      let forcedChangeAddress: string | undefined;
      if (isPQAddressReuseEnabled && wallet.walletKind === 'pq') {
        const receiveAddr = await wallet.getStaticReceiveAddress();
        if (receiveAddr !== address.trim()) forcedChangeAddress = receiveAddr;
      }
      if (coinSource === 'silent' && silentWallet) {
        result = await silentWallet.buildSilentPaymentCoinsTransaction(selectedCoins, address.trim(), isSendMax ? null : xna);
      } else if (coinSource === 'wallet') {
        result = await wallet.buildCoinControlTransaction(selectedCoins, address.trim(), isSendMax ? null : xna, { forcedChangeAddress });
      } else if (isSilentPayment) {
        result = await wallet.buildSilentPaymentTransaction(address.trim(), isSendMax ? null : xna, { forcedChangeAddress });
      } else if (isAssetMode && selectedAsset) {
        // Asset transfer: amount is in the asset's units; the fee is paid in XNA
        // and selected by the engine.
        const targets: NeuraiTransactionTarget[] = [{ address: address.trim(), amount: xna }];
        result = await wallet.buildSendTransaction(targets, { forcedChangeAddress, assetName: selectedAsset.name });
      } else if (isSendMax) {
        // Spend the whole balance: builder forces all UTXOs and deducts the fee.
        result = await wallet.buildSendMaxTransaction(address.trim());
      } else {
        const targets: NeuraiTransactionTarget[] = [{ address: address.trim(), amount: xna }];
        result = await wallet.buildSendTransaction(targets, { forcedChangeAddress });
      }
      if (!result.signedHex) throw new Error('Engine did not return a signed transaction');
      setDraft(result);
    } catch (err: any) {
      presentAlert({ tone: 'error', message: err?.message ?? String(err) });
    } finally {
      setIsBuilding(false);
    }
  }, [
    wallet,
    hwWallet,
    silentWallet,
    address,
    amount,
    isSendMax,
    isAssetMode,
    selectedAsset,
    coinSource,
    selectedCoins,
    isPQAddressReuseEnabled,
    resetDrafts,
  ]);

  const broadcast = useCallback(async () => {
    if (!draft || !wallet) return;
    setIsBroadcasting(true);
    try {
      let txid: string;
      if (draft.chainedHex) {
        // Two steps (silent payment from Legacy or PQ coins): both are saved in
        // the wallet before anything is sent, so they can be finished later (H17).
        if (!draft.chainedBridge) throw new Error('The two-step payment has no bridge address');
        const send: ChainedSend = {
          firstTxid: computeTxid(draft.signedHex),
          first: draft.signedHex,
          secondTxid: computeTxid(draft.chainedHex),
          second: draft.chainedHex,
          bridge: draft.chainedBridge,
          to: address.trim(),
          amountSats: draft.sentAmountSats.toString(),
          createdAt: Math.floor(Date.now() / 1000),
        };
        try {
          txid = await sendChainedPayment(wallet, send, draft.netDebitSats, saveToDisk);
        } catch (err: any) {
          if (err instanceof ChainedSendNotSavedError) {
            presentAlert({ tone: 'error', message: loc.send.silent_payment_not_saved });
          } else if (err instanceof ChainedSendClosedError && err.leg === 'second') {
            presentAlert({
              tone: 'error',
              message: String(loc.formatString(loc.send.silent_payment_closed, { reason: err.message, bridge: send.bridge })),
            });
          } else if (err instanceof ChainedSendClosedError) {
            presentAlert({ tone: 'error', message: err.message });
          } else {
            // It may have reached the node: the wallet shows it as pending, to be finished there.
            presentAlert({
              tone: 'warning',
              message: String(loc.formatString(loc.send.silent_payment_pending, { reason: err?.message ?? String(err) })),
            });
            navigate('WalletTransactions', { walletID: wallet.getID(), walletType: wallet.type });
          }
          return;
        }
      } else {
        txid = await wallet.broadcastTx(draft.signedHex);
        // Show the send immediately as a 0-conf pending entry and subtract it
        // from the balance; it is reconciled away once the tx confirms.
        if (draft.netDebitSats > 0n) wallet.addPendingTx(txid, -draft.netDebitSats, draft.asset);
      }
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentSent(txid, getBlockExplorerUrlForWallet(wallet, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url));
      // Pull mempool + balance straight away so the wallet list reflects the
      // pending tx by the time we land on it. Failures here are non-fatal —
      // the WalletTransactions auto-poller will catch up within 10 s.
      Promise.all([wallet.fetchTransactions(), wallet.fetchBalance()]).catch(err => console.debug('post-broadcast refresh failed:', err));
      navigate('WalletTransactions', { walletID: wallet.getID(), walletType: wallet.type });
    } catch (err: any) {
      presentAlert({ tone: 'error', title: loc.send.sent_failed, message: err?.message ?? String(err) });
    } finally {
      setIsBroadcasting(false);
    }
  }, [draft, wallet, navigate, address, saveToDisk, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url]);

  const hwSignAndBroadcast = useCallback(async () => {
    if (!hwWallet || !hwDraft) return;
    setIsBroadcasting(true);
    try {
      const device = await hw.connect();
      if (!device) throw new Error(hw.error || 'Could not connect to the hardware device');
      const { signedHex } = await hwWallet.signWithDevice(device, hwDraft);
      const txid = await hwWallet.broadcastTx(signedHex);
      await hw.disconnect().catch(() => {});
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentSent(txid, getBlockExplorerUrlForWallet(hwWallet, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url));
      // Show the send immediately as a 0-conf pending entry and subtract it
      // from the balance; it is reconciled away once the tx confirms.
      hwWallet.addPendingTx(txid, -(hwDraft.amountSats + hwDraft.feeSats), hwDraft.asset);
      Promise.all([hwWallet.fetchTransactions(), hwWallet.fetchBalance()]).catch(err =>
        console.debug('post-broadcast refresh failed:', err),
      );
      navigate('WalletTransactions', { walletID: hwWallet.getID(), walletType: hwWallet.type });
    } catch (err: any) {
      await hw.disconnect().catch(() => {});
      presentAlert({ tone: 'error', title: loc.send.sent_failed, message: err?.message ?? String(err) });
    } finally {
      setIsBroadcasting(false);
    }
  }, [hwWallet, hwDraft, hw, navigate, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url]);

  const busy = isBuilding || isBroadcasting;

  if (!wallet) {
    return (
      <View style={[styles.root, { backgroundColor: p.ground }]}>
        <SettingsScreenHeader title={loc.send.header} onBack={goBack} />
        <Text style={[styles.error, { color: p.muted }]}>{loc.errors.error}</Text>
      </View>
    );
  }

  const silentDestination = looksLikeSilentPaymentCode(address);
  const silentSoft = p.dark ? SILENT_SOFT.dark : SILENT_SOFT.light;
  const busyLabel = isBuilding
    ? loc.send.building
    : hwWallet
      ? hw.status === 'connecting'
        ? loc.send.hw_connect
        : loc.send.hw_signing
      : loc.send.broadcasting;

  const availableText = isAssetMode
    ? selectedAsset
      ? String(loc.formatString(loc.send.available, { amount: `${formatAssetAmount(assetAvailable)} ${selectedAsset.name}` }))
      : ''
    : String(loc.formatString(loc.send.available, { amount: `${availableXna} XNA` }));
  const canMax = isAssetMode ? !!selectedAsset && assetAvailable !== '0' : availableSats > 0n;

  // The review: what leaves, the fee and, for XNA, both together.
  let review: { sent: string; fee: string; total?: string } | null = null;
  if (draft) {
    review = {
      sent: draft.asset ? `${formatAssetAmount(draft.asset.amount)} ${draft.asset.name}` : `${satsToXna(draft.sentAmountSats)} XNA`,
      fee: `${satsToXna(draft.feeSats)} XNA`,
      total: draft.asset ? undefined : `${satsToXna(draft.sentAmountSats + draft.feeSats)} XNA`,
    };
  } else if (hwDraft) {
    review = {
      sent: hwDraft.asset ? `${formatAssetAmount(hwDraft.asset.amount)} ${hwDraft.asset.name}` : `${satsToXna(hwDraft.amountSats)} XNA`,
      fee: `${satsToXna(hwDraft.feeSats)} XNA`,
      total: hwDraft.asset ? undefined : `${satsToXna(hwDraft.amountSats + hwDraft.feeSats)} XNA`,
    };
  }

  const primary =
    hwWallet && hwDraft
      ? { title: loc.send.hw_sign, onPress: hwSignAndBroadcast, testID: 'SendNeuraiHwSign' }
      : draft
        ? { title: loc.send.header, onPress: broadcast, testID: 'SendNeuraiBroadcast' }
        : { title: loc.send.details_next, onPress: buildDraft, testID: 'SendNeuraiPreview' };

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="SendNeurai">
      <SettingsScreenHeader title={loc.send.header} onBack={goBack} />
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="SendNeuraiScroll"
      >
        <View>
          <SettingsSectionLabel>{loc.send.recipient}</SettingsSectionLabel>
          <SettingsCard style={styles.recipientCard}>
            <TextInput
              testID="SendNeuraiAddress"
              value={address}
              onChangeText={onChangeAddress}
              placeholder={loc.send.details_address}
              placeholderTextColor={p.mutedOnCard}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              editable={!busy}
              selectionColor={p.accent}
              style={[styles.addressInput, { color: p.ink }]}
              underlineColorAndroid="transparent"
            />
            <View style={styles.fieldActions}>
              {silentDestination ? (
                <View style={[styles.silentTag, { backgroundColor: silentSoft }]} testID="SendNeuraiSilentCode">
                  <View style={[styles.silentDot, { backgroundColor: SILENT_PAYMENT_ACCENT }]} />
                  <Text style={[styles.silentTagText, { color: p.dark ? SILENT_TEXT.dark : SILENT_TEXT.light }]} numberOfLines={1}>
                    {loc.send.silent_code}
                  </Text>
                </View>
              ) : null}
              <View style={styles.flex} />
              <FieldButton
                icon="content-paste"
                label={loc.send.input_paste}
                onPress={pasteAddress}
                disabled={busy}
                testID="SendNeuraiPaste"
              />
              <FieldButton
                icon="qr-code-scanner"
                label={loc.send.details_scan}
                onPress={openScanner}
                disabled={busy}
                testID="SendNeuraiScan"
              />
            </View>
          </SettingsCard>
        </View>

        {canSendAssets && (
          <View>
            <SettingsSectionLabel>{loc.send.send_what}</SettingsSectionLabel>
            <SettingsCard style={styles.whatCard}>
              <SettingsSegmented
                segments={KINDS}
                value={isAssetMode ? 'asset' : 'xna'}
                onChange={kind => {
                  if (!busy && (kind === 'asset') !== isAssetMode) onToggleAssetMode(kind === 'asset');
                }}
                testID="SendNeuraiKind"
              />
              {isAssetMode &&
                (isLoadingAssets ? (
                  <View style={styles.assetLoading}>
                    <NeuraiLoader size={28} />
                    <Text style={[styles.note, { color: p.mutedOnCard }]}>{loc._.loading}</Text>
                  </View>
                ) : (
                  <SettingsRow
                    icon="layers"
                    title={selectedAsset ? selectedAsset.name : heldAssets.length === 0 ? loc.assets.list_empty : loc.assets.send_select}
                    subtitle={
                      selectedAsset ? `${formatAssetAmount(selectedAsset.amount)} · ${assetTypeLabel(selectedAsset.type)}` : undefined
                    }
                    onPress={() => setIsAssetPickerOpen(true)}
                    disabled={busy || heldAssets.length === 0}
                    testID="SendNeuraiAssetPicker"
                  />
                ))}
            </SettingsCard>
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.send.create_amount}</SettingsSectionLabel>
          <SettingsCard>
            <View style={styles.amountRow}>
              <TextInput
                testID="SendNeuraiAmount"
                value={amount}
                onChangeText={onChangeAmount}
                placeholder="0"
                placeholderTextColor={p.mutedOnCard}
                keyboardType="decimal-pad"
                editable={!busy}
                selectionColor={p.accent}
                style={[styles.amountInput, { color: p.ink }]}
                underlineColorAndroid="transparent"
              />
              <Text style={[styles.amountUnit, { color: p.mutedOnCard }]} numberOfLines={1}>
                {amountUnit}
              </Text>
            </View>
            <View style={[styles.availableRow, { borderTopColor: p.divider }]}>
              <Text style={[styles.available, { color: p.mutedOnCard }]} numberOfLines={1} testID="SendNeuraiAvailable">
                {availableText}
              </Text>
              <Pressable
                onPress={fillMax}
                disabled={busy || !canMax}
                accessibilityRole="button"
                accessibilityState={{ selected: isSendMax, disabled: busy || !canMax }}
                testID="SendNeuraiMax"
                style={({ pressed }) => [
                  styles.maxPill,
                  { backgroundColor: isSendMax ? p.accent : p.accentSoft },
                  (pressed || !canMax) && styles.pressed,
                ]}
              >
                <Text style={[styles.maxText, { color: isSendMax ? p.onAccent : p.accentText }]}>{loc.send.max}</Text>
              </Pressable>
            </View>
          </SettingsCard>
        </View>

        {canControlCoins && (
          <View>
            <SettingsSectionLabel>{loc.send.coins}</SettingsSectionLabel>
            <SettingsCard>
              <CoinControl
                icon="tune"
                label={loc.cc.header}
                subtitle={loc.send.coins_subtitle}
                accent={p.accent}
                accentSoft={p.accentSoft}
                testID="SendNeuraiCoinControl"
                coins={walletCoins}
                isOn={coinSource === 'wallet'}
                onSwitch={on => onSwitchCoinSource('wallet', on)}
                selected={selectedCoinKeys}
                onToggleCoin={onToggleCoin}
                isLoading={isLoadingCoins}
                loadingText={loc.send.coins_loading}
                disabled={busy || isLoadingCoins}
                emptyText={loc.send.coins_empty}
              />
              {silentWallet && (silentCoins.length > 0 || coinSource === 'silent') && (
                <CoinControl
                  divider
                  icon="visibility-off"
                  label={loc.receive.silent_payments}
                  subtitle={String(loc.formatString(loc.send.silent_coins_subtitle, { amount: satsToXna(sumSats(silentCoins)) }))}
                  accent={silentPaymentTint(p.dark)}
                  accentSoft={silentSoft}
                  testID="SendNeuraiSilent"
                  coins={silentCoins}
                  isOn={coinSource === 'silent'}
                  onSwitch={on => onSwitchCoinSource('silent', on)}
                  selected={selectedCoinKeys}
                  onToggleCoin={onToggleCoin}
                  isLoading={isLoadingCoins}
                  loadingText={loc.send.coins_loading}
                  disabled={busy || isLoadingCoins}
                  emptyText={loc.send.coins_empty}
                />
              )}
            </SettingsCard>
          </View>
        )}

        {busy ? (
          <SettingsCard style={styles.busyCard} testID="SendNeuraiBusy">
            <NeuraiLoader size={64} label={busyLabel} />
          </SettingsCard>
        ) : review ? (
          <View>
            <SettingsSectionLabel>{loc.send.review}</SettingsSectionLabel>
            <SettingsCard testID="SendNeuraiReview">
              <ReviewRow label={loc.send.you_send} value={review.sent} strong testID="SendNeuraiReviewAmount" />
              <ReviewRow label={loc.send.create_fee} value={review.fee} divider testID="SendNeuraiReviewFee" />
              {review.total ? (
                <ReviewRow label={loc.send.total} value={review.total} strong divider testID="SendNeuraiReviewTotal" />
              ) : null}
              <ReviewRow label={loc.send.to} value={address.trim()} mono divider />
            </SettingsCard>
          </View>
        ) : null}
      </ScrollView>
      <ConnectFooter primary={{ ...primary, disabled: busy }} />

      <Modal visible={isAssetPickerOpen} transparent animationType="fade" onRequestClose={() => setIsAssetPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsAssetPickerOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: p.card }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: p.ink }]}>{loc.assets.send_select}</Text>
            <FlatList
              data={heldAssets}
              keyExtractor={a => a.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <SettingsRow
                  icon="layers"
                  title={item.name}
                  subtitle={`${formatAssetAmount(item.amount)} · ${assetTypeLabel(item.type)}`}
                  onPress={() => onPickAsset(item)}
                  divider={index > 0}
                  testID={`AssetOption-${item.name}`}
                />
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  pressed: { opacity: 0.6 },
  error: { fontSize: 15, textAlign: 'center', marginTop: 40 },
  recipientCard: { paddingTop: 10, paddingBottom: 12, rowGap: 8 },
  addressInput: {
    fontFamily: 'monospace',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 48,
    paddingVertical: 4,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
  fieldActions: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  fieldButton: { flexDirection: 'row', alignItems: 'center', columnGap: 6, height: 36, borderRadius: 18, paddingHorizontal: 12 },
  fieldButtonText: { fontSize: 13, fontWeight: '600' },
  silentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 1,
  },
  silentDot: { width: 7, height: 7, borderRadius: 3.5 },
  silentTagText: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  whatCard: { paddingVertical: 12, rowGap: 4 },
  assetLoading: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingTop: 12, paddingHorizontal: 6 },
  note: { fontSize: 13 },
  amountRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: 68 },
  amountInput: { flex: 1, fontSize: 30, fontWeight: '700', letterSpacing: -0.5, paddingVertical: 6, paddingHorizontal: 0 },
  amountUnit: { fontSize: 17, fontWeight: '600', maxWidth: '40%' },
  availableRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  available: { flex: 1, fontSize: 13 },
  maxPill: { height: 32, borderRadius: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  maxText: { fontSize: 13, fontWeight: '700' },
  busyCard: { paddingVertical: 28, alignItems: 'center' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', columnGap: 16, minHeight: 52, paddingVertical: 8 },
  reviewLabel: { fontSize: 14 },
  reviewValue: { flex: 1, fontSize: 15, fontWeight: '500', textAlign: 'right' },
  reviewStrong: { fontWeight: '700' },
  mono: { fontFamily: 'monospace', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { maxHeight: '70%', borderRadius: 24, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
});

export default SendNeurai;
