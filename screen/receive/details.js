import { useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  InteractionManager,
  LayoutAnimation,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Easing,
} from 'react-native';
import Share from 'react-native-share';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import AmountInput from '../../components/AmountInput';
import BottomModal from '../../components/BottomModal';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useTheme } from '../../components/themes';
import { TransactionPendingIconBig } from '../../components/TransactionPendingIconBig';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { SuccessView } from '../send/success';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import SegmentedControl from '../../components/SegmentControl';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import { useSettings } from '../../hooks/context/useSettings';
import { tryToObtainPermissions, majorTomToGroundControl } from '../../blue_modules/notifications';
import TipBox from '../../components/TipBox';
import { useAddressMonitor } from '../../hooks/useAddressMonitor';
import Clipboard from '@react-native-clipboard/clipboard';
import { Icon } from '@rneui/base';

// Define transaction status types
const TX_STATUS = {
  ADDRESS: 'ADDRESS',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  LOADING: 'LOADING',
};

const segmentControlValues = [loc.wallets.details_address, loc.bip47.payment_code];

// Component to display transaction status based on its state
const TransactionStatusDisplay = ({ status, transactions, activeTxIndex, setActiveTxIndex, customLabel, stylesHook }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const content = useMemo(() => {
    switch (status) {
      case TX_STATUS.PENDING:
        if (transactions.length > 1) {
          return (
            <PendingTransactionsView
              transactions={transactions}
              activeTxIndex={activeTxIndex}
              setActiveTxIndex={setActiveTxIndex}
              stylesHook={stylesHook}
            />
          );
        } else {
          return <PendingTransactionView data={transactions[0]} customLabel={customLabel} stylesHook={stylesHook} />;
        }
      case TX_STATUS.CONFIRMED:
        return <ConfirmedTransactionView data={transactions[0]} customLabel={customLabel} stylesHook={stylesHook} />;
      case TX_STATUS.LOADING:
        return <BlueLoading />;
      default:
        return null;
    }
  }, [status, transactions, activeTxIndex, setActiveTxIndex, customLabel, stylesHook]);

  return (
    <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
      {customLabel && status !== TX_STATUS.LOADING && transactions.length <= 1 && (
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {customLabel}
        </BlueText>
      )}
      {content}
    </Animated.View>
  );
};

// Component for displaying pending transactions
const PendingTransactionView = ({ data, customLabel, stylesHook }) => {
  const { displayBalance, eta } = data;

  // Add animation for the icon
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create gentle pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Create very subtle rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [iconScale, iconRotation]);

  const rotateInterpolation = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  return (
    <View style={styles.pendingTxContainer}>
      {customLabel && (
        <BlueText style={[styles.label, stylesHook.label, styles.customLabelText]} numberOfLines={1}>
          {customLabel}
        </BlueText>
      )}
      <Animated.View
        style={[
          styles.pendingIconContainer,
          {
            transform: [{ scale: iconScale }, { rotate: rotateInterpolation }],
          },
        ]}
      >
        <TransactionPendingIconBig />
      </Animated.View>
      <BlueText style={[styles.pendingTxAmount, stylesHook.label]} numberOfLines={2}>
        {displayBalance}
      </BlueText>
      {eta && (
        <BlueText style={[styles.pendingTxEta, stylesHook.label]} numberOfLines={1}>
          {eta}
        </BlueText>
      )}
    </View>
  );
};

// Component for displaying confirmed transactions
const ConfirmedTransactionView = ({ data, customLabel, stylesHook }) => {
  const { displayBalance } = data;
  return (
    <View style={styles.scrollBody}>
      {customLabel && (
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

// Component for displaying address details and QR code
const AddressDetailsView = ({ isCustom, getDisplayAmount, customLabel, stylesHook, bip21encoded, address }) => {
  return (
    <View style={styles.scrollBody}>
      {isCustom && (
        <>
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
        </>
      )}

      <QRCodeComponent value={bip21encoded} />
      <CopyTextToClipboard text={isCustom ? bip21encoded : address} />
    </View>
  );
};

// Component for displaying a single transaction item in the horizontal list
const TransactionItem = ({ data, isActive, stylesHook }) => {
  const { displayBalance, eta, txHash } = data;
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.9)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.7)).current;

  // Add specific scale animation for the icon
  const iconScale = useRef(new Animated.Value(isActive ? 1.1 : 0.85)).current;
  const iconRotate = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    // Animate both the card and the icon when active state changes
    Animated.parallel([
      // Card animations
      Animated.timing(scale, {
        toValue: isActive ? 1 : 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1 : 0.7,
        duration: 300,
        useNativeDriver: true,
      }),
      // Icon animations
      Animated.timing(iconScale, {
        toValue: isActive ? 1.1 : 0.85,
        duration: 350, // Slightly longer for more noticeable effect
        useNativeDriver: true,
      }),
      Animated.timing(iconRotate, {
        toValue: isActive ? 1 : 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, scale, opacity, iconScale, iconRotate]);

  // Create a rotation interpolation for a subtle spin effect
  const spinDegrees = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.transactionItem, 
        { 
          transform: [{ scale }], 
          opacity,
          backgroundColor: colors.elevated, // Add solid background to fix shadow warning
        }
      ]}>
      <View style={styles.transactionContent}>
        <Animated.View
          style={[
            styles.txIconContainer,
            {
              transform: [{ scale: iconScale }, { rotate: spinDegrees }],
              backgroundColor: colors.background, // Add solid background to fix shadow warning
            },
          ]}
        >
          <TransactionPendingIconBig />
        </Animated.View>
        <BlueText style={[styles.transactionText, stylesHook.label]} numberOfLines={2}>
          {displayBalance}
        </BlueText>
        {eta && (
          <BlueText style={[styles.transactionEta, stylesHook.label]} numberOfLines={1}>
            {eta}
          </BlueText>
        )}
        <BlueText style={styles.transactionHash} numberOfLines={1}>
          {txHash.substring(0, 8)}...{txHash.substring(txHash.length - 8)}
        </BlueText>
      </View>
    </Animated.View>
  );
};

