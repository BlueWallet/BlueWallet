import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackHandler, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { Easing, Layout, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Share from 'react-native-share';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { majorTomToGroundControl, tryToObtainPermissions } from '../../blue_modules/notifications';
import BlueButtonLink from '../../components/BlueButtonLink';
import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import type { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import CopyTextToClipboard, { CopyTextToClipboardHandle } from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCode from '../../components/QRCode';
import SegmentedControl from '../../components/SegmentedControl';
import { useTheme } from '../../components/themes';
import { TransactionPendingIconBig } from '../../components/TransactionPendingIconBig';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useIsWalletAddressUsed, useWalletTransactionByOutputAddress } from '../../hooks/useWalletActivity';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';
import { SuccessView } from '../send/success';
import { BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';

const segmentControlValues = [loc.wallets.details_address, loc.bip47.payment_code];

// Tappable receive card layout constants. Kept in one place because the QR
// size depends on subtracting all the surrounding paddings/margins.
const CARD_HORIZONTAL_MARGIN = 24;
const CARD_INTERNAL_PADDING = 6;
const QR_CARD_PADDING = 6;
const MAX_QR_SIZE = 500;
const MIN_QR_SIZE = 120;
const QR_SCROLL_RESERVED_WIDTH = (CARD_HORIZONTAL_MARGIN + CARD_INTERNAL_PADDING + QR_CARD_PADDING) * 2;
const QR_PORTRAIT_HEIGHT_FRACTION = 0.44;
const QR_LANDSCAPE_HEIGHT_FRACTION = 0.52;
const QR_WIDTH_USE_FRACTION = 0.92;

/** Staggered “reveal” for the QR: white tiles fade out in random order */
const QR_STAGGER_GRID = 5;
const QR_STAGGER_MAX_DELAY_MS = 420;
const QR_STAGGER_TILE_DURATION_MS = 400;

/** Deterministic stagger delays for a given payload key */
function staggerDelaysForRunKey(runKey: string, tileCount: number, maxDelayMs: number): number[] {
  const delays: number[] = [];
  for (let i = 0; i < tileCount; i++) {
    let n = 0;
    const s = `${runKey}:${i}`;
    for (let j = 0; j < s.length; j++) {
      n = (n * 31 + s.charCodeAt(j) * (j + 1)) % 2147483647;
    }
    delays.push(n % maxDelayMs);
  }
  return delays;
}

const receiveAuxStyles = StyleSheet.create({
  qrRevealTile: {
    position: 'absolute',
  },
  qrStaggerHost: {
    overflow: 'hidden',
  },
});

type QrRevealTileProps = {
  width: number;
  height: number;
  left: number;
  top: number;
  maskColor: string;
  delayMs: number;
  runKey: string;
};

const QrRevealTile: React.FC<QrRevealTileProps> = ({ width, height, left, top, maskColor, delayMs, runKey }) => {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = 1;
    opacity.value = withDelay(delayMs, withTiming(0, { duration: QR_STAGGER_TILE_DURATION_MS, easing: Easing.out(Easing.quad) }));
  }, [runKey, delayMs, opacity]);
  const tileStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[receiveAuxStyles.qrRevealTile, { left, top, width, height, backgroundColor: maskColor }, tileStyle]}
    />
  );
};

type QrStaggerRevealProps = {
  size: number;
  maskColor: string;
  runKey: string;
  children: React.ReactNode;
};

