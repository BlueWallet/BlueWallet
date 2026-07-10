import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';

import { useTheme } from './themes';
import * as BlueElectrum from '../blue_modules/BlueElectrum';
import loc, { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';

const BLOCK_COUNT = 5;
const COLLAPSED_HEIGHT = 0;
const BLOCKS_HEIGHT = 130;
const SUMMARY_HEIGHT_ESTIMATE = 40;
const EXPANDED_HEIGHT_ESTIMATE = SUMMARY_HEIGHT_ESTIMATE + BLOCKS_HEIGHT;
const ANIMATION_DURATION = 280;
const ANIMATION_EASING = Easing.out(Easing.cubic);
const BLOCK_CARD_WIDTH = 120;
const BLOCK_CARD_GAP = 8;
const ITEM_LENGTH = BLOCK_CARD_WIDTH + BLOCK_CARD_GAP;
const HORIZONTAL_PADDING = 8;
const STATE_CARD_MARGIN_H = 24;
const txblockAnimation = require('../img/txblock.json');
const BLOCK_GRADIENT_EDGE_OPACITY = 0.45;
const BLOCK_GRADIENT_TOP_START = { x: 0.5, y: 0 };
const BLOCK_GRADIENT_TOP_END = { x: 0.5, y: 1 };
const BLOCK_GRADIENT_BOTTOM_START = { x: 0.5, y: 1 };
const BLOCK_GRADIENT_BOTTOM_END = { x: 0.5, y: 0 };

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const computeBlockHeights = (txHeight: number, tip: number): number[] => {
  const distance = Math.max(0, tip - txHeight);
  let startHeight = txHeight - 2;
  if (distance < 2) {
    startHeight = tip - (BLOCK_COUNT - 1);
  }
  let heights = Array.from({ length: BLOCK_COUNT }, (_, i) => startHeight + i);
  if (!heights.includes(txHeight)) {
    const centeredStart = txHeight - Math.floor((BLOCK_COUNT - 1) / 2);
    heights = Array.from({ length: BLOCK_COUNT }, (_, i) => centeredStart + i);
  }
  return heights;
};

interface BlocksAccordionProps {
  txHash: string;
  isSent: boolean;
  isExpanded: boolean;
  vsize?: number | null;
  feeSats?: number | null;
  feeRate?: number | null;
  onPress?: () => void;
}

interface BlockData {
  height: number;
  timestamp?: number;
}

const getItemLayout = (_: unknown, index: number) => ({
  length: ITEM_LENGTH,
  offset: HORIZONTAL_PADDING + index * ITEM_LENGTH,
  index,
});

/** Bolds substituted placeholder values only — templates must use flat keys with primitive values, not nested phrases. */
const renderBoldFormattedParts = (template: string, values: Record<string, string>, boldStyle: TextStyle): React.ReactNode[] => {
  const regex = /\{(\w+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push(template.substring(lastIndex, match.index));
    }
    const value = values[match[1]];
    if (value !== undefined) {
      parts.push(
        <Text key={`bold-${index++}`} style={boldStyle}>
          {value}
        </Text>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < template.length) {
    parts.push(template.substring(lastIndex));
  }

  return parts;
};

const BlocksAccordion: React.FC<BlocksAccordionProps> = ({ txHash, isSent, isExpanded, vsize, feeSats, feeRate, onPress }) => {
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [confirmedHeight, setConfirmedHeight] = useState<number | null>(null);
  const [currentTip, setCurrentTip] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const animatedHeight = useSharedValue(COLLAPSED_HEIGHT);
  const fetchStartedRef = useRef(false);
  const activeTxHashRef = useRef(txHash);
  const blocksListRef = useRef<FlatList<BlockData>>(null);

  const accentColor = isSent ? colors.transactionSentColor : colors.transactionReceivedColor;
  const borderAccent = isSent ? colors.outgoingForegroundColor : colors.incomingForegroundColor;
  const blockCardBg = hexToRgba(isSent ? colors.transactionSentColor : colors.transactionReceivedColor, 0.16);

  const lottieColorFilters = useMemo(() => [{ keypath: '**', color: borderAccent }], [borderAccent]);

  const blockGradientColors = useMemo(
    () =>
      colorScheme === 'dark'
        ? [`rgba(0, 0, 0, ${BLOCK_GRADIENT_EDGE_OPACITY})`, 'rgba(0, 0, 0, 0)']
        : [`rgba(255, 255, 255, ${BLOCK_GRADIENT_EDGE_OPACITY})`, 'rgba(255, 255, 255, 0)'],
    [colorScheme],
  );

  const stylesHook = StyleSheet.create({
    blockCardBase: { backgroundColor: blockCardBg },
    confirmedBlockCard: { borderColor: borderAccent, borderWidth: 2, backgroundColor: 'transparent' },
    summaryText: { color: accentColor },
    summaryBold: { color: accentColor, fontWeight: '700' },
  });

  const fetchBlockData = useCallback(async () => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    const fetchTxHash = txHash;
    setError(false);
    setLoading(true);
    try {
      const blockInfo = await BlueElectrum.getConfirmedBlockHeight(fetchTxHash);

      if (fetchTxHash !== activeTxHashRef.current) return;

      if (!blockInfo || blockInfo.height <= 0) {
        setError(true);
        return;
      }

      const { height: txHeight, tip } = blockInfo;
      const heights = computeBlockHeights(txHeight, tip);

      let timestamps: Record<number, number> = {};
      try {
        timestamps = await BlueElectrum.getBlockTimestamps(heights);
      } catch (e) {
        console.warn('BlocksAccordion: block timestamps fetch failed', e);
      }

      if (fetchTxHash !== activeTxHashRef.current) return;

      setConfirmedHeight(txHeight);
      setCurrentTip(tip);
      setBlocks(heights.map(h => ({ height: h, timestamp: timestamps[h] })));
    } catch (e) {
      console.warn('BlocksAccordion: failed to fetch block data', e);
      if (fetchTxHash === activeTxHashRef.current) {
        setError(true);
      }
    } finally {
      // Prevent stale requests from mutating UI/loading for a newer txHash.
      if (fetchTxHash === activeTxHashRef.current) {
        fetchStartedRef.current = false;
        setLoading(false);
      }
    }
  }, [txHash]);

  const handleRetry = useCallback(() => {
    setError(false);
    fetchBlockData();
  }, [fetchBlockData]);

  useEffect(() => {
    activeTxHashRef.current = txHash;
    fetchStartedRef.current = false;
    // Allow the new `txHash` request to start even if the previous request is still in-flight.
    // The stale request's guarded `finally` must not clear `loading`, but the new request needs a clean start.
    setLoading(false);
    setBlocks([]);
    setConfirmedHeight(null);
    setCurrentTip(null);
    setError(false);
    setMeasuredHeight(0);
  }, [txHash]);

  useEffect(() => {
    if (!isExpanded) {
      setError(false);
      return;
    }
    if (loading || fetchStartedRef.current) return;
    if (confirmedHeight !== null && blocks.length > 0) return;
    if (error) return;
    fetchBlockData();
  }, [isExpanded, loading, confirmedHeight, blocks.length, error, fetchBlockData]);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!isExpanded) return;
      const height = Math.ceil(e.nativeEvent.layout.height);
      if (height > 0) {
        setMeasuredHeight(height);
      }
    },
    [isExpanded],
  );

  useEffect(() => {
    const fallbackHeight = loading || error ? BLOCKS_HEIGHT : EXPANDED_HEIGHT_ESTIMATE;
    const target = isExpanded ? (measuredHeight > 0 ? measuredHeight : fallbackHeight) : COLLAPSED_HEIGHT;
    animatedHeight.value = withTiming(target, { duration: ANIMATION_DURATION, easing: ANIMATION_EASING });
  }, [isExpanded, measuredHeight, animatedHeight, loading, error]);

  const confirmedIndex = useMemo(() => {
    if (confirmedHeight === null) return 0;
    return blocks.findIndex(b => b.height === confirmedHeight);
  }, [blocks, confirmedHeight]);

  const containerWidth = windowWidth - STATE_CARD_MARGIN_H * 2;
  const scrollOffset = useMemo(() => {
    if (confirmedIndex <= 0) return 0;
    const itemCenter = HORIZONTAL_PADDING + confirmedIndex * ITEM_LENGTH + BLOCK_CARD_WIDTH / 2;
    return Math.max(0, itemCenter - containerWidth / 2);
  }, [confirmedIndex, containerWidth]);

  useEffect(() => {
    if (!isExpanded || blocks.length === 0 || scrollOffset === 0) return;
    const frame = requestAnimationFrame(() => {
      blocksListRef.current?.scrollToOffset({ offset: scrollOffset, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [isExpanded, blocks.length, scrollOffset]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
  }));

  const summaryContent = useMemo(() => {
    if (confirmedHeight === null || currentTip === null) return null;

    const rawBehind = currentTip - confirmedHeight;
    const isLatestBlock = rawBehind === 0;
    const blockHeight = String(confirmedHeight);
    const confirmationParts = renderBoldFormattedParts(
      isLatestBlock ? loc.transactions.blocks_confirmed_latest : loc.transactions.blocks_confirmed_summary,
      { blockHeight },
      stylesHook.summaryBold,
    );

    const hasFeeDetails = vsize != null && feeRate != null && feeSats != null;
    if (!hasFeeDetails) {
      return <Text style={[styles.summaryText, stylesHook.summaryText]}>{confirmationParts}</Text>;
    }

    const feeDisplay = `${formatBalanceWithoutSuffix(feeSats, BitcoinUnit.SATS, true)} sats`;
    const feeParts = renderBoldFormattedParts(
      loc.transactions.blocks_confirmed_fee_summary,
      {
        vsize: `${vsize} vb`,
        feeRate: `${Number(feeRate.toFixed(1))} sats/vb`,
        fee: feeDisplay,
      },
      stylesHook.summaryBold,
    );

    return (
      <Text style={[styles.summaryText, stylesHook.summaryText]}>
        {confirmationParts} {feeParts}
      </Text>
    );
  }, [confirmedHeight, currentTip, feeRate, feeSats, stylesHook.summaryBold, stylesHook.summaryText, vsize]);

  const keyExtractor = useCallback((item: BlockData) => String(item.height), []);

  const renderBlock = useCallback(
    ({ item }: ListRenderItemInfo<BlockData>) => {
      const isConfirmed = confirmedHeight !== null && item.height === confirmedHeight;
      return (
        <View style={[styles.blockCard, stylesHook.blockCardBase, isConfirmed && stylesHook.confirmedBlockCard]}>
          {isConfirmed && (
            <>
              <LottieView
                style={styles.blockLottie}
                source={txblockAnimation}
                autoPlay
                loop
                resizeMode="cover"
                colorFilters={lottieColorFilters}
              />
              <LinearGradient
                colors={blockGradientColors}
                locations={[0, 0.3]}
                start={BLOCK_GRADIENT_TOP_START}
                end={BLOCK_GRADIENT_TOP_END}
                style={styles.blockGradient}
                pointerEvents="none"
              />
              <LinearGradient
                colors={blockGradientColors}
                locations={[0.02, 0.3]}
                start={BLOCK_GRADIENT_BOTTOM_START}
                end={BLOCK_GRADIENT_BOTTOM_END}
                style={styles.blockGradient}
                pointerEvents="none"
              />
            </>
          )}
          <Text style={[styles.blockHeight, stylesHook.summaryText]}>{item.height}</Text>
          <View style={styles.blockDateContainer}>
            <Text style={[styles.blockDate, stylesHook.summaryText]}>
              {item.timestamp ? dayjs(item.timestamp * 1000).format('LT') : '-'}
            </Text>
          </View>
        </View>
      );
    },
    [
      blockGradientColors,
      confirmedHeight,
      lottieColorFilters,
      stylesHook.blockCardBase,
      stylesHook.confirmedBlockCard,
      stylesHook.summaryText,
    ],
  );

  let bodyContent: React.ReactNode;
  if (loading) {
    bodyContent = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  } else if (error) {
    bodyContent = (
      <TouchableOpacity onPress={handleRetry} activeOpacity={0.7} style={styles.errorContainer}>
        <Text style={[styles.errorText, stylesHook.summaryText]}>{loc.transactions.blocks_load_error}</Text>
      </TouchableOpacity>
    );
  } else {
    bodyContent = (
      <>
        {summaryContent && (
          <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
            <View style={styles.summaryContainer}>{summaryContent}</View>
          </TouchableOpacity>
        )}
        <FlatList
          ref={blocksListRef}
          data={blocks}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyExtractor={keyExtractor}
          renderItem={renderBlock}
          getItemLayout={getItemLayout}
          snapToInterval={ITEM_LENGTH}
          decelerationRate="fast"
          style={styles.blocksList}
        />
      </>
    );
  }

  return (
    <Animated.View style={animatedContentStyle}>
      <View onLayout={onContentLayout}>{bodyContent}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: BLOCKS_HEIGHT,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: BLOCKS_HEIGHT,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  blocksList: {
    height: BLOCKS_HEIGHT,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 8,
  },
  blockCard: {
    width: BLOCK_CARD_WIDTH,
    height: 110,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: BLOCK_CARD_GAP,
    overflow: 'hidden',
  },
  blockLottie: {
    ...StyleSheet.absoluteFill,
  },
  blockGradient: {
    ...StyleSheet.absoluteFill,
  },
  blockHeight: {
    fontSize: 15,
    fontWeight: '700',
  },
  blockDateContainer: {
    marginTop: 'auto',
  },
  blockDate: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default BlocksAccordion;
