import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackHandler, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { Easing, Layout, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Share from 'react-native-share';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
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
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';
import { SuccessView } from '../send/success';
import { BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { RECEIVE_DETAILS_MOCKED_VALUE, ReceiveDetailsMockScenario, registerReceiveDetailsDevMenu } from '../../components/DevMenu';

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

const SET_ADDRESS = 'SET_ADDRESS';
const SELECT_TAB = 'SELECT_TAB';
const UPDATE_BALANCE = 'UPDATE_BALANCE';
const UPDATE_ETA = 'UPDATE_ETA';
const UPDATE_QR_CODE_SIZE = 'UPDATE_QR_CODE_SIZE';
const APPLY_CUSTOM_PARAMS = 'APPLY_CUSTOM_PARAMS';
const MOCK_SCENARIO = 'MOCK_SCENARIO';

type ReceiveDetailsState = {
  address: string;
  customLabel: string;
  customAmount: string;
  customUnit: BitcoinUnit;
  bip21encoded: string;
  isCustom: boolean;
  showPendingBalance: boolean;
  showConfirmedBalance: boolean;
  showAddress: boolean;
  currentTab: string;
  intervalMs: number;
  eta: string;
  initialConfirmed: number;
  initialUnconfirmed: number;
  displayBalance: string;
  displayAmount: string | null;
  qrCodeSize: number;
  mockPaymentCode?: string | null;
};

type ReceiveDetailsAction =
  | { type: typeof SET_ADDRESS; address: string }
  | { type: typeof SELECT_TAB; index: number }
  | {
      type: typeof UPDATE_BALANCE;
      confirmed: number;
      unconfirmed: number;
    }
  | { type: typeof UPDATE_ETA; fee: number; vsize: number; fastFee: number; mediumFee: number }
  | { type: typeof UPDATE_QR_CODE_SIZE; width: number; height: number }
  | {
      type: typeof APPLY_CUSTOM_PARAMS;
      params: Pick<RouteProps['params'], 'customLabel' | 'customAmount' | 'customUnit' | 'bip21encoded' | 'isCustom'>;
      fallbackUnit: BitcoinUnit;
    }
  | { type: typeof MOCK_SCENARIO; scenario: ReceiveDetailsMockScenario; value: typeof RECEIVE_DETAILS_MOCKED_VALUE };

const initialState: ReceiveDetailsState = {
  address: '',
  customLabel: '',
  customAmount: '',
  customUnit: BitcoinUnit.BTC,
  bip21encoded: '',
  isCustom: false,
  showPendingBalance: false,
  showConfirmedBalance: false,
  showAddress: false,
  currentTab: segmentControlValues[0],
  intervalMs: 5000,
  eta: '',
  initialConfirmed: 0,
  initialUnconfirmed: 0,
  displayBalance: '',
  displayAmount: null,
  qrCodeSize: 90,
  mockPaymentCode: undefined,
};

const formatDisplayAmount = (amount: string, unit: BitcoinUnit): string | null => {
  const number = Number(amount);
  if (number <= 0) return null;

  switch (unit) {
    case BitcoinUnit.BTC:
      return `${amount} BTC`;
    case BitcoinUnit.SATS:
      return `${satoshiToBTC(number)} BTC`;
    case BitcoinUnit.LOCAL_CURRENCY:
      return `${fiatToBTC(number)} BTC`;
    default:
      return `${amount} ${unit}`;
  }
};

const receiveDetailsReducer = (state: ReceiveDetailsState, action: ReceiveDetailsAction): ReceiveDetailsState => {
  switch (action.type) {
    case SET_ADDRESS: {
      const bip21encoded = DeeplinkSchemaMatch.bip21encode(action.address);
      if (state.address === action.address && state.bip21encoded === bip21encoded && state.showAddress) return state;
      return { ...state, address: action.address, bip21encoded, showAddress: true };
    }
    case SELECT_TAB: {
      const currentTab = segmentControlValues[action.index];
      if (!currentTab || state.currentTab === currentTab) return state;
      return { ...state, currentTab };
    }
    case UPDATE_BALANCE: {
      if (action.unconfirmed > 0) {
        const isInitialPendingBalance = state.initialConfirmed === 0 && state.initialUnconfirmed === 0;
        const displayBalance = loc.formatString(loc.transactions.pending_with_amount, {
          amt1: formatBalance(action.unconfirmed, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
          amt2: formatBalance(action.unconfirmed, BitcoinUnit.BTC, true).toString(),
        });
        if (!isInitialPendingBalance && state.displayBalance === displayBalance && state.showPendingBalance && !state.showAddress) {
          return state;
        }
        return {
          ...state,
          initialConfirmed: isInitialPendingBalance ? action.confirmed : state.initialConfirmed,
          initialUnconfirmed: isInitialPendingBalance ? action.unconfirmed : state.initialUnconfirmed,
          intervalMs: isInitialPendingBalance ? 25000 : state.intervalMs,
          displayBalance,
          showPendingBalance: true,
          showAddress: false,
        };
      }

      if (action.unconfirmed !== 0 || state.initialUnconfirmed === 0) return state;

      const receivedBalance = action.confirmed - state.initialConfirmed;
      if (receivedBalance <= 0) {
        if (!state.showConfirmedBalance && !state.showPendingBalance && state.showAddress) return state;
        return {
          ...state,
          showConfirmedBalance: false,
          showPendingBalance: false,
          showAddress: true,
        };
      }

      const displayBalance = loc.formatString(loc.transactions.received_with_amount, {
        amt1: formatBalance(receivedBalance, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
        amt2: formatBalance(receivedBalance, BitcoinUnit.BTC, true).toString(),
      });
      if (state.displayBalance === displayBalance && state.showConfirmedBalance && !state.showPendingBalance && !state.showAddress) {
        return state;
      }
      return {
        ...state,
        displayBalance,
        showConfirmedBalance: true,
        showPendingBalance: false,
        showAddress: false,
      };
    }
    case UPDATE_ETA: {
      const satPerVbyte = Math.round(action.fee / action.vsize);
      const eta =
        satPerVbyte >= action.fastFee
          ? loc.formatString(loc.transactions.eta_10m)
          : satPerVbyte >= action.mediumFee
            ? loc.formatString(loc.transactions.eta_3h)
            : loc.formatString(loc.transactions.eta_1d);
      if (state.eta === eta) return state;
      return { ...state, eta };
    }
    case UPDATE_QR_CODE_SIZE: {
      if (action.width <= 0 || action.height <= 0) return state;
      const isPortrait = action.height > action.width;
      const heightCap = Math.min(
        isPortrait ? action.height * QR_PORTRAIT_HEIGHT_FRACTION : action.height * QR_LANDSCAPE_HEIGHT_FRACTION,
        MAX_QR_SIZE,
      );
      const widthBudget = action.width - QR_SCROLL_RESERVED_WIDTH;
      const innerWidthCap = Math.max(MIN_QR_SIZE, Math.floor(widthBudget * QR_WIDTH_USE_FRACTION));
      const qrCodeSize = Math.round(Math.max(MIN_QR_SIZE, Math.min(innerWidthCap, heightCap, MAX_QR_SIZE)));
      if (state.qrCodeSize === qrCodeSize) return state;
      return { ...state, qrCodeSize };
    }
    case APPLY_CUSTOM_PARAMS: {
      const isCustom = Boolean(action.params.isCustom);
      const customLabel = isCustom ? (action.params.customLabel ?? '') : '';
      const customAmount = isCustom ? (action.params.customAmount ?? '') : '';
      const customUnit = isCustom ? (action.params.customUnit ?? BitcoinUnit.BTC) : action.fallbackUnit;
      return {
        ...state,
        customLabel,
        customAmount,
        customUnit,
        bip21encoded: action.params.bip21encoded || state.bip21encoded,
        isCustom,
        showAddress: true,
        showPendingBalance: false,
        showConfirmedBalance: false,
        displayAmount: formatDisplayAmount(customAmount, customUnit),
      };
    }
    case MOCK_SCENARIO: {
      if (action.value !== RECEIVE_DETAILS_MOCKED_VALUE) return state;

      const mockedAddress = action.value;
      const addressState: ReceiveDetailsState = {
        ...initialState,
        address: mockedAddress,
        bip21encoded: DeeplinkSchemaMatch.bip21encode(mockedAddress),
        showAddress: true,
      };
      const applyCustomState = (customAmount: string, customUnit: BitcoinUnit, bip21encoded: string) =>
        receiveDetailsReducer(addressState, {
          type: APPLY_CUSTOM_PARAMS,
          params: {
            customLabel: 'Mocked payment',
            customAmount,
            customUnit,
            bip21encoded,
            isCustom: true,
          },
          fallbackUnit: BitcoinUnit.BTC,
        });
      const applyPendingState = (fee: number) => {
        const etaState = receiveDetailsReducer(addressState, {
          type: UPDATE_ETA,
          fee,
          vsize: 100,
          fastFee: 10,
          mediumFee: 5,
        });
        return receiveDetailsReducer(etaState, {
          type: UPDATE_BALANCE,
          confirmed: 100_000,
          unconfirmed: 50_000,
        });
      };

      switch (action.scenario) {
        case 'loading':
          return { ...initialState, address: mockedAddress };
        case 'address':
          return addressState;
        case 'custom-btc':
          return applyCustomState('0.001', BitcoinUnit.BTC, 'bitcoin:mocked?amount=0.001&label=Mocked%20payment');
        case 'custom-sats':
          return applyCustomState('100000', BitcoinUnit.SATS, 'bitcoin:mocked?amount=0.001&label=Mocked%20payment');
        case 'custom-fiat':
          return {
            ...addressState,
            customLabel: 'Mocked payment',
            customAmount: '100',
            customUnit: BitcoinUnit.LOCAL_CURRENCY,
            bip21encoded: 'bitcoin:mocked?label=Mocked%20payment',
            isCustom: true,
            displayAmount: '0.001 BTC',
          };
        case 'pending-fast':
          return applyPendingState(1_000);
        case 'pending-medium':
          return applyPendingState(700);
        case 'pending-slow':
          return applyPendingState(100);
        case 'confirmed': {
          const pendingState = applyPendingState(1_000);
          return receiveDetailsReducer(pendingState, {
            type: UPDATE_BALANCE,
            confirmed: 150_000,
            unconfirmed: 0,
          });
        }
        case 'evicted': {
          const pendingState = applyPendingState(1_000);
          return receiveDetailsReducer(pendingState, {
            type: UPDATE_BALANCE,
            confirmed: 100_000,
            unconfirmed: 0,
          });
        }
        case 'payment-code':
          return {
            ...addressState,
            currentTab: segmentControlValues[1],
            mockPaymentCode: action.value,
          };
        case 'payment-code-not-found':
          return {
            ...addressState,
            currentTab: segmentControlValues[1],
            mockPaymentCode: null,
          };
      }
    }
  }
};

const ReceiveDetails = () => {
  const route = useRoute<RouteProps>();
  const { walletID, address: routeAddress } = route.params;
  const { wallets, saveToDisk, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const isDarkTheme = useColorScheme() === 'dark';
  const [state, dispatch] = useReducer(receiveDetailsReducer, routeAddress, address =>
    address ? { ...initialState, address } : initialState,
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
    mockPaymentCode,
  } = state;
  const isMocked = address === RECEIVE_DETAILS_MOCKED_VALUE;
  const { goBack, setParams, navigate } = useExtendedNavigation<NavigationProps>();

  const wallet = walletID ? wallets.find(w => w.getID() === walletID) : undefined;
  const isBIP47Enabled = wallet?.isBIP47Enabled();
  const isMockBIP47Enabled = mockPaymentCode !== undefined;

  const paymentCodeString = useMemo(
    () =>
      isMockBIP47Enabled ? (mockPaymentCode ?? '') : (wallet && 'getBIP47PaymentCode' in wallet && wallet.getBIP47PaymentCode()) || '',
    [isMockBIP47Enabled, mockPaymentCode, wallet],
  );

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
      dispatch({ type: SET_ADDRESS, address: addr });
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

  useEffect(() => {
    if (showConfirmedBalance) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      if (walletID) {
        fetchAndSaveWalletTransactions(walletID);
      }
    }
  }, [fetchAndSaveWalletTransactions, showConfirmedBalance, walletID]);

  useEffect(() => {
    if (initialUnconfirmed !== 0) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
    }
  }, [initialUnconfirmed]);

  useEffect(() => {
    if (routeAddress && !isCustom && !isMocked) {
      setAddressBIP21Encoded(routeAddress);
    }
  }, [isCustom, isMocked, routeAddress, setAddressBIP21Encoded]);

  useEffect(() => {
    if (!__DEV__) return;
    return registerReceiveDetailsDevMenu((scenario, value) => {
      dispatch({ type: MOCK_SCENARIO, scenario, value });
    });
  }, []);

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
    if (isMocked) return;

    const intervalId = setInterval(async () => {
      try {
        const decoded = DeeplinkSchemaMatch.bip21decode(bip21encoded);
        const addressToUse = address || decoded.address;
        if (!addressToUse) return;

        console.debug('checking address', addressToUse, 'for balance...');
        const balance = await BlueElectrum.getBalanceByAddress(addressToUse);
        console.debug('...got', balance);

        if (balance.unconfirmed > 0) {
          const txs = await BlueElectrum.getMempoolTransactionsByAddress(addressToUse);
          const tx = txs.pop();
          if (tx) {
            const rez = await BlueElectrum.multiGetTransactionByTxid([tx.tx_hash], true, 10);
            if (rez[tx.tx_hash] && rez[tx.tx_hash].vsize) {
              const fees = await BlueElectrum.estimateFees();
              dispatch({
                type: UPDATE_ETA,
                fee: tx.fee,
                vsize: rez[tx.tx_hash].vsize,
                fastFee: fees.fast,
                mediumFee: fees.medium,
              });
            }
          }
        }
        dispatch({ type: UPDATE_BALANCE, confirmed: balance.confirmed, unconfirmed: balance.unconfirmed });
      } catch (error) {
        console.debug('Error checking balance:', error);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [bip21encoded, address, intervalMs, isMocked]);

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
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {eta}
        </BlueText>
      </View>
    );
  };

  const onScrollViewLayout = useCallback((e: { nativeEvent: { layout: { height: number; width: number } } }) => {
    const { height, width } = e.nativeEvent.layout;
    dispatch({ type: UPDATE_QR_CODE_SIZE, width, height });
  }, []);

  const toBalancedMultilineText = useCallback((value: string) => {
    const normalized = value.replace(/\n/g, '');
    if (normalized.length <= 1) return normalized;
    const midpoint = Math.ceil(normalized.length / 2);
    return `${normalized.slice(0, midpoint)}\n${normalized.slice(midpoint)}`;
  }, []);

  const showReceiveSkeleton = !showAddress && !showPendingBalance && !showConfirmedBalance && Boolean(wallet ?? address);

  const renderReceiveSkeleton = () => {
    const showTabs = Boolean((wallet && isBIP47Enabled) || isMockBIP47Enabled);
    return (
      <View style={styles.cardPressable} testID="ReceiveCardSkeleton">
        <View style={[styles.receiveCard, stylesHook.receiveCard, stylesHook.receiveCardColumn]}>
          {showTabs && (
            <View style={styles.tabsInsideCard} onStartShouldSetResponder={() => true}>
              <SegmentedControl
                values={segmentControlValues}
                selectedIndex={segmentControlValues.findIndex(tab => tab === currentTab)}
                onChange={index => dispatch({ type: SELECT_TAB, index })}
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
    } else if ((wallet && isBIP47Enabled) || isMockBIP47Enabled) {
      qrValue = paymentCodeString || undefined;
      copyText = paymentCodeString || undefined;
    }

    const showTabs = Boolean((wallet && isBIP47Enabled) || isMockBIP47Enabled);
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
                onChange={index => dispatch({ type: SELECT_TAB, index })}
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
      if (isCustom || isMocked || hasIncomingCustomParams) return () => {};
      let cancelled = false;
      (async () => {
        try {
          if (wallet) {
            await obtainWalletAddress();
          } else if (!wallet && routeAddress) {
            setAddressBIP21Encoded(routeAddress);
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
    }, [wallet, routeAddress, obtainWalletAddress, setAddressBIP21Encoded, isCustom, isMocked, hasIncomingCustomParams]),
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
      type: APPLY_CUSTOM_PARAMS,
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
              disabled={!bip21encoded && !(currentTab === segmentControlValues[1] && (isBIP47Enabled || isMockBIP47Enabled))}
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