// Improved PendingTransactionsView component with better pagination dots
const PendingTransactionsView = ({ transactions, activeTxIndex, setActiveTxIndex, stylesHook }) => {
  const flatListRef = useRef(null);
  const { colors } = useTheme();
  const initialScrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const lastScrollPosition = useRef(0);
  const dotsScrollViewRef = useRef(null);
  
  // Animation values for dots container
  const dotsTranslateX = useRef(new Animated.Value(0)).current;

  // Item dimensions for accurate calculation
  const itemWidth = 280;
  const itemMargin = 10;
  const itemFullWidth = itemWidth + itemMargin * 2;

  // For pagination dots
  const MAX_VISIBLE_DOTS = 7; // Maximum number of dots to show at once
  const DOT_WIDTH = 16; // Width of each dot + margin

  // Generate snap offsets for better positioning
  const snapOffsets = useMemo(() => {
    return transactions.map((_, index) => index * itemFullWidth);
  }, [transactions, itemFullWidth]);

  // Calculate visible dots range
  const getVisibleDotsRange = useCallback(() => {
    const totalDots = transactions.length;
    
    // If we have fewer dots than the max, show all
    if (totalDots <= MAX_VISIBLE_DOTS) {
      return { start: 0, end: totalDots - 1 };
    }
    
    // Calculate the visible range centered around the active dot
    const halfVisible = Math.floor(MAX_VISIBLE_DOTS / 2);
    let start = activeTxIndex - halfVisible;
    let end = activeTxIndex + halfVisible;
    
    // Adjust if we're near the edges
    if (start < 0) {
      end += Math.abs(start);
      start = 0;
    }
    
    if (end >= totalDots) {
      start = Math.max(0, start - (end - totalDots + 1));
      end = totalDots - 1;
    }
    
    return { start, end };
  }, [activeTxIndex, transactions.length]);

  // When active index changes, scroll to make that item visible
  useEffect(() => {
    if (flatListRef.current && transactions.length > 1 && !isScrollingRef.current) {
      flatListRef.current.scrollToIndex({
        index: activeTxIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
    
    // Animate dots to keep active dot visible
    if (transactions.length > MAX_VISIBLE_DOTS) {
      const { start } = getVisibleDotsRange();
      Animated.timing(dotsTranslateX, {
        toValue: -start * DOT_WIDTH,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [activeTxIndex, transactions.length, getVisibleDotsRange, dotsTranslateX]);

  return (
    <View style={styles.multiTxContainer}>
      <BlueText style={[styles.pendingTxTitle, stylesHook.label]}>
        {loc.formatString(loc.receive.pending_transactions, { count: transactions.length })}
      </BlueText>

      <FlatList
        ref={flatListRef}
        data={transactions}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => <TransactionItem data={item} isActive={index === activeTxIndex} stylesHook={stylesHook} />}
        keyExtractor={item => item.txHash}
        contentContainerStyle={styles.transactionsList}
        snapToOffsets={snapOffsets}
        snapToAlignment="center"
        decelerationRate={0.85}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        directionalLockEnabled={true}
        disableIntervalMomentum={false}
        snapToStart={false}
        snapToEnd={false}
        onScrollBeginDrag={e => {
          isScrollingRef.current = true;
          initialScrollRef.current = e.nativeEvent.contentOffset.x;
          lastScrollPosition.current = e.nativeEvent.contentOffset.x;
        }}
        onScroll={e => {
          lastScrollPosition.current = e.nativeEvent.contentOffset.x;
        }}
        onScrollEndDrag={e => {
          const minSwipeDistance = 10; // Minimum pixels to consider as a swipe
          const contentOffset = e.nativeEvent.contentOffset.x;
          
          // Calculate distance moved since drag start
          const distanceMoved = Math.abs(contentOffset - initialScrollRef.current);
          
          if (distanceMoved < minSwipeDistance) {
            // This was a tap or very small movement, don't change active index
            // Snap back to the active item
            flatListRef.current?.scrollToIndex({
              index: activeTxIndex,
              animated: true,
              viewPosition: 0.5,
            });
            isScrollingRef.current = false;
            return;
          }
          
          // For small swipes that don't trigger momentum, calculate the new active index here
          // Only process if onMomentumScrollEnd won't be called
          if (Math.abs(e.nativeEvent.velocity.x) < 0.1) {
            const viewWidth = e.nativeEvent.layoutMeasurement.width;
            const centerOfViewport = contentOffset + viewWidth / 2;
            const newIndex = Math.round(centerOfViewport / itemFullWidth);
            const safeIndex = Math.min(Math.max(0, newIndex), transactions.length - 1);
            
            if (safeIndex !== activeTxIndex) {
              setActiveTxIndex(safeIndex);
            }
            
            // Ensure it snaps properly when released with low velocity
            flatListRef.current?.scrollToIndex({
              index: safeIndex,
              animated: true,
              viewPosition: 0.5,
            });
            
            // Reset scrolling after a short delay to ensure the scroll completes
            setTimeout(() => {
              isScrollingRef.current = false;
            }, 300);
          }
        }}
        onMomentumScrollEnd={e => {
          isScrollingRef.current = false;
          
          const contentOffset = e.nativeEvent.contentOffset.x;
          const viewWidth = e.nativeEvent.layoutMeasurement.width;
          
          // Calculate center position and corresponding item index
          const centerOfViewport = contentOffset + viewWidth / 2;
          const newIndex = Math.round(centerOfViewport / itemFullWidth);
          const safeIndex = Math.min(Math.max(0, newIndex), transactions.length - 1);
          
          if (safeIndex !== activeTxIndex) {
            setActiveTxIndex(safeIndex);
          }
          
          // Ensure it snaps perfectly
          flatListRef.current?.scrollToIndex({
            index: safeIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }}
        onScrollToIndexFailed={info => {
          console.log('Scroll to index failed:', info);
          setTimeout(() => {
            if (transactions.length > 0 && flatListRef.current) {
              flatListRef.current.scrollToOffset({
                offset: Math.min(info.index, transactions.length - 1) * itemFullWidth,
                animated: false,
              });
            }
          }, 100);
        }}
      />

      {/* Navigation buttons for easier control */}
      {transactions.length > 1 && (
        <View style={styles.navigationButtonsContainer}>
          <Button
            title="←"
            onPress={() => {
              if (activeTxIndex > 0) {
                setActiveTxIndex(activeTxIndex - 1);
              }
            }}
            disabled={activeTxIndex === 0}
            style={[
              styles.navButton,
              activeTxIndex === 0 ? styles.navButtonDisabled : null,
              { backgroundColor: activeTxIndex === 0 ? colors.lightButton : colors.buttonBackgroundColor },
            ]}
          />
          
          {/* Improved pagination dots */}
          <View style={styles.paginationDotsContainer}>
            <ScrollView
              ref={dotsScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.paginationDotsScrollContent}
            >
              <Animated.View 
                style={[
                  styles.dotsAnimatedContainer, 
                  { transform: [{ translateX: dotsTranslateX }] }
                ]}
              >
                {transactions.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setActiveTxIndex(index);
                      flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.5,
                      });
                    }}
                    accessible={true}
                    accessibilityLabel={`Page ${index + 1} of ${transactions.length}`}
                    accessibilityRole="button"
                    style={styles.paginationDotTouchable}
                  >
                    <Animated.View
                      style={[
                        styles.paginationDot,
                        index === activeTxIndex && styles.activePaginationDot,
                        {
                          backgroundColor: index === activeTxIndex ? colors.foregroundColor : colors.buttonDisabledBackgroundColor,
                          transform: [{ scale: index === activeTxIndex ? 1 : 0.8 }],
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </Animated.View>
            </ScrollView>
          </View>
          
          <Button
            title="→"
            onPress={() => {
              if (activeTxIndex < transactions.length - 1) {
                setActiveTxIndex(activeTxIndex + 1);
              }
            }}
            disabled={activeTxIndex === transactions.length - 1}
            style={[
              styles.navButton,
              activeTxIndex === transactions.length - 1 ? styles.navButtonDisabled : null,
              { backgroundColor: activeTxIndex === transactions.length - 1 ? colors.lightButton : colors.buttonBackgroundColor },
            ]}
          />
        </View>
      )}
    </View>
  );
};

// Custom hook to manage transaction status - strictly ONLY for unconfirmed transactions
const useTransactionStatus = (address, balance, txEstimate, mempool, initialState = TX_STATUS.LOADING) => {
  const { fetchAndSaveWalletTransactions } = useStorage();
  const [txStatus, setTxStatus] = useState(initialState);
  const [unconfirmedTxs, setUnconfirmedTxs] = useState([]);
  const [activeTxIndex, setActiveTxIndex] = useState(0);
  
  // Animation state trackers
  const isAnimating = useRef(false);
  const animationQueue = useRef([]);
  const animationTimeoutRef = useRef(null);

  // Enhanced function to safely run layout animation without conflicts
  const safelyRunAnimation = useCallback((animationConfig, callback) => {
    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    if (isAnimating.current) {
      // Queue the animation for later
      animationQueue.current.push({ config: animationConfig, callback });
      return;
    }
    
    isAnimating.current = true;
    
    // Small delay to prevent overlapping animations
    animationTimeoutRef.current = setTimeout(() => {
      LayoutAnimation.configureNext(
        {
          ...animationConfig,
          duration: Math.max(animationConfig.duration || 300, 300),
        },
        () => {
          isAnimating.current = false;
          
          // Run callback if provided
          if (callback) callback();
          
          // Small delay before processing next animation in queue
          setTimeout(() => {
            if (animationQueue.current.length > 0) {
              const next = animationQueue.current.shift();
              safelyRunAnimation(next.config, next.callback);
            }
          }, 100);
        }
      );
    }, 50);
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Track ONLY incoming transactions with exactly 0 confirmations from mempool
  useEffect(() => {
    // Case 1: We have unconfirmed incoming transactions in mempool
    if (mempool && mempool.length > 0 && balance?.unconfirmed > 0) {
      // Check specifically for positive unconfirmed balance (incoming)
      // Create transaction objects for all incoming unconfirmed transactions
      const incomingTxs = mempool
        .filter(tx => tx.height === 0) // Only unconfirmed txs
        .map(tx => {
          // Calculate how much this specific tx contributes to the balance
          // In a real app we would calculate this more precisely
          const txAmount = balance.unconfirmed / mempool.length; // Simple approximation

          return {
            tx,
            txHash: tx.tx_hash,
            displayBalance: loc.formatString(loc.transactions.pending_with_amount, {
              amt1: formatBalance(Math.abs(txAmount), BitcoinUnit.LOCAL_CURRENCY, true).toString(),
              amt2: formatBalance(Math.abs(txAmount), BitcoinUnit.BTC, true).toString(),
            }),
            eta: txEstimate?.eta || '',
          };
        });

      if (incomingTxs.length > 0) {
        console.log(`[useTransactionStatus] Found ${incomingTxs.length} unconfirmed incoming transactions`);

        // Check if we have new transactions that weren't in our list before
        const currentHashes = new Set(unconfirmedTxs.map(tx => tx.txHash));
        const newTxs = incomingTxs.filter(tx => !currentHashes.has(tx.txHash));

        if (newTxs.length > 0 || unconfirmedTxs.length === 0) {
          // Use our safe animation function
          safelyRunAnimation({
            duration: 500,
            update: { type: 'spring', springDamping: 0.7 },
            create: { type: 'spring', property: 'opacity', springDamping: 0.7 },
            delete: { type: 'spring', property: 'opacity', springDamping: 0.7 },
          }, () => {
            // Add new transactions to our list
            setUnconfirmedTxs(incomingTxs);
            setTxStatus(TX_STATUS.PENDING);
            triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
          });
        }
      }
    }
    // Case 2: No unconfirmed balance but we were previously tracking unconfirmed txs
    else if (balance && balance.unconfirmed === 0 && unconfirmedTxs.length > 0) {
      console.log(`[useTransactionStatus] Transactions confirmed or removed from mempool`);

      // Use our safe animation function
      safelyRunAnimation({
        duration: 700,
        update: { type: 'spring', springDamping: 0.6 },
        create: { type: 'spring', property: 'opacity', springDamping: 0.6 },
      }, () => {
        // All transactions confirmed or dropped from mempool
        setTxStatus(TX_STATUS.CONFIRMED);

        const confirmedTx = {
          displayBalance: loc.formatString(loc.transactions.received_with_amount, {
            amt1: formatBalance(balance.confirmed, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
            amt2: formatBalance(balance.confirmed, BitcoinUnit.BTC, true).toString(),
          }),
          txHash: unconfirmedTxs[0].txHash, // Use the hash of the first transaction
        };

        setUnconfirmedTxs([confirmedTx]);
        setActiveTxIndex(0);

        fetchAndSaveWalletTransactions(address);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);

        // Reset after confirmation - return to address view after a delay
        setTimeout(() => {
          console.log('[useTransactionStatus] Resetting transaction status after confirmation');

          // Use our safe animation function
          safelyRunAnimation({
            duration: 500,
            update: { type: 'easeInEaseOut' },
          }, () => {
            setTxStatus(TX_STATUS.ADDRESS);
            setUnconfirmedTxs([]);
          });
        }, 10000); // Reset after 10 seconds
      });
    }
    // Case 3: Initial loading completed
    else if (txStatus === TX_STATUS.LOADING) {
      setTxStatus(TX_STATUS.ADDRESS);
    }
    // Case 4: No unconfirmed transactions at all but we somehow still show pending
    else if (balance && balance.unconfirmed === 0 && txStatus === TX_STATUS.PENDING) {
      console.log('[useTransactionStatus] No unconfirmed transactions, resetting to address view');
      setTxStatus(TX_STATUS.ADDRESS);
      setUnconfirmedTxs([]);
    }
    // Case 5: We have outgoing transactions (negative unconfirmed balance) - ignore them
    else if (balance && balance.unconfirmed < 0 && txStatus === TX_STATUS.PENDING) {
      console.log('[useTransactionStatus] Outgoing transaction detected, ignoring');
      setTxStatus(TX_STATUS.ADDRESS);
      setUnconfirmedTxs([]);
    }
  }, [balance, mempool, txEstimate, fetchAndSaveWalletTransactions, address, txStatus, unconfirmedTxs, safelyRunAnimation]);

  return {
    status: txStatus,
    setStatus: setTxStatus,
    transactions: unconfirmedTxs,
    activeTxIndex,
    setActiveTxIndex,
  };
};

const ReceiveDetails = () => {
  const { walletID, address } = useRoute().params;
  const { wallets, saveToDisk, sleep } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [tempCustomLabel, setTempCustomLabel] = useState('');
  const [tempCustomAmount, setTempCustomAmount] = useState('');
  const [tempCustomUnit, setTempCustomUnit] = useState(BitcoinUnit.BTC);
  const [currentTab, setCurrentTab] = useState(segmentControlValues[0]);
  const [currentAddress, setCurrentAddress] = useState(address);
  const { goBack, setParams, setOptions } = useExtendedNavigation();
  const bottomModalRef = useRef(null);
  const { colors } = useTheme();
  const { selectedBlockExplorer } = useSettings();

  // Set a higher transaction limit for addresses that might have many transactions
  const maxTransactions = 500; // We can adjust this based on device capabilities

  // Use our hook to monitor the address with the maximum transaction limit
  const { balance, isLoading, txEstimate, mempool, tooManyTransactions, serverBusy, historyLimited, refresh, isStaleData } =
    useAddressMonitor(currentAddress, { maxTransactions });

  // Use our custom hook to manage transaction status of recent transactions
  const {
    status: txStatus,
    setStatus: setTxStatus,
    transactions: pendingTransactions,
    activeTxIndex,
    setActiveTxIndex,
  } = useTransactionStatus(currentAddress, balance, txEstimate, mempool, isLoading ? TX_STATUS.LOADING : TX_STATUS.ADDRESS);

  const stylesHook = StyleSheet.create({
    customAmount: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    customAmountText: {
      color: colors.foregroundColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    amount: {
      color: colors.foregroundColor,
    },
    label: {
      color: colors.foregroundColor,
    },
    modalButton: {
      backgroundColor: colors.modalButton,
    },
  });

  const setAddressBIP21Encoded = useCallback(
    addr => {
      const newBip21encoded = DeeplinkSchemaMatch.bip21encode(addr);
      setParams({ address: addr });
      setBip21encoded(newBip21encoded);
      setCurrentAddress(addr);
      setTxStatus(TX_STATUS.ADDRESS);
    },
    [setParams, setTxStatus],
  );

  const obtainWalletAddress = useCallback(async () => {
    // ...existing code...
    console.debug('receive/details - componentDidMount');
    let newAddress;
    if (address) {
      setAddressBIP21Encoded(address);
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([address], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
    } else {
      if (wallet.chain === Chain.ONCHAIN) {
        try {
          if (!isElectrumDisabled) newAddress = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        } catch (error) {
          console.warn('Error fetching wallet address (ONCHAIN):', error);
        }
        if (newAddress === undefined) {
          console.warn('either sleep expired or getAddressAsync threw an exception');
          newAddress = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
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
      setAddressBIP21Encoded(newAddress);
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([newAddress], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
    }
  }, [saveToDisk, address, setAddressBIP21Encoded, isElectrumDisabled, sleep, wallet]);

  // BIP47 payment code setup
  const onEnablePaymentsCodeSwitchValue = useCallback(() => {
    if (wallet.allowBIP47()) {
      wallet.switchBIP47(!wallet.isBIP47Enabled());
    }
    saveToDisk();
    obtainWalletAddress();
  }, [wallet, saveToDisk, obtainWalletAddress]);

  const isBIP47Enabled = wallet?.isBIP47Enabled();
  const toolTipActions = useMemo(() => {
    const actions = [];

    // Only show transaction actions when there's a pending transaction with 0 confirmations
    if (txStatus === TX_STATUS.PENDING && pendingTransactions.length > 0) {
      // Get the active transaction from pendingTransactions array
      const activeTx = pendingTransactions[activeTxIndex];

      // Return a single action with subactions for transaction menu
      return [
        {
          id: 'transaction_menu',
          text: loc.transactions.details_title,
          displayInline: true,
          subactions: [
            CommonToolTipActions.OpenInBlockExplorer,
            CommonToolTipActions.CopyBlockExplorerLink,
            {
              ...CommonToolTipActions.CopyTXID,
              subtitle:
                activeTx.txHash.length > 20
                  ? activeTx.txHash.substring(0, 10) + '...' + activeTx.txHash.substring(activeTx.txHash.length - 10)
                  : activeTx.txHash,
            },
          ],
        },
      ];
    }

    // Add BIP47 Payment code toggle action
    if (wallet?.allowBIP47()) {
      const action = { ...CommonToolTipActions.PaymentsCode };
      action.menuState = isBIP47Enabled;
      actions.push(action);
    }

    return actions;
  }, [txStatus, pendingTransactions, activeTxIndex, wallet, isBIP47Enabled]);

  const onPressMenuItem = useCallback(
    id => {
      if (id === CommonToolTipActions.OpenInBlockExplorer.id) {
        openTransactionInBlockExplorer();
      } else if (id === CommonToolTipActions.CopyBlockExplorerLink.id) {
        copyBlockExplorerLink();
      } else if (id === CommonToolTipActions.CopyTXID.id) {
        copyTXID();
      } else if (id === CommonToolTipActions.PaymentsCode.id) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onEnablePaymentsCodeSwitchValue();
      }
    },
    [openTransactionInBlockExplorer, copyBlockExplorerLink, copyTXID, onEnablePaymentsCodeSwitchValue],
  );

  // Function to copy transaction ID to clipboard
  const copyTXID = useCallback(() => {
    if (pendingTransactions.length === 0 || !pendingTransactions[activeTxIndex]?.txHash) return;
    Clipboard.setString(pendingTransactions[activeTxIndex].txHash);
  }, [pendingTransactions, activeTxIndex]);

  // Function to copy block explorer link to clipboard
  const copyBlockExplorerLink = useCallback(() => {
    if (pendingTransactions.length === 0 || !pendingTransactions[activeTxIndex]?.txHash) return;
    const url = `${selectedBlockExplorer.url}/tx/${pendingTransactions[activeTxIndex].txHash}`;
    Clipboard.setString(url);
  }, [pendingTransactions, activeTxIndex, selectedBlockExplorer.url]);

  // Function to open transaction in block explorer
  const openTransactionInBlockExplorer = useCallback(() => {
    if (pendingTransactions.length === 0 || !pendingTransactions[activeTxIndex]?.txHash) return;
    const txid = pendingTransactions[activeTxIndex].txHash;
    const url = `${selectedBlockExplorer.url}/tx/${txid}`;
    Linking.openURL(url);
  }, [pendingTransactions, activeTxIndex, selectedBlockExplorer.url]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton actions={toolTipActions} onPressMenuItem={onPressMenuItem} />,
    [toolTipActions, onPressMenuItem],
  );

  useEffect(() => {
    // Update header options whenever toolTipActions changes
    if (toolTipActions.length > 0) {
      setOptions({
        headerRight: () => HeaderRight,
      });
    }
  }, [HeaderRight, setOptions, toolTipActions]);

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          if (wallet) {
            await obtainWalletAddress();
          } else if (!wallet && address) {
            setAddressBIP21Encoded(address);
          }
        } catch (error) {
          console.error('Error during focus effect:', error);
        }
      });
      return () => {
        task.cancel();
      };
    }, [wallet, address, obtainWalletAddress, setAddressBIP21Encoded]),
  );

  // Custom amount modal functions
  const showCustomAmountModal = () => {
    setTempCustomLabel(customLabel);
    setTempCustomAmount(customAmount);
    setTempCustomUnit(customUnit);
    bottomModalRef.current.present();
  };

  const createCustomAmountAddress = () => {
    bottomModalRef.current.dismiss();
    setIsCustom(true);
    let amount = tempCustomAmount;
    switch (tempCustomUnit) {
      case BitcoinUnit.BTC:
        // nop
        break;
      case BitcoinUnit.SATS:
        amount = satoshiToBTC(tempCustomAmount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        if (AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesnt have rounding errors
          amount = satoshiToBTC(AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]);
        } else {
          amount = fiatToBTC(tempCustomAmount);
        }
        break;
    }
    setCustomLabel(tempCustomLabel);
    setCustomAmount(tempCustomAmount);
    setCustomUnit(tempCustomUnit);
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address, { amount, label: tempCustomLabel }));
    setTxStatus(TX_STATUS.ADDRESS);
  };

  const resetCustomAmount = () => {
    setTempCustomLabel('');
    setTempCustomAmount('');
    setTempCustomUnit(wallet.getPreferredBalanceUnit());
    setCustomLabel();
    setCustomAmount();
    setCustomUnit(wallet.getPreferredBalanceUnit());
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address));
    setTxStatus(TX_STATUS.ADDRESS);
    bottomModalRef.current.dismiss();
  };

  const handleShareButtonPressed = () => {
    Share.open({ message: currentTab === loc.wallets.details_address ? bip21encoded : wallet.getBIP47PaymentCode() }).catch(error =>
      console.debug('Error sharing:', error),
    );
  };

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = () => {
    if (Number(customAmount) > 0) {
      switch (customUnit) {
        case BitcoinUnit.BTC:
          return customAmount + ' BTC';
        case BitcoinUnit.SATS:
          return satoshiToBTC(customAmount) + ' BTC';
        case BitcoinUnit.LOCAL_CURRENCY:
          return fiatToBTC(customAmount) + ' BTC';
      }
      return customAmount + ' ' + customUnit;
    } else {
      return null;
    }
  };

  // Animation reference for tab content
  const tabContentFadeAnim = useRef(new Animated.Value(1)).current;

  // Animate tab change
  useEffect(() => {
    // Fade out current content
    Animated.timing(tabContentFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Fade in new content
      Animated.timing(tabContentFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [currentTab, txStatus, tabContentFadeAnim]);

  // Enhanced renderTabContent with animation
  const renderTabContent = () => {
    const qrValue = currentTab === segmentControlValues[0] ? bip21encoded : wallet.getBIP47PaymentCode();

    if (currentTab === segmentControlValues[0]) {
      return (
        <Animated.View style={[styles.container, { opacity: tabContentFadeAnim }]}>
          {address && txStatus === TX_STATUS.ADDRESS && (
            <AddressDetailsView
              isCustom={isCustom}
              getDisplayAmount={getDisplayAmount}
              customLabel={customLabel}
              stylesHook={stylesHook}
              bip21encoded={bip21encoded}
              address={address}
            />
          )}
        </Animated.View>
      );
    } else {
      return (
        <Animated.View style={[styles.container, { opacity: tabContentFadeAnim }]}>
          {!qrValue && <Text>{loc.bip47.not_found}</Text>}
          {qrValue && (
            <>
              <TipBox description={loc.receive.bip47_explanation} containerStyle={styles.tip} />
              <QRCodeComponent value={qrValue} />
              <CopyTextToClipboard text={qrValue} truncated={false} />
            </>
          )}
        </Animated.View>
      );
    }
  };

  // Determine if we should show the transaction status display
  const showTransactionStatus = txStatus === TX_STATUS.CONFIRMED || txStatus === TX_STATUS.PENDING || txStatus === TX_STATUS.LOADING;

  // Error message for addresses with too many transactions or server busy
  const renderErrorMessage = ({ tooManyTransactions, serverBusy, historyLimited, colors, address }) => {
    if (tooManyTransactions) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" type="feather" size={48} color={colors.failedColor} />
          <BlueText style={[styles.errorText, { color: colors.failedColor }]}>{loc.receive.address_too_many_transactions}</BlueText>
          <BlueText style={styles.errorDescription}>{loc.receive.address_too_many_transactions_detail}</BlueText>
        </View>
      );
    } else if (serverBusy) {
      return (
        <View style={styles.warningContainer}>
          <Icon name="server" type="feather" size={48} color={colors.orangeColor || '#f7b731'} />
          <BlueText style={[styles.warningText, { color: colors.foregroundColor }]}>{loc.receive.server_busy}</BlueText>
          <BlueText style={styles.warningDescription}>{loc.receive.server_busy_detail}</BlueText>
          <BlueText style={styles.warningSmallText}>{loc.formatString(loc.receive.server_busy_still_working, { address })}</BlueText>
        </View>
      );
    } 
    // Add specific handling for history too large error
    else if (serverBusy && isStaleData) {
      return (
        <View style={styles.warningContainer}>
          <Icon name="database" type="feather" size={48} color={colors.orangeColor || '#f7b731'} />
          <BlueText style={[styles.warningText, { color: colors.foregroundColor }]}>{loc.receive.address_history_too_large}</BlueText>
          <BlueText style={styles.warningDescription}>{loc.receive.address_history_too_large_detail}</BlueText>
        </View>
      );
    }
    // New case for limited history display
    else if (historyLimited) {
      return (
        <View style={styles.infoContainer}>
          <Icon name="info" type="feather" size={32} color={colors.infoColor || '#4DA1FF'} />
          <BlueText style={[styles.infoText, { color: colors.foregroundColor }]}>{loc.receive.limited_history_title}</BlueText>
          <BlueText style={styles.infoDescription}>{loc.receive.limited_history_description}</BlueText>
        </View>
      );
    }
    return null;
  };

  // Show refresh button when data is stale or there was a server error
  const renderRefreshButton = () => {
    return <RefreshButton isStaleData={isStaleData} serverBusy={serverBusy} onRefresh={refresh} />;
  };

  // Update the renderTooManyTransactions function to use the enhanced error handler
  const renderError = () => renderErrorMessage({ tooManyTransactions, serverBusy, historyLimited, colors, address: currentAddress });

  // Setup status change listener for animations
  useEffect(() => {
    // Use our own animation system without referring to safelyRunAnimation
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: 'spring',
        property: 'opacity',
        springDamping: 0.7,
      },
      update: {
        type: 'spring',
        springDamping: 0.7,
      },
      delete: {
        type: 'spring',
        property: 'opacity',
        springDamping: 0.7,
      },
    });
  }, [txStatus]);

  return (
    <>
      <ScrollView
        testID="ReceiveDetailsScrollView"
        contentContainerStyle={[styles.root, stylesHook.root]}
        keyboardShouldPersistTaps="always"
      >
        {wallet?.allowBIP47() && wallet?.isBIP47Enabled() && (
          <View style={styles.tabsContainer}>
            <SegmentedControl
              values={segmentControlValues}
              selectedIndex={segmentControlValues.findIndex(tab => tab === currentTab)}
              onChange={index => {
                setCurrentTab(segmentControlValues[index]);
              }}
            />
          </View>
        )}

        {/* Display error for addresses with too many transactions or server busy */}
        {renderError()}

        {/* Display a banner for limited history */}
        {historyLimited && !tooManyTransactions && !serverBusy && (
          <View style={styles.limitedHistoryBanner}>
            <Icon name="info" type="feather" size={16} color={colors.infoColor || '#4DA1FF'} />
            <BlueText style={styles.limitedHistoryText}>{loc.receive.showing_limited_transactions}</BlueText>
          </View>
        )}

        {/* If server busy but we can still show meaningful content */}
        {serverBusy && isStaleData && (
          <View style={styles.staleDataBanner}>
            <Icon name="info" type="feather" size={16} color={colors.orangeColor || '#f7b731'} />
            <BlueText style={styles.staleDataText}>{loc.receive.showing_stale_data}</BlueText>
            {renderRefreshButton()}
          </View>
        )}

        {/* Only show regular content if we don't have too many transactions and no active tx status */}
        {!tooManyTransactions && (
          <>
            {/* Transaction status display takes precedence when there's an active transaction */}
            {showTransactionStatus ? (
              <TransactionStatusDisplay
                status={txStatus}
                transactions={pendingTransactions}
                activeTxIndex={activeTxIndex}
                setActiveTxIndex={setActiveTxIndex}
                customLabel={isCustom ? customLabel : undefined}
                stylesHook={stylesHook}
              />
            ) : (
              <>
                {/* Only show QR code when no transaction status is active */}
                {txStatus === TX_STATUS.ADDRESS && renderTabContent()}
                {address !== undefined && txStatus === TX_STATUS.ADDRESS && (
                  <HandOffComponent title={loc.send.details_address} type={HandOffActivityType.ReceiveOnchain} userInfo={{ address }} />
                )}
              </>
            )}
          </>
        )}

        {/* Share button card - always show this */}
        <View style={styles.share}>
          <BlueCard>
            {txStatus === TX_STATUS.ADDRESS && currentTab === loc.wallets.details_address && !tooManyTransactions && (
              <BlueButtonLink
                style={styles.link}
                testID="SetCustomAmountButton"
                title={loc.receive.details_setAmount}
                onPress={showCustomAmountModal}
              />
            )}
            <Button onPress={handleShareButtonPressed} title={loc.receive.details_share} />
            {/* Add refresh button when needed */}
            {(isStaleData || serverBusy) && renderRefreshButton()}
          </BlueCard>
        </View>
      </ScrollView>

      {/* Custom amount modal */}
      <BottomModal
        ref={bottomModalRef}
        contentContainerStyle={styles.modalContainerJustify}
        backgroundColor={colors.modal}
        footer={
          <View style={styles.modalButtonContainer}>
            <Button
              testID="CustomAmountResetButton"
              style={[styles.modalButton, stylesHook.modalButton]}
              title={loc.receive.reset}
              onPress={resetCustomAmount}
            />
            <View style={styles.modalButtonSpacing} />
            <Button
              testID="CustomAmountSaveButton"
              style={[styles.modalButton, stylesHook.modalButton]}
              title={loc.receive.details_create}
              onPress={createCustomAmountAddress}
            />
          </View>
        }
      >
        <AmountInput
          unit={tempCustomUnit}
          amount={tempCustomAmount || ''}
          onChangeText={setTempCustomAmount}
          onAmountUnitChange={setTempCustomUnit}
        />
        <View style={[styles.customAmount, stylesHook.customAmount]}>
          <TextInput
            onChangeText={setTempCustomLabel}
            placeholderTextColor="#81868e"
            placeholder={loc.receive.details_label}
            value={tempCustomLabel || ''}
            numberOfLines={1}
            style={[styles.customAmountText, stylesHook.customAmountText]}
            testID="CustomAmountDescription"
          />
        </View>
        <BlueSpacing20 />
        <BlueSpacing20 />
      </BottomModal>
    </>
  );
};

const RefreshButton = ({ isStaleData, serverBusy, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshed(new Date());
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isStaleData || serverBusy) {
    return (
      <View style={styles.refreshContainer}>
        <Button
          onPress={handleRefresh}
          title={isRefreshing ? loc._.refresh + '...' : loc.receive.refresh_address}
          disabled={isRefreshing}
        />
        {lastRefreshed && (
          <Text style={styles.lastRefreshedText}>
            {loc.transactions.last_updated}: {lastRefreshed.toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  modalContainerJustify: {
    alignContent: 'center',
    padding: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customAmount: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  root: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  tabsContainer: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    marginTop: 32,
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24, // Increased padding
    width: '100%',
  },
  share: {
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    marginVertical: 16,
  },
  link: {
    marginVertical: 32,
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
    paddingBottom: 24,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 50,
    fontWeight: '700',
    flex: 0.5,
    alignItems: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  modalButtonSpacing: {
    width: 16,
  },
  customAmountText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 20,
  },
  errorText: {
    fontWeight: '600',
    marginTop: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  errorDescription: {
    marginTop: 8,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  transactionItem: {
    width: 280,
    height: 220, // Increased height
    borderRadius: 16,
    padding: 20, // Increased padding
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Add backgroundColor here to fix shadow warnings
    backgroundColor: '#FFFFFF', // Will be overridden by theme colors
  },

  txIconContainer: {
    marginBottom: 16,
    padding: 8,
    borderRadius: 40,
    // Add backgroundColor here to fix shadow warnings
    backgroundColor: 'rgba(255,255,255,0.9)', // Will be overridden by theme colors
  },
  transactionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    width: '100%',
  },

  transactionText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    paddingHorizontal: 8,
  },

  transactionEta: {
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 8,
    opacity: 0.8,
  },

  transactionHash: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    padding: 4,
    color: '#81868e',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 4,
    paddingHorizontal: 8,
  },

  transactionsList: {
    paddingVertical: 30,
    alignItems: 'center',
  },

  multiTxContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 60, // Increased to accommodate navigation buttons
    width: '100%',
    marginTop: 8,
  },

  pendingTxTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    paddingHorizontal: 16,
    textAlign: 'center',
  },

  paginationDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    height: 44,
    width: 160, // Fixed width for scroll container
    overflow: 'hidden',
    paddingHorizontal: 10,
  },

  paginationDotsScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },

  dotsAnimatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },

  paginationDotTouchable: {
    padding: 8, // Larger touchable area
    marginHorizontal: 4, // Reduced spacing between dots for better visual appearance
    width: 16, // Fixed width for calculation
  },

  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6, // Reduced opacity for inactive dots
  },

  activePaginationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 1, // Full opacity for active dot
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  pendingTxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginTop: 12,
    width: '100%',
  },

  pendingIconContainer: {
    marginBottom: 16,
    marginTop: 8,
    alignItems: 'center',
  },

  customLabelText: {
    marginBottom: 16,
    fontSize: 16,
  },

  pendingTxAmount: {
    fontWeight: '600',
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },

  pendingTxEta: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.8,
  },


  // New styles for navigation buttons
  navigationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },

  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 0,
    fontSize: 22,
    fontWeight: 'bold',
  },

  navButtonDisabled: {
    opacity: 0.5,
  },
  // New styles for server busy error
  warningContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 20,
    backgroundColor: 'rgba(247, 183, 49, 0.1)',
    borderRadius: 8,
  },
  warningText: {
    fontWeight: '600',
    marginTop: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  warningDescription: {
    marginTop: 8,
    color: '#9aa0aa',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  warningSmallText: {
    marginTop: 16,
    fontSize: 12,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  staleDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(247, 183, 49, 0.2)',
    borderRadius: 4,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  staleDataText: {
    fontSize: 13,
    color: '#7d7d7d',
    marginLeft: 8,
  },
  refreshContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  
  lastRefreshedText: {
    fontSize: 12,
    color: '#9aa0aa',
    marginTop: 5,
    fontStyle: 'italic',
  },
  infoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 15,
    backgroundColor: 'rgba(77, 161, 255, 0.1)', // Light blue background
    borderRadius: 8,
  },
  infoText: {
    fontWeight: '600',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  infoDescription: {
    marginTop: 8,
    color: '#667080',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  limitedHistoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(77, 161, 255, 0.1)', // Light blue background
    borderRadius: 4,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  limitedHistoryText: {
    fontSize: 13,
    color: '#4A6385',
    marginLeft: 8,
  },
});

// Setup status change listener for animations with improved debounce
useEffect(() => {
  // Prevent animation conflicts by adding a small delay
  const timeoutId = setTimeout(() => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: 'spring',
        property: 'opacity',
        springDamping: 0.7,
      },
      update: {
        type: 'spring',
        springDamping: 0.7,
      },
      delete: {
        type: 'spring',
        property: 'opacity',
        springDamping: 0.7,
      },
    });
  }, 100);
  
  return () => clearTimeout(timeoutId);
}, [txStatus]);

export default ReceiveDetails;