const QrStaggerReveal: React.FC<QrStaggerRevealProps> = ({ size, maskColor, runKey, children }) => {
  const delays = useMemo(() => staggerDelaysForRunKey(runKey, QR_STAGGER_GRID * QR_STAGGER_GRID, QR_STAGGER_MAX_DELAY_MS), [runKey]);
  const g = QR_STAGGER_GRID;
  const qx = Math.floor(size / g);
  const extraX = size - qx * g;
  const qy = Math.floor(size / g);
  const extraY = size - qy * g;
  const tileW = (c: number) => (c === g - 1 ? qx + extraX : qx);
  const tileH = (r: number) => (r === g - 1 ? qy + extraY : qy);
  const left = (c: number) => c * qx;
  const top = (r: number) => r * qy;

  return (
    <View style={[receiveAuxStyles.qrStaggerHost, { width: size, height: size }]}>
      {children}
      {delays.map((delayMs, i) => {
        const row = Math.floor(i / g);
        const col = i % g;
        return (
          <QrRevealTile
            key={`${runKey}-${i}`}
            width={tileW(col)}
            height={tileH(row)}
            left={left(col)}
            top={top(row)}
            maskColor={maskColor}
            delayMs={delayMs}
            runKey={runKey}
          />
        );
      })}
    </View>
  );
};

type NavigationProps = NativeStackNavigationProp<ReceiveDetailsStackParamList, 'ReceiveDetails'>;
type RouteProps = RouteProp<ReceiveDetailsStackParamList, 'ReceiveDetails'>;

