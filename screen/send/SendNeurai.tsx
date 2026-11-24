import { amountFromInput, xnaToSats, satsToXna } from '../../blue_modules/neurai/amounts';
/**
 * Simplified Send screen for Neurai wallets.
 *
 * The Bitcoin-era `SendDetails` + `Confirm` pair is built around bitcoinjs-lib
 * coin selection, PSBTs, payjoin, multisig and fee-rate controls expressed in
 * sat/vByte. None of that maps cleanly onto Neurai: the engine in
 * `@neuraiproject/neurai-jswallet` selects coins, builds and signs the
 * transaction. The wallet supplies a local rate of 0.012 XNA per 1,000 vbytes
 * (the default min-relay rate plus 20%); libraries calculate the fee from the
 * selected inputs and serialized outputs, without asking for a node estimate.
 *
 * The user types an address and an amount in XNA, we build the transaction,
 * show the engine-computed fee and the amount to be sent, and broadcast on
 * confirm. Tapping the available-balance hint enters "send max" mode, which
 * spends the whole balance with the fee deducted (see `buildSendMaxTransaction`
 * and the hardware wallet's `sendMax` path). Custom fee tiers (slow/medium/fast)
 * can be added later.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from '@react-native-vector-icons/material-icons';

import { BlueFormLabel, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import NeuraiLoader, { untilLoaderPainted } from '../../components/NeuraiLoader';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import CoinControl, { coinKey, sumSats } from '../../components/CoinControl';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { parseNeuraiPaymentUri, type NeuraiPaymentUri } from '../../class/neurai-uri-match';
import { NeuraiHardwareWallet, type NeuraiHwUnsignedSend } from '../../class/wallets/neurai-hardware-wallet';
import { useNeuraiHwDevice } from '../../blue_modules/neurai-hw/useNeuraiHwDevice';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import type { NeuraiBuildTransactionResult, NeuraiTransactionTarget, WalletCoin } from '../../class/wallets/abstract-neurai-wallet';
import { formatAssetAmount, type NeuraiAssetType, type NeuraiHeldAsset } from '../../blue_modules/neurai/assetUtils';
import { looksLikeSilentPaymentCode, SILENT_PAYMENT_ACCENT } from '../../blue_modules/neurai/silentPayments';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';

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

/**
 * Resolves once the next frame is drawn. Creating the engine or signing blocks
 * the JS thread; waiting first lets the spinner set just before show (it keeps
 * spinning on the UI thread).
 */
const afterNextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** Coins a send picks by hand: the wallet's own, or its silent payments. */
type CoinSource = 'wallet' | 'silent';

type RouteProps = RouteProp<DetailViewStackParamList, 'SendNeurai'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'SendNeurai'>;

