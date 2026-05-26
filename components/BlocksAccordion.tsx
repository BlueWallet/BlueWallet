import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItemInfo, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import dayjs from 'dayjs';

import { useTheme } from './themes';
import * as BlueElectrum from '../blue_modules/BlueElectrum';

const BLOCK_COUNT = 5;
const COLLAPSED_HEIGHT = 0;
const EXPANDED_HEIGHT = 130;
const ANIMATION_DURATION = 300;
const BLOCK_CARD_WIDTH = 120;
const BLOCK_CARD_GAP = 8;
const ITEM_LENGTH = BLOCK_CARD_WIDTH + BLOCK_CARD_GAP;
const HORIZONTAL_PADDING = 8;
const STATE_CARD_MARGIN_H = 24;

interface BlocksAccordionProps {
  txHash: string;
  isSent: boolean;
  isExpanded: boolean;
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

const BlocksAccordion: React.FC<BlocksAccordionProps> = ({ txHash, isSent, isExpanded }) => {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [confirmedHeight, setConfirmedHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const contentHeight = useSharedValue(COLLAPSED_HEIGHT);

  const accentColor = isSent ? colors.transactionSentColor : colors.transactionReceivedColor;
  const borderAccent = isSent ? colors.outgoingForegroundColor : colors.incomingForegroundColor;
  const blockCardBg = isSent ? 'rgba(208, 2, 27, 0.16)' : 'rgba(55, 192, 161, 0.16)';
  const confirmedCardBg = isSent ? 'rgba(208, 2, 27, 0.08)' : 'rgba(55, 192, 161, 0.08)';

  const stylesHook = StyleSheet.create({
    blockCardBase: { backgroundColor: blockCardBg },
    confirmedBlockCard: { borderColor: borderAccent, borderWidth: 2, backgroundColor: confirmedCardBg },
    blockHeightText: { color: accentColor },
    blockDateText: { color: accentColor },
  });

  const fetchBlockData = useCallback(async () => {
    setLoading(true);
    try {
      const [txHeight, currentTip] = await Promise.all([
        BlueElectrum.getConfirmedBlockHeight(txHash),
        BlueElectrum.getCurrentBlockTip(),
      ]);

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
    if (isExpanded && blocks.length === 0) {
      fetchBlockData();
    }
  }, [isExpanded, blocks.length, fetchBlockData]);

  useEffect(() => {
    contentHeight.value = withTiming(isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT, { duration: ANIMATION_DURATION });
  }, [isExpanded, contentHeight]);

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
    height: contentHeight.value,
    opacity: contentHeight.value / EXPANDED_HEIGHT,
    overflow: 'hidden' as const,
  }));

  const keyExtractor = useCallback((item: BlockData) => String(item.height), []);

  const renderBlock = useCallback(
    ({ item }: ListRenderItemInfo<BlockData>) => {
      const isConfirmed = confirmedHeight !== null && item.height === confirmedHeight;
      return (
        <View style={[styles.blockCard, stylesHook.blockCardBase, isConfirmed && stylesHook.confirmedBlockCard]}>
          <Text style={[styles.blockHeight, stylesHook.blockHeightText]}>{item.height.toLocaleString()}</Text>
          <View style={styles.blockDateContainer}>
            <Text style={[styles.blockDate, stylesHook.blockDateText]}>
              {item.timestamp ? dayjs(item.timestamp * 1000).format('DD/MM/YYYY') : '-'}
            </Text>
          </View>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirmedHeight, accentColor, borderAccent, blockCardBg],
  );

  return (
    <Animated.View style={animatedContentStyle}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={accentColor} />
        </View>
      ) : (
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
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: EXPANDED_HEIGHT,
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
  },
  blockHeight: {
    fontSize: 17,
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
