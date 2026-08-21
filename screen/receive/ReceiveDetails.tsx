import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackHandler, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { Easing, Layout, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Share from 'react-native-share';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { majorTomToGroundControl, tryToObtainPermissions } from '../../blue_modules/notifications';
import BlueButtonLink from '../../components/BlueButtonLink';
import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
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
import loc from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';
import { SuccessView } from '../send/success';
import { BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import {
  CARD_HORIZONTAL_MARGIN,
  CARD_INTERNAL_PADDING,
  initialState,
  QR_CARD_PADDING,
  receiveDetailsReducer,
  receiveDetailsActionTypes,
  segmentControlValues,
} from './receiveDetailsReducer';

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
  const { walletID, address: routeAddress } = route.params;
  const { wallets, saveToDisk, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const isDarkTheme = useColorScheme() === 'dark';
  const [state, dispatch] = useReducer(receiveDetailsReducer, routeAddress, address =>
    address
      ? {
          ...initialState,
          address,
          bip21encoded: DeeplinkSchemaMatch.bip21encode(address),
          showAddress: true,
        }
      : initialState,
  );
  const {
    address,
    customLabel,
    customAmount,
    customUnit,
    bip21encoded,
    isCustom,
    showPendingBalance,
    showConfirmedBalance,
    showAddress,
    currentTab,
    intervalMs,
    eta,
    initialUnconfirmed,
    displayBalance,
    displayAmount,
    qrCodeSize,
  } = state;
  const { goBack, setParams, navigate } = useNavigation<NavigationProps>();

  const wallet = walletID ? wallets.find(w => w.getID() === walletID) : undefined;
  const isBIP47Enabled = wallet?.isBIP47Enabled();
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
      setParams({ address: addr });
      dispatch({ type: receiveDetailsActionTypes.SET_ADDRESS, address: addr });
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
    if (address) {
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([address], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
      return;
    }

    let newAddress;
    if (wallet.chain === Chain.ONCHAIN) {
      try {
        if (!isElectrumDisabled) newAddress = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
      } catch (error) {
        console.warn('Error fetching wallet address (ONCHAIN):', error);
      }
      if (newAddress === undefined) {
        if ('_getExternalAddressByIndex' in wallet) {
          newAddress = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          newAddress = wallet.getAddress();
        }
      } else {
        saveToDisk(); // caching whatever getAddressAsync() generated internally
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
        saveToDisk(); // caching whatever getAddressAsync() generated internally
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
  }, [wallet, saveToDisk, address, setAddressBIP21Encoded, isElectrumDisabled, sleep]);

  const onEnablePaymentsCodeSwitchValue = useCallback(() => {
    if (wallet && wallet.allowBIP47()) {
      wallet.switchBIP47(!wallet.isBIP47Enabled());
    }
    saveToDisk();
    obtainWalletAddress();
  }, [wallet, saveToDisk, obtainWalletAddress]);

  const didHandleConfirmedBalanceRef = useRef(false);

  useEffect(() => {
    if (!showConfirmedBalance) {
      didHandleConfirmedBalanceRef.current = false;
      return;
    }

    if (didHandleConfirmedBalanceRef.current) return;
    didHandleConfirmedBalanceRef.current = true;
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    if (walletID) {
      fetchAndSaveWalletTransactions(walletID);
    }
  }, [fetchAndSaveWalletTransactions, showConfirmedBalance, walletID]);

  useEffect(() => {
    if (initialUnconfirmed !== 0) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
    }
  }, [initialUnconfirmed]);

  useEffect(() => {
    if (routeAddress && routeAddress !== address && !isCustom) {
      dispatch({ type: receiveDetailsActionTypes.SET_ADDRESS, address: routeAddress });
    }
  }, [address, isCustom, routeAddress]);

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

  // re-fetching address balance periodically
  useEffect(() => {
    console.debug('receive/details - useEffect');
    const intervalId = setInterval(async () => {
      try {
        const decoded = DeeplinkSchemaMatch.bip21decode(bip21encoded);
        const addressToUse = address || decoded.address;
        if (!addressToUse) return;

        console.debug('checking address', addressToUse, 'for balance...');
        const balance = await BlueElectrum.getBalanceByAddress(addressToUse);
        console.debug('...got', balance);

        // dispatch the balance before the fallible mempool/fee queries below, so the pending
        // snapshot is recorded even when those queries throw (confirmation detection relies on it)
        dispatch({ type: receiveDetailsActionTypes.UPDATE_BALANCE, confirmed: balance.confirmed, unconfirmed: balance.unconfirmed });

        if (balance.unconfirmed > 0) {
          const txs = await BlueElectrum.getMempoolTransactionsByAddress(addressToUse);
          const tx = txs.pop();
          if (tx) {
            const rez = await BlueElectrum.multiGetTransactionByTxid([tx.tx_hash], true, 10);
            if (rez[tx.tx_hash] && rez[tx.tx_hash].vsize) {
              const fees = await BlueElectrum.estimateFees();
              dispatch({
                type: receiveDetailsActionTypes.UPDATE_ETA,
                fee: tx.fee,
                vsize: rez[tx.tx_hash].vsize,
                fastFee: fees.fast,
                mediumFee: fees.medium,
              });
            }
          }
        }
      } catch (error) {
        console.debug('Error checking balance:', error);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [bip21encoded, address, intervalMs]);

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
        <SuccessView centered />
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
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {eta}
        </BlueText>
      </View>
    );
  };

  const onScrollViewLayout = useCallback((e: { nativeEvent: { layout: { height: number; width: number } } }) => {
    const { height, width } = e.nativeEvent.layout;
    dispatch({ type: receiveDetailsActionTypes.UPDATE_QR_CODE_SIZE, width, height });
  }, []);

  const toBalancedMultilineText = useCallback((value: string) => {
    const normalized = value.replace(/\n/g, '');
    if (normalized.length <= 1) return normalized;
    const midpoint = Math.ceil(normalized.length / 2);
    return `${normalized.slice(0, midpoint)}\n${normalized.slice(midpoint)}`;
  }, []);

  const showReceiveSkeleton = !showAddress && !showPendingBalance && !showConfirmedBalance && Boolean(wallet ?? address);

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
                onChange={index => dispatch({ type: receiveDetailsActionTypes.SELECT_TAB, index })}
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
                onChange={index => dispatch({ type: receiveDetailsActionTypes.SELECT_TAB, index })}
              />
            </View>
          )}

          {showTip && <BlueText style={[styles.paymentCodeDescription, stylesHook.label]}>{loc.receive.bip47_explanation}</BlueText>}

          {showCustomAmount && (
            <View style={styles.customAmountWrapper}>
              {displayAmount && (
                <BlueText testID="BitcoinAmountText" style={[styles.amount, stylesHook.amount]} numberOfLines={1}>
                  {displayAmount}
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
    }, [wallet, obtainWalletAddress, isCustom, hasIncomingCustomParams]),
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

    dispatch({
      type: receiveDetailsActionTypes.APPLY_CUSTOM_PARAMS,
      params: {
        customLabel: incomingLabel,
        customAmount: incomingAmount,
        customUnit: incomingUnit,
        bip21encoded: incomingBip21,
        isCustom: incomingIsCustom,
      },
      fallbackUnit: wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC,
    });

    setParams({ customLabel: undefined, customAmount: undefined, customUnit: undefined, bip21encoded: undefined, isCustom: undefined });
  }, [route.params, setParams, wallet]);

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
        {showAddress && Boolean(address) && (
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
    width: '100%',
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
