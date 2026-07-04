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

interface BlocksAccordionProps {
  txHash: string;
  isSent: boolean;
  isExpanded: boolean;
  confirmations: number;
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

const BlocksAccordion: React.FC<BlocksAccordionProps> = ({
  txHash,
  isSent,
  isExpanded,
  confirmations,
  vsize,
  feeSats,
  feeRate,
  onPress,
}) => {
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [confirmedHeight, setConfirmedHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const animatedHeight = useSharedValue(COLLAPSED_HEIGHT);
  const fetchStartedRef = useRef(false);

  const accentColor = isSent ? colors.transactionSentColor : colors.transactionReceivedColor;
  const borderAccent = isSent ? colors.outgoingForegroundColor : colors.incomingForegroundColor;
  const blockCardBg = isSent ? 'rgba(208, 2, 27, 0.16)' : 'rgba(30, 138, 106, 0.16)';

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
    setLoading(true);
    try {
      const [txHeight, currentTip] = await Promise.all([BlueElectrum.getConfirmedBlockHeight(txHash), BlueElectrum.getCurrentBlockTip()]);

      if (!txHeight || txHeight <= 0) {
        setLoading(false);
        return;
      }

      setConfirmedHeight(txHeight);

      const distance = currentTip - txHeight;
      let startHeight = txHeight - 2;
      if (distance < 2) {
        startHeight = currentTip - (BLOCK_COUNT - 1);
      }
      const heights = Array.from({ length: BLOCK_COUNT }, (_, i) => startHeight + i);

      const timestamps = await BlueElectrum.getBlockTimestamps(heights);
      setBlocks(heights.map(h => ({ height: h, timestamp: timestamps[h] })));
    } catch (e) {
      console.warn('BlocksAccordion: failed to fetch block data', e);
    } finally {
      setLoading(false);
    }
  }, [txHash]);

  useEffect(() => {
    fetchStartedRef.current = false;
    setBlocks([]);
    setConfirmedHeight(null);
    setMeasuredHeight(0);
  }, [txHash]);

  useEffect(() => {
    fetchBlockData();
  }, [fetchBlockData]);

  const onMeasureLayout = useCallback((e: LayoutChangeEvent) => {
    const height = Math.ceil(e.nativeEvent.layout.height);
    if (height > 0) {
      setMeasuredHeight(height);
    }
  }, []);

  useEffect(() => {
    const target = isExpanded ? (measuredHeight > 0 ? measuredHeight : BLOCKS_HEIGHT) : COLLAPSED_HEIGHT;
    animatedHeight.value = withTiming(target, { duration: ANIMATION_DURATION, easing: ANIMATION_EASING });
  }, [isExpanded, measuredHeight, animatedHeight]);

  const confirmedIndex = useMemo(() => {
    if (confirmedHeight === null) return 0;
    return blocks.findIndex(b => b.height === confirmedHeight);
  }, [blocks, confirmedHeight]);

  const containerWidth = windowWidth - STATE_CARD_MARGIN_H * 2;
  const initialOffset = useMemo(() => {
    if (confirmedIndex <= 0) return 0;
    const itemCenter = HORIZONTAL_PADDING + confirmedIndex * ITEM_LENGTH + BLOCK_CARD_WIDTH / 2;
    return Math.max(0, itemCenter - containerWidth / 2);
  }, [confirmedIndex, containerWidth]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
  }));

  const blocksAgoText = useMemo(() => {
    const blocksAgo = Math.max(0, confirmations - 1);
    if (blocksAgo === 1) {
      return loc.transactions.block_ago;
    }
    return loc.formatString(loc.transactions.blocks_ago, { count: String(blocksAgo) });
  }, [confirmations]);

  const summaryContent = useMemo(() => {
    if (confirmedHeight === null) return null;

    const confirmationParts = renderBoldFormattedParts(
      loc.transactions.blocks_confirmed_summary,
      {
        blocksAgo: blocksAgoText,
        blockHeight: String(confirmedHeight),
      },
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
  }, [blocksAgoText, confirmedHeight, feeRate, feeSats, stylesHook.summaryBold, stylesHook.summaryText, vsize]);

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
              {item.timestamp ? dayjs(item.timestamp * 1000).format('DD/MM/YYYY') : '-'}
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

  const measureContent = loading ? (
    <View style={styles.loadingContainer} />
  ) : (
    <>
      {summaryContent && <View style={styles.summaryContainer}>{summaryContent}</View>}
      <View style={styles.blocksList} />
    </>
  );

  const visibleContent = loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={accentColor} />
    </View>
  ) : (
    <>
      {summaryContent && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
          <View style={styles.summaryContainer}>{summaryContent}</View>
        </TouchableOpacity>
      )}
      <FlatList
        data={blocks}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyExtractor={keyExtractor}
        renderItem={renderBlock}
        getItemLayout={getItemLayout}
        contentOffset={{ x: initialOffset, y: 0 }}
        snapToInterval={ITEM_LENGTH}
        decelerationRate="fast"
        style={styles.blocksList}
      />
    </>
  );

  return (
    <>
      <View style={styles.measureLayer} onLayout={onMeasureLayout} pointerEvents="none">
        {measureContent}
      </View>
      <Animated.View style={animatedContentStyle}>{visibleContent}</Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  measureLayer: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    zIndex: -1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: BLOCKS_HEIGHT,
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