const ReceiveDetails = () => {
  const route = useRoute<RouteProps>();
  const { walletID, address } = route.params;
  const explicitlyRequestedAddress = useRef(address).current;
  const currentAddressRef = useRef(address);
  currentAddressRef.current = address;
  const { wallets, saveToDisk, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const isDarkTheme = useColorScheme() === 'dark';
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState<BitcoinUnit>(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [showPendingBalance, setShowPendingBalance] = useState(false);
  const [showConfirmedBalance, setShowConfirmedBalance] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [currentTab, setCurrentTab] = useState(segmentControlValues[0]);
  const { goBack, setParams, navigate } = useNavigation<NavigationProps>();
  const [intervalMs, setIntervalMs] = useState(5000);
  const [displayBalance, setDisplayBalance] = useState('');
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const receiveObservationRef = useRef<{ address?: string; pendingTransactionId?: string }>({});

  const wallet = walletID ? wallets.find(w => w.getID() === walletID) : undefined;
  const isBIP47Enabled = wallet?.isBIP47Enabled();
  const receivedTransaction = useWalletTransactionByOutputAddress(wallet, address);
  const isWalletAddressUsed = useIsWalletAddressUsed(walletID ?? '');

  const paymentCodeString = useMemo(() => (wallet && 'getBIP47PaymentCode' in wallet && wallet.getBIP47PaymentCode()) || '', [wallet]);

  /** Dark: theme input surface (#262626) reads softer than pure elevated / system gray 6. Light: iOS-style grouped background. */
  const cardBackgroundColor = isDarkTheme ? colors.inputBackgroundColor : '#F2F2F7';

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    amount: {
      color: colors.foregroundColor,
    },
    label: {
      color: colors.foregroundColor,
    },
    receiveCard: {
      backgroundColor: cardBackgroundColor,
    },
    /** Total width: QR + white card padding + gray card horizontal padding (each side). */
    receiveCardColumn: {
      width: qrCodeSize + QR_CARD_PADDING * 2 + CARD_INTERNAL_PADDING * 2,
    },
    bip47NotFound: {
      color: colors.foregroundColor,
    },
    qrPlaceholderFill: {
      backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
  });

  const copyRef = useRef<CopyTextToClipboardHandle>(null);
  const scrollLayoutRef = useRef({ width: 0, height: 0 });
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.97, { duration: 110, easing: Easing.out(Easing.quad) });
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
  }, [pressScale]);
  const handleCardPress = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
    copyRef.current?.copy({ suppressHaptic: true });
  }, []);

  const setAddressBIP21Encoded = useCallback(
    (addr: string) => {
      const newBip21encoded = DeeplinkSchemaMatch.bip21encode(addr);
      setParams({ address: addr });
      setBip21encoded(newBip21encoded);
      setShowAddress(true);
    },
    [setParams],
  );

  const obtainWalletAddress = useCallback(async () => {
    console.debug('ReceiveDetails - componentDidMount');
    // this function should only be called when wallet exists
    if (!wallet) {
      console.warn('Wallet not found');
      return;
    }
    if (explicitlyRequestedAddress) {
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([explicitlyRequestedAddress], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
      return;
    }

    let newAddress;
    if (wallet.chain === Chain.ONCHAIN) {
      try {
        // Refresh first so Realm contains the latest wallet activity. The
        // refresh persists its transaction snapshot before resolving.
        if (!isElectrumDisabled && walletID) await fetchAndSaveWalletTransactions(walletID, true);

        const currentAddress = currentAddressRef.current;
        if (currentAddress && !isWalletAddressUsed(currentAddress)) {
          newAddress = currentAddress;
        } else {
          // Do not rely on `type` or `_hdWalletInstance in wallet` here. Older
          // serialized wallets can have a stale type value, and an undefined
          // TypeScript class field is absent at runtime. The watch-only HD
          // wrapper is the wallet shape that combines init(), isHd(), and the
          // derivation API.
          const possibleWatchOnlyWallet = wallet as Partial<WatchOnlyWallet>;
          const watchOnlyWallet =
            typeof possibleWatchOnlyWallet.init === 'function' &&
            typeof possibleWatchOnlyWallet.isHd === 'function' &&
            typeof possibleWatchOnlyWallet.getNextFreeAddressIndex === 'function'
              ? (wallet as WatchOnlyWallet)
              : undefined;
          if (watchOnlyWallet?.isHd() && !watchOnlyWallet._hdWalletInstance) {
            watchOnlyWallet.init();
          }
          const derivationWallet = watchOnlyWallet ? watchOnlyWallet._hdWalletInstance : wallet;
          let canDeriveAddresses = false;
          if (derivationWallet && '_getExternalAddressByIndex' in derivationWallet && 'getNextFreeAddressIndex' in derivationWallet) {
            canDeriveAddresses = true;
            const startIndex = Math.max(0, derivationWallet.getNextFreeAddressIndex());
            const candidatesToCheck = 21;
            for (let offset = 0; offset < candidatesToCheck; offset++) {
              const candidate = derivationWallet._getExternalAddressByIndex(startIndex + offset);
              if (!isWalletAddressUsed(candidate)) {
                newAddress = candidate;
                break;
              }
            }
          }

          // Single-address wallets and an exhausted derivation window fall
          // back to the wallet implementation's normal address discovery.
          if (!newAddress) {
            const candidate = await wallet.getAddressAsync();
            if (candidate && (!canDeriveAddresses || !isWalletAddressUsed(candidate))) newAddress = candidate;
          }
        }
      } catch (error) {
        console.warn('Error fetching wallet address (ONCHAIN):', error);
      }
      if (newAddress !== undefined) {
        saveToDisk().catch(error => console.error('Failed to persist generated wallet address:', error));
      }
    } else {
      try {
        await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        newAddress = wallet.getAddress();
      } catch (error) {
        console.warn('Error fetching wallet address (OFFCHAIN):', error);
      }
      if (newAddress === undefined) {
        console.warn('either sleep expired or getAddressAsync threw an exception');
        newAddress = wallet.getAddress();
      } else {
        saveToDisk().catch(error => console.error('Failed to persist generated wallet address:', error));
      }
    }

    if (!newAddress) {
      presentAlert({ title: loc.errors.error, message: loc.receive.address_not_found });
      return;
    }

    setAddressBIP21Encoded(newAddress);

    try {
      await tryToObtainPermissions();
      majorTomToGroundControl([newAddress], [], []);
    } catch (error) {
      console.error('Error obtaining notifications permissions:', error);
    }
  }, [
    explicitlyRequestedAddress,
    fetchAndSaveWalletTransactions,
    isElectrumDisabled,
    isWalletAddressUsed,
    saveToDisk,
    setAddressBIP21Encoded,
    sleep,
    wallet,
    walletID,
  ]);

  const onEnablePaymentsCodeSwitchValue = useCallback(() => {
    if (wallet && wallet.allowBIP47()) {
      wallet.switchBIP47(!wallet.isBIP47Enabled());
    }
    saveToDisk().catch(error => console.error('Failed to persist BIP47 setting:', error));
    obtainWalletAddress();
  }, [wallet, saveToDisk, obtainWalletAddress]);

  useEffect(() => {
    if (showConfirmedBalance) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
  }, [showConfirmedBalance]);

  useEffect(() => {
    if (address && !isCustom) {
      setAddressBIP21Encoded(address);
    }
  }, [address, isCustom, setAddressBIP21Encoded]);

  useEffect(() => {
    setParams({
      allowBIP47: Boolean(wallet?.allowBIP47()),
      isBIP47Enabled: Boolean(isBIP47Enabled),
    });
  }, [isBIP47Enabled, setParams, wallet]);

  const lastToggleRequestRef = useRef<number | undefined>(undefined);
  const toggleBIP47RequestedAt = route.params?.toggleBIP47RequestedAt;

  useEffect(() => {
    if (!toggleBIP47RequestedAt || toggleBIP47RequestedAt === lastToggleRequestRef.current) {
      return;
    }

    lastToggleRequestRef.current = toggleBIP47RequestedAt;
    onEnablePaymentsCodeSwitchValue();
    setParams({ toggleBIP47RequestedAt: undefined });
  }, [toggleBIP47RequestedAt, onEnablePaymentsCodeSwitchValue, setParams]);

  // Network refreshes write the canonical transaction store. The live Realm
  // query above drives this screen and every other mounted consumer.
  useEffect(() => {
    if (!walletID || !address || isCustom) return;
    const refresh = () => {
      fetchAndSaveWalletTransactions(walletID).catch(error => console.error('Failed to refresh receive transaction:', error));
    };
    refresh();
    const intervalId = setInterval(refresh, intervalMs);
    return () => clearInterval(intervalId);
  }, [address, fetchAndSaveWalletTransactions, intervalMs, isCustom, walletID]);

  useEffect(() => {
    if (isCustom) return;

    if (receiveObservationRef.current.address !== address) {
      receiveObservationRef.current = { address };
    }

    if (!receivedTransaction) {
      setDisplayBalance('');
      setShowPendingBalance(false);
      setShowConfirmedBalance(false);
      setShowAddress(Boolean(address));
      return;
    }

    const amount = Math.abs(receivedTransaction.value ?? 0);
    const transactionId = receivedTransaction.txid || receivedTransaction.hash;
    if (receivedTransaction.confirmations === 0) {
      if (receiveObservationRef.current.pendingTransactionId !== transactionId) {
        triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
      }
      receiveObservationRef.current.pendingTransactionId = transactionId;
      setIntervalMs(25000);
      setDisplayBalance(
        loc.formatString(loc.transactions.pending_with_amount, {
          amt1: formatBalance(amount, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
          amt2: formatBalance(amount, BitcoinUnit.BTC, true).toString(),
        }),
      );
      setShowPendingBalance(true);
      setShowConfirmedBalance(false);
      setShowAddress(false);
      return;
    }

    // Match master's rendering semantics: an address with historical confirmed
    // activity still displays its receive QR. Success is only shown when a
    // transaction observed pending on this screen becomes confirmed.
    if (
      (receivedTransaction.confirmations ?? 0) > 0 &&
      transactionId &&
      receiveObservationRef.current.pendingTransactionId === transactionId
    ) {
      setDisplayBalance(
        loc.formatString(loc.transactions.received_with_amount, {
          amt1: formatBalance(amount, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
          amt2: formatBalance(amount, BitcoinUnit.BTC, true).toString(),
        }),
      );
      setShowConfirmedBalance(true);
      setShowPendingBalance(false);
      setShowAddress(false);
      return;
    }

    setDisplayBalance('');
    setShowConfirmedBalance(false);
    setShowPendingBalance(false);
    setShowAddress(Boolean(address));
  }, [address, isCustom, receivedTransaction]);

  useEffect(() => {
    const handleBackButton = () => {
      goBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => subscription.remove();
  }, [goBack]);

  const renderConfirmedBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
            {customLabel}
          </BlueText>
        )}
        <SuccessView />
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {displayBalance}
        </BlueText>
      </View>
    );
  };

  const renderPendingBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
            {customLabel}
          </BlueText>
        )}
        <TransactionPendingIconBig />
        <BlueSpacing40 />
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {displayBalance}
        </BlueText>
      </View>
    );
  };

  const recomputeQrCodeSize = useCallback(() => {
    const { width: sw, height: sh } = scrollLayoutRef.current;
    if (sw <= 0 || sh <= 0) return;

    const isPortrait = sh > sw;
    const heightCap = Math.min(isPortrait ? sh * QR_PORTRAIT_HEIGHT_FRACTION : sh * QR_LANDSCAPE_HEIGHT_FRACTION, MAX_QR_SIZE);
    const widthBudget = sw - QR_SCROLL_RESERVED_WIDTH;
    const innerWidthCap = Math.max(MIN_QR_SIZE, Math.floor(widthBudget * QR_WIDTH_USE_FRACTION));
    const size = Math.max(MIN_QR_SIZE, Math.min(innerWidthCap, heightCap, MAX_QR_SIZE));
    setQRCodeSize(Math.round(size));
  }, []);

  const onScrollViewLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number; width: number } } }) => {
      const { height, width } = e.nativeEvent.layout;
      scrollLayoutRef.current = { width, height };
      recomputeQrCodeSize();
    },
    [recomputeQrCodeSize],
  );

  const toBalancedMultilineText = useCallback((value: string) => {
    const normalized = value.replace(/\n/g, '');
    if (normalized.length <= 1) return normalized;
    const midpoint = Math.ceil(normalized.length / 2);
    return `${normalized.slice(0, midpoint)}\n${normalized.slice(midpoint)}`;
  }, []);

  const showReceiveSkeleton = !showAddress && !showPendingBalance && !showConfirmedBalance && Boolean(wallet ?? route.params.address);

  const renderReceiveSkeleton = () => {
    const showTabs = Boolean(wallet && isBIP47Enabled);
    return (
      <View style={styles.cardPressable} testID="ReceiveCardSkeleton">
        <View style={[styles.receiveCard, stylesHook.receiveCard, stylesHook.receiveCardColumn]}>
          {showTabs && (
            <View style={styles.tabsInsideCard} onStartShouldSetResponder={() => true}>
              <SegmentedControl
                values={segmentControlValues}
                selectedIndex={segmentControlValues.findIndex(tab => tab === currentTab)}
                onChange={index => setCurrentTab(segmentControlValues[index])}
              />
            </View>
          )}
          <View style={styles.qrCardWrapper}>
            <View style={[styles.qrPlaceholder, stylesHook.qrPlaceholderFill, { width: qrCodeSize, height: qrCodeSize }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderReceiveCard = () => {
    const isAddressTab = currentTab === segmentControlValues[0];

    let qrValue: string | undefined;
    let copyText: string | undefined;

    if (isAddressTab) {
      if (!address) return null;
      qrValue = bip21encoded;
      copyText = isCustom ? bip21encoded : address;
    } else if (wallet && isBIP47Enabled) {
      qrValue = paymentCodeString || undefined;
      copyText = paymentCodeString || undefined;
    }

    const showTabs = Boolean(wallet && isBIP47Enabled);
    const showTip = !isAddressTab && Boolean(qrValue);
    const showCustomAmount = isAddressTab && isCustom;
    const displayCopyText = copyText && isAddressTab ? toBalancedMultilineText(copyText) : undefined;

    return (
      <Pressable
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!copyText}
        style={styles.cardPressable}
        accessibilityRole="button"
        accessibilityLabel={loc.transactions.details_copy}
        testID="ReceiveCard"
      >
        <Animated.View style={[styles.receiveCard, stylesHook.receiveCard, stylesHook.receiveCardColumn, pressAnimatedStyle]}>
          {showTabs && (
            <View
              style={styles.tabsInsideCard}
              // Keep tab interactions local: tapping segmented control should not
              // trigger the parent receive-card copy press.
              onStartShouldSetResponder={() => true}
            >
              <SegmentedControl
                values={segmentControlValues}
                selectedIndex={segmentControlValues.findIndex(tab => tab === currentTab)}
                onChange={index => setCurrentTab(segmentControlValues[index])}
              />
            </View>
          )}

          {showTip && <BlueText style={[styles.paymentCodeDescription, stylesHook.label]}>{loc.receive.bip47_explanation}</BlueText>}

          {showCustomAmount && (
            <View style={styles.customAmountWrapper}>
              {getDisplayAmount() && (
                <BlueText testID="BitcoinAmountText" style={[styles.amount, stylesHook.amount]} numberOfLines={1}>
                  {getDisplayAmount()}
                </BlueText>
              )}
              {customLabel?.length > 0 && (
                <BlueText testID="CustomAmountDescriptionText" style={[styles.label, stylesHook.label]} numberOfLines={1}>
                  {customLabel}
                </BlueText>
              )}
            </View>
          )}

          {qrValue ? (
            <View style={styles.qrCardWrapper}>
              <QrStaggerReveal size={qrCodeSize} maskColor="#FFFFFF" runKey={`${currentTab}|${qrValue}`}>
                <QRCode value={qrValue} size={qrCodeSize} />
              </QrStaggerReveal>
            </View>
          ) : (
            <View style={styles.bip47NotFoundContainer}>
              <Text style={stylesHook.bip47NotFound}>{loc.bip47.not_found}</Text>
            </View>
          )}

          {copyText && (
            <>
              <View style={styles.cardSpacer} />
              <View style={styles.addressRow}>
                <CopyTextToClipboard
                  ref={copyRef}
                  text={copyText}
                  displayText={displayCopyText}
                  isAddress={isAddressTab}
                  truncated={false}
                  interactive={false}
                />
              </View>
            </>
          )}
        </Animated.View>
      </Pressable>
    );
  };

  const hasIncomingCustomParams =
    route.params?.customLabel !== undefined ||
    route.params?.customAmount !== undefined ||
    route.params?.customUnit !== undefined ||
    route.params?.bip21encoded !== undefined ||
    route.params?.isCustom !== undefined;

  useFocusEffect(
    useCallback(() => {
      if (isCustom || hasIncomingCustomParams) return () => {};
      let cancelled = false;
      (async () => {
        try {
          if (wallet) {
            await obtainWalletAddress();
          } else if (!wallet && currentAddressRef.current) {
            setAddressBIP21Encoded(currentAddressRef.current);
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error during focus effect:', error);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [wallet, obtainWalletAddress, setAddressBIP21Encoded, isCustom, hasIncomingCustomParams]),
  );

  const showCustomAmountModal = useCallback(() => {
    if (!address) return;
    navigate('ReceiveCustomAmount', {
      address,
      currentLabel: customLabel,
      currentAmount: customAmount,
      currentUnit: customUnit,
      preferredUnit: wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC,
    });
  }, [address, customAmount, customLabel, customUnit, navigate, wallet]);

  useEffect(() => {
    const {
      customLabel: incomingLabel,
      customAmount: incomingAmount,
      customUnit: incomingUnit,
      bip21encoded: incomingBip21,
      isCustom: incomingIsCustom,
    } = route.params;

    const noIncomingParams =
      incomingLabel === undefined &&
      incomingAmount === undefined &&
      incomingUnit === undefined &&
      incomingBip21 === undefined &&
      incomingIsCustom === undefined;

    if (noIncomingParams) return;

    if (incomingIsCustom) {
      setIsCustom(true);
      setCustomLabel(incomingLabel ?? '');
      setCustomAmount(incomingAmount ?? '');
      setCustomUnit(incomingUnit ?? BitcoinUnit.BTC);
      if (incomingBip21) {
        setBip21encoded(incomingBip21);
      }
      setShowAddress(true);
      setShowPendingBalance(false);
      setShowConfirmedBalance(false);
    } else {
      const fallbackUnit = wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC;
      setIsCustom(false);
      setCustomLabel('');
      setCustomAmount('');
      setCustomUnit(fallbackUnit);
      if (incomingBip21) {
        setBip21encoded(incomingBip21);
      }
      setShowAddress(true);
      setShowPendingBalance(false);
      setShowConfirmedBalance(false);
    }

    setParams({ customLabel: undefined, customAmount: undefined, customUnit: undefined, bip21encoded: undefined, isCustom: undefined });
  }, [route.params, setParams, wallet]);

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = (): string | null => {
    const number = Number(customAmount);
    if (number > 0) {
      switch (customUnit) {
        case BitcoinUnit.BTC:
          return customAmount + ' BTC';
        case BitcoinUnit.SATS:
          return satoshiToBTC(number) + ' BTC';
        case BitcoinUnit.LOCAL_CURRENCY:
          return fiatToBTC(number) + ' BTC';
      }
      return customAmount + ' ' + customUnit;
    } else {
      return null;
    }
  };

  const handleShareButtonPressed = () => {
    const message = currentTab === segmentControlValues[0] ? bip21encoded : paymentCodeString;

    if (!message) {
      presentAlert({ title: loc.errors.error, message: loc.bip47.not_found });
      return;
    }

    Share.open({ message }).catch(error => console.debug('Error sharing:', error));
  };

  return (
    <Animated.View layout={Layout.duration(200)} style={[styles.flex, stylesHook.root]}>
      <SafeAreaScrollView
        centerContent
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustsScrollIndicatorInsets
        automaticallyAdjustKeyboardInsets
        testID="ReceiveDetailsScrollView"
        style={stylesHook.root}
        contentContainerStyle={[styles.root, stylesHook.root]}
        keyboardShouldPersistTaps="always"
        onLayout={onScrollViewLayout}
      >
        {showAddress && renderReceiveCard()}
        {showReceiveSkeleton && renderReceiveSkeleton()}
        {showAddress && address !== undefined && (
          <HandOffComponent title={loc.send.details_address} type={HandOffActivityType.ReceiveOnchain} userInfo={{ address }} />
        )}
        {showConfirmedBalance && renderConfirmedBalance()}
        {showPendingBalance && renderPendingBalance()}

        {!showAddress && !showPendingBalance && !showConfirmedBalance && !showReceiveSkeleton && (
          <View style={styles.loadingContainer}>
            <BlueLoading />
          </View>
        )}

        <View style={styles.share}>
          <BlueCard>
            {showAddress && currentTab === loc.wallets.details_address && (
              <BlueButtonLink
                style={styles.link}
                testID="SetCustomAmountButton"
                title={loc.receive.details_setAmount}
                onPress={showCustomAmountModal}
              />
            )}
            <Button
              onPress={handleShareButtonPressed}
              title={loc.receive.details_share}
              disabled={!bip21encoded && !(currentTab === segmentControlValues[1] && isBIP47Enabled)}
            />
          </BlueCard>
        </View>
      </SafeAreaScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  link: {
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  amount: {
    fontWeight: '600',
    fontSize: 36,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
  },
  cardPressable: {
    alignSelf: 'center',
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    marginTop: 56,
    marginBottom: 8,
  },
  receiveCard: {
    borderRadius: 26,
    paddingHorizontal: CARD_INTERNAL_PADDING,
    paddingTop: CARD_INTERNAL_PADDING,
    paddingBottom: 16,
    alignItems: 'center',
  },
  tabsInsideCard: {
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  paymentCodeDescription: {
    alignSelf: 'stretch',
    textAlign: 'left',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  customAmountWrapper: {
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  qrCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: QR_CARD_PADDING,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  qrPlaceholder: {
    borderRadius: 4,
  },
  cardSpacer: {
    height: 24,
  },
  addressRow: {
    alignSelf: 'stretch',
    marginHorizontal: -CARD_INTERNAL_PADDING,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  bip47NotFoundContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

export default ReceiveDetails;