const SendNeurai: React.FC = () => {
  const { colors } = useTheme();
  const { wallets } = useStorage();
  const { isPQAddressReuseEnabled } = useSettings();
  const { navigate } = useExtendedNavigation<NavigationProps>();
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
      setAddress(v);
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
    async (on: boolean) => {
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
        presentAlert({ message: err?.message ?? String(err) });
      } finally {
        setIsLoadingAssets(false);
      }
      const assets = wallet.getHeldAssetsCached();
      setHeldAssets(assets);
      // Auto-select when there's only one asset to spare the user a tap.
      if (assets.length === 1) setSelectedAsset(assets[0]);
    },
    [wallet, resetDrafts],
  );

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
        presentAlert({ message: err?.message ?? String(err) });
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

  const stylesHook = {
    label: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    root: { backgroundColor: colors.elevated },
    feeBox: { borderColor: colors.formBorder, backgroundColor: colors.inputBackgroundColor },
    textInput: { color: colors.foregroundColor },
    unit: { color: colors.alternativeTextColor },
    feeLabel: { color: colors.feeText },
    feeValue: { color: colors.feeValue },
    assetToggleLabel: { color: colors.foregroundColor },
    balanceHint: { color: colors.alternativeTextColor },
    modalCard: { backgroundColor: colors.elevated },
    assetRow: { borderBottomColor: colors.formBorder },
  };

  const buildDraft = useCallback(async () => {
    if (!wallet) return;
    Keyboard.dismiss();
    resetDrafts();
    if (!address.trim()) {
      presentAlert({ message: loc.send.details_address_field_is_not_valid });
      return;
    }
    // NIP-047 payment code: the wallet derives the one-time address from the inputs it spends.
    const isSilentPayment = looksLikeSilentPaymentCode(address);
    if (isSilentPayment) {
      if (hwWallet) {
        presentAlert({ message: loc.send.silent_payment_hardware });
        return;
      }
      if (isAssetMode) {
        presentAlert({ message: loc.send.silent_payment_no_assets });
        return;
      }
    } else if (!wallet.isAddressValid(address.trim())) {
      presentAlert({ message: loc.send.details_address_field_is_not_valid });
      return;
    }
    let xna = '0';
    try {
      if (!isSendMax || isAssetMode) xna = amountFromInput(amount.replace(',', '.'));
    } catch {
      presentAlert({ message: loc.send.details_amount_field_is_not_valid });
      return;
    }
    if (isAssetMode && !selectedAsset) {
      presentAlert({ message: loc.assets.send_select });
      return;
    }
    if (coinSource && selectedCoins.length === 0) {
      presentAlert({ message: loc.send.select_coins });
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
        presentAlert({ message: err?.message ?? String(err) });
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
      presentAlert({ message: err?.message ?? String(err) });
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
      let txid = await wallet.broadcastTx(draft.signedHex);
      // Show the send immediately as a 0-conf pending entry and subtract it
      // from the balance; it is reconciled away once the tx confirms. A retry
      // of a silent payment's second transaction debits nothing more.
      if (draft.netDebitSats > 0n) wallet.addPendingTx(txid, -draft.netDebitSats, draft.asset);
      if (draft.chainedHex) {
        try {
          txid = await wallet.broadcastTx(draft.chainedHex);
        } catch (err: any) {
          // The coins already left: Send again only retries the second transaction.
          setDraft({ ...draft, signedHex: draft.chainedHex, chainedHex: undefined, netDebitSats: 0n });
          presentAlert({ message: loc.formatString(loc.send.silent_payment_retry, { reason: err?.message ?? String(err) }) });
          return;
        }
      }
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentAlert({ message: `${loc.send.broadcastSuccess}: ${txid}` });
      // Pull mempool + balance straight away so the wallet list reflects the
      // pending tx by the time we land on it. Failures here are non-fatal —
      // the WalletTransactions auto-poller will catch up within 10 s.
      Promise.all([wallet.fetchTransactions(), wallet.fetchBalance()]).catch(err => console.debug('post-broadcast refresh failed:', err));
      navigate('WalletTransactions', { walletID: wallet.getID(), walletType: wallet.type });
    } catch (err: any) {
      presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setIsBroadcasting(false);
    }
  }, [draft, wallet, navigate]);

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
      presentAlert({ message: `${loc.send.broadcastSuccess}: ${txid}` });
      // Show the send immediately as a 0-conf pending entry and subtract it
      // from the balance; it is reconciled away once the tx confirms.
      hwWallet.addPendingTx(txid, -(hwDraft.amountSats + hwDraft.feeSats), hwDraft.asset);
      Promise.all([hwWallet.fetchTransactions(), hwWallet.fetchBalance()]).catch(err =>
        console.debug('post-broadcast refresh failed:', err),
      );
      navigate('WalletTransactions', { walletID: hwWallet.getID(), walletType: hwWallet.type });
    } catch (err: any) {
      await hw.disconnect().catch(() => {});
      presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setIsBroadcasting(false);
    }
  }, [hwWallet, hwDraft, hw, navigate]);

  if (!wallet) {
    return (
      <View style={[styles.flex1, stylesHook.root, styles.center]}>
        <BlueText>{loc.errors.error}</BlueText>
      </View>
    );
  }

  return (
    <SafeAreaScrollView style={[styles.flex1, stylesHook.root]} testID="SendNeuraiScroll">
      <BlueSpacing20 />
      <BlueFormLabel>{loc.send.details_address}</BlueFormLabel>
      <View style={[styles.input, stylesHook.label]}>
        <TextInput
          testID="SendNeuraiAddress"
          value={address}
          placeholderTextColor={colors.placeholderTextColor}
          placeholder={loc.send.details_address}
          onChangeText={onChangeAddress}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isBuilding && !isBroadcasting}
          style={[styles.textInput, stylesHook.textInput]}
          underlineColorAndroid="transparent"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.send.details_scan}
          testID="SendNeuraiScan"
          onPress={openScanner}
          disabled={isBuilding || isBroadcasting}
          style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
        >
          <MaterialIcons name="qr-code-scanner" size={22} color={colors.foregroundColor} />
        </Pressable>
      </View>

      {canSendAssets && (
        <>
          <View style={styles.assetToggleRow}>
            <Text style={[styles.assetToggleLabel, stylesHook.assetToggleLabel]}>{loc.assets.send_toggle}</Text>
            <Switch
              testID="SendNeuraiAssetSwitch"
              value={isAssetMode}
              onValueChange={onToggleAssetMode}
              disabled={isBuilding || isBroadcasting}
            />
          </View>
          {isAssetMode && (
            <Pressable
              accessibilityRole="button"
              testID="SendNeuraiAssetPicker"
              onPress={() => setIsAssetPickerOpen(true)}
              disabled={isBuilding || isBroadcasting || isLoadingAssets || heldAssets.length === 0}
              style={[styles.input, stylesHook.label]}
            >
              {isLoadingAssets ? (
                <ActivityIndicator style={styles.assetPickerSpinner} />
              ) : (
                <Text style={[styles.textInput, stylesHook.textInput]} numberOfLines={1}>
                  {selectedAsset
                    ? `${selectedAsset.name} · ${formatAssetAmount(selectedAsset.amount)}`
                    : heldAssets.length === 0
                      ? loc.assets.list_empty
                      : loc.assets.send_select}
                </Text>
              )}
              <MaterialIcons name="arrow-drop-down" size={22} color={colors.foregroundColor} />
            </Pressable>
          )}
        </>
      )}

      {canControlCoins && (
        <CoinControl
          label={loc.cc.header}
          accent={colors.buttonBackgroundColor}
          testID="SendNeuraiCoinControl"
          coins={walletCoins}
          isOn={coinSource === 'wallet'}
          onSwitch={on => onSwitchCoinSource('wallet', on)}
          selected={selectedCoinKeys}
          onToggleCoin={onToggleCoin}
          isLoading={isLoadingCoins}
          loadingText={loc.send.coins_loading}
          disabled={isBuilding || isBroadcasting || isLoadingCoins}
          emptyText={loc.send.coins_empty}
        />
      )}

      {silentWallet && (silentCoins.length > 0 || coinSource === 'silent') && (
        <CoinControl
          label={loc.receive.silent_payments}
          accent={SILENT_PAYMENT_ACCENT}
          testID="SendNeuraiSilent"
          coins={silentCoins}
          isOn={coinSource === 'silent'}
          onSwitch={on => onSwitchCoinSource('silent', on)}
          selected={selectedCoinKeys}
          onToggleCoin={onToggleCoin}
          isLoading={isLoadingCoins}
          loadingText={loc.send.coins_loading}
          disabled={isBuilding || isBroadcasting || isLoadingCoins}
          emptyText={loc.send.coins_empty}
        />
      )}

      <Modal visible={isAssetPickerOpen} transparent animationType="fade" onRequestClose={() => setIsAssetPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAssetPickerOpen(false)}>
          <Pressable style={[styles.modalCard, stylesHook.modalCard]} onPress={() => {}}>
            <Text style={[styles.modalTitle, stylesHook.textInput]}>{loc.assets.send_select}</Text>
            <FlatList
              data={heldAssets}
              keyExtractor={a => a.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.assetRow, stylesHook.assetRow]}
                  onPress={() => onPickAsset(item)}
                  testID={`AssetOption-${item.name}`}
                >
                  <Text style={[styles.assetRowName, stylesHook.textInput]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.assetRowMeta, stylesHook.balanceHint]} numberOfLines={1}>
                    {`${formatAssetAmount(item.amount)} · ${assetTypeLabel(item.type)}`}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <BlueFormLabel>{loc.send.create_amount}</BlueFormLabel>
      <View style={[styles.input, stylesHook.label]}>
        <TextInput
          testID="SendNeuraiAmount"
          value={amount}
          placeholderTextColor={colors.placeholderTextColor}
          placeholder="0.00000000"
          keyboardType="decimal-pad"
          onChangeText={onChangeAmount}
          editable={!isBuilding && !isBroadcasting}
          style={[styles.textInput, stylesHook.textInput]}
          underlineColorAndroid="transparent"
        />
        <Text style={[styles.unit, stylesHook.unit]}>{amountUnit}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (isAssetMode) {
            if (selectedAsset) setAmount(formatAssetAmount(selectedAsset.amount));
          } else {
            setIsSendMax(true);
            setAmount(availableXna);
          }
          resetDrafts();
        }}
        disabled={isBuilding || isBroadcasting || (isAssetMode ? !selectedAsset || assetAvailable === '0' : availableSats === 0n)}
        style={styles.balanceHintRow}
      >
        <Text style={[styles.balanceHint, stylesHook.balanceHint]}>
          {isAssetMode
            ? selectedAsset
              ? loc.formatString(loc.assets.send_avail_max, { amount: formatAssetAmount(assetAvailable), asset: selectedAsset.name })
              : ''
            : loc.formatString(loc.send.create_avail_max, { amount: availableXna })}
        </Text>
      </Pressable>

      {(draft || hwDraft) && (
        <View style={[styles.feeBox, stylesHook.feeBox]}>
          <Text style={[styles.feeLabel, stylesHook.feeLabel]}>{loc.send.create_amount}</Text>
          <Text style={[styles.feeValue, stylesHook.feeValue]}>
            {draft?.asset
              ? `${formatAssetAmount(draft.asset.amount)} ${draft.asset.name}`
              : hwDraft?.asset
                ? `${formatAssetAmount(hwDraft.asset.amount)} ${hwDraft.asset.name}`
                : `${satsToXna(draft ? draft.sentAmountSats : hwDraft!.amountSats)} XNA`}
          </Text>
          <Text style={[styles.feeLabel, stylesHook.feeLabel, styles.feeLabelSpacer]}>{loc.send.create_fee}</Text>
          <Text style={[styles.feeValue, stylesHook.feeValue]}>{satsToXna(draft ? draft.feeSats : hwDraft!.feeSats)} XNA</Text>
        </View>
      )}

      <View style={styles.actions}>
        <BlueSpacing20 />
        {isBuilding || isBroadcasting ? (
          <>
            <NeuraiLoader size={56} />
            {hwWallet && isBroadcasting ? (
              <Text style={[styles.feeLabel, styles.hwHint, stylesHook.feeLabel]}>
                {hw.status === 'connecting' ? 'Connect the device and confirm on it…' : 'Signing on device…'}
              </Text>
            ) : null}
          </>
        ) : hwWallet && hwDraft ? (
          <Button testID="SendNeuraiHwSign" title="Sign on device & broadcast" onPress={hwSignAndBroadcast} />
        ) : draft ? (
          <Button testID="SendNeuraiBroadcast" title={loc.send.broadcastButton} onPress={broadcast} />
        ) : (
          <Button testID="SendNeuraiPreview" title={loc.send.details_next} onPress={buildDraft} />
        )}
        <BlueSpacing40 />
      </View>
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 12,
    borderRadius: 4,
  },
  textInput: { flex: 1, marginHorizontal: 8 },
  assetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
  },
  assetToggleLabel: { fontSize: 16, fontWeight: '600' },
  assetPickerSpinner: { flex: 1, alignItems: 'flex-start', marginHorizontal: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { maxHeight: '70%', borderRadius: 10, paddingVertical: 6 },
  modalTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 12 },
  assetRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  assetRowName: { fontSize: 16, fontWeight: '600' },
  assetRowMeta: { fontSize: 13, marginTop: 2 },
  balanceHintRow: { marginHorizontal: 20, marginTop: -4, marginBottom: 8 },
  balanceHint: { fontSize: 12, textAlign: 'right' },
  scanButton: {
    paddingHorizontal: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonPressed: { opacity: 0.5 },
  unit: { paddingHorizontal: 12, fontWeight: '600' },
  feeBox: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 6,
  },
  feeLabel: { fontSize: 12, opacity: 0.6, marginBottom: 4 },
  feeLabelSpacer: { marginTop: 12 },
  hwHint: { textAlign: 'center', marginTop: 8 },
  feeValue: { fontSize: 16, fontWeight: '600' },
  actions: { marginHorizontal: 20 },
});

export default SendNeurai;
