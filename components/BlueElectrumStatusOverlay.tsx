import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectMain as forceConnect, electrumEventEmitter } from '../blue_modules/BlueElectrum';
import PressableButton from './PressableButton';
import { UnifiedStatus } from './UnifiedStatus';
import { getLatestBlockInfo, startBlockchairPolling, getBlockchairStatus } from '../services/blockchair-api';
import { useStorage } from '../hooks/context/useStorage';
import { useNavigation } from '@react-navigation/native';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const fullContainerWidth = 320;
const fullContainerHeight = windowHeight * 0.45;

// Update BlockInfo interface to match BlockData from BlueElectrum
interface BlockInfo {
  height: number;
  time: number;
  timestamp?: number;
  confirmations?: number;
}

interface PanPosition {
  x: number;
  y: number;
}

const snapToCorner = ({ x, y }: PanPosition): PanPosition => {
  const edgeThreshold = 60;
  const centerX = (windowWidth - fullContainerWidth) / 2;
  const maxY = windowHeight - fullContainerHeight - 20;

  if (x < edgeThreshold) {
    return { x: 20, y: y < edgeThreshold ? 20 : Math.min(y, maxY) };
  }
  if (x > windowWidth - fullContainerWidth - edgeThreshold) {
    return { x: windowWidth - fullContainerWidth - 20, y: y < edgeThreshold ? 20 : Math.min(y, maxY) };
  }
  if (y < edgeThreshold) return { x: centerX, y: 20 };
  if (y > maxY - edgeThreshold) return { x: centerX, y: maxY };

  return { x: x < windowWidth / 2 ? 20 : windowWidth - fullContainerWidth - 20, y: Math.min(y, maxY) };
};

const BlueElectrumStatusOverlay: React.FC = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(true);
  const [lastBlock, setLastBlock] = useState<BlockInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [blockchairData, setBlockchairData] = useState(getBlockchairStatus());
  const { walletUpdates } = useStorage();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 3000; // 3 seconds
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Combine Blockchair states
  const [blockchairState, setBlockchairState] = useState({
    status: 'Connecting...',
    error: null as string | null,
  });

  // Use single Animated.ValueXY for all animations
  const animatedValues = useRef(
    new Animated.ValueXY({
      x: (windowWidth - fullContainerWidth) / 2,
      y: (windowHeight - fullContainerHeight) / 2,
    }),
  ).current;

  // Add opacity as a regular Animated.Value
  const opacity = useRef(new Animated.Value(1)).current;

  const startBlinking = useCallback(() => {
    // Use JS driver for all animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [opacity]);

  const stopBlinking = useCallback(() => {
    opacity.stopAnimation();
    opacity.setValue(1);
  }, [opacity]);

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const updateBlockchair = async () => {
    try {
      const blockInfo = await getLatestBlockInfo();
      if (!mountedRef.current) return;

      if (blockInfo) {
        setBlockchairState({
          status: 'Connected',
          error: null,
        });
        setLastBlock(blockInfo);
        setLastUpdateTime(new Date().toLocaleTimeString());
        retryCountRef.current = 0;
      } else {
        throw new Error('No block data received');
      }
    } catch (error) {
      if (!mountedRef.current) return;

      console.error('Blockchair update failed:', error);
      setBlockchairState({
        status: 'Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
        clearRetryTimeout();
        retryTimeoutRef.current = setTimeout(updateBlockchair, delay);
      }
    }
  };

  // Animation and pan handling
  const panCurrent = useRef<PanPosition>({ x: 0, y: 0 });

  // Update pan responder to use JS animations
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const position = {
          x: animatedValues.x.__getValue(),
          y: animatedValues.y.__getValue(),
        };
        animatedValues.setOffset(position);
        animatedValues.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: animatedValues.x, dy: animatedValues.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        animatedValues.flattenOffset();
        const position = {
          x: animatedValues.x.__getValue(),
          y: animatedValues.y.__getValue(),
        };
        const target = snapToCorner(position);

        Animated.spring(animatedValues, {
          toValue: target,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  // Setup listeners
  useEffect(() => {
    const panListener = animatedValues.addListener(value => {
      panCurrent.current = value;
    });

    return () => {
      animatedValues.removeListener(panListener);
    };
  }, [animatedValues]);

  const handleForceRefresh = async () => {
    setIsProcessing(true);
    startBlinking();

    // Start a timeout to revert button if no updates occur
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
      stopBlinking();
    }, 10000); // Revert after 10 seconds if no updates

    await forceConnect();
  };

  // Setup block subscription listener
  useEffect(() => {
    const blockHandler = (block: BlockInfo) => {
      // Clear the timeout since we got an update
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      setIsProcessing(true);
      startBlinking();
      setLastBlock({
        ...block,
        timestamp: Math.floor(Date.now() / 1000),
      });
      setLastUpdateTime(new Date().toLocaleString());
      setConnectionStatus('Connected');

      // Keep processing state for 2 seconds after update
      setTimeout(() => {
        setIsProcessing(false);
        stopBlinking();
      }, 2000);
    };

    electrumEventEmitter.addListener('block', blockHandler);
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      electrumEventEmitter.removeListener('block', blockHandler);
    };
  }, [startBlinking, stopBlinking]);

  // Setup Blockchair polling separately
  useEffect(() => {
    mountedRef.current = true;
    const pollInterval = setInterval(updateBlockchair, 120000);

    // Initial fetch
    updateBlockchair();
    return () => {
      mountedRef.current = false;
      clearInterval(pollInterval);
      clearRetryTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup Blockchair polling
  useEffect(() => {
    const intervalId = startBlockchairPolling();
    const updateTimer = setInterval(() => {
      setBlockchairData(getBlockchairStatus());
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(updateTimer);
    };
  }, []);

  if (!visible) {
    return (
      <SafeAreaView style={styles.safeContainer} pointerEvents="box-none">
        <PressableButton onPress={() => setVisible(true)} text="Show Status" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX: animatedValues.x }, { translateY: animatedValues.y }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
        pointerEvents="auto"
      >
        <UnifiedStatus
          serverProps={{
            blueStatus: connectionStatus,
            blockHeight: lastBlock?.height ?? 'N/A',
            blockTime: lastBlock?.time ?? 'N/A',
            isSubscribed: !!lastBlock,
          }}
          webhookProps={{
            blockchairStatus: blockchairState.status,
            lastBlock: {
              height: blockchairData.latestBlock?.height ?? 'N/A',
              time: blockchairData.lastUpdate,
            },
            error: blockchairState.error,
          }}
          storageProps={{
            lastStorageBlock: lastBlock?.height ?? 'N/A',
            storageUpdated: lastUpdateTime,
            updatedWallets: walletUpdates,
          }}
          lastUpdateTimestamp={lastUpdateTime}
        />
        <PressableButton
          onPress={handleForceRefresh}
          text={isProcessing ? 'Updating...' : 'Force Refresh'}
          disabled={isProcessing}
          style={isProcessing ? styles.processingButton : styles.refreshButton}
        />
        <PressableButton onPress={() => setVisible(false)} text="Hide" style={styles.hideButton} textStyle={styles.hideButtonText} />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    position: 'absolute',
    width: '100%',
    height: '70%',
    marginVertical: 10,
    pointerEvents: 'box-none',
  },
  container: {
    position: 'absolute',
    width: fullContainerWidth,
    height: fullContainerHeight,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
  },
  hideButton: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  hideButtonText: {
    color: 'blue',
    fontSize: 13,
  },
  processingButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  refreshButton: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
  },
});

export default BlueElectrumStatusOverlay;
