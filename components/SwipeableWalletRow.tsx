import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useTheme } from './themes';
import loc from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';

/** Width of each swipe-action button — matches iOS Mail / Contacts style. */
const ACTION_WIDTH = 80;

interface SwipeableWalletRowProps {
  children: React.ReactNode;
  /** When false the row renders children without any swipe wrapper (during drag / active). */
  enabled: boolean;
  isHidden: boolean;
  currentUnit: BitcoinUnit;
  onToggleHideBalance: () => void;
  onChangeUnit: () => void;
}

/**
 * SwipeableWalletRow wraps a wallet list item and reveals iOS-style action
 * buttons on left-swipe:
 *   [ Change Unit ]  [ Hide / Show ]
 *
 * The reveal animation matches the native iOS feel:
 *  - The whole panel translates in sync with the user's finger via a single
 *    translateX derived from `dragX`.
 *  - No per-button stagger (that's what causes the "non-native" look).
 *  - Buttons have a fixed width so the panel has a predictable size.
 */
const SwipeableWalletRow = React.forwardRef<Swipeable, SwipeableWalletRowProps>(
  ({ children, enabled, isHidden, currentUnit, onToggleHideBalance, onChangeUnit }, ref) => {
    const { colors } = useTheme();
    const internalRef = useRef<Swipeable | null>(null);
    const swipeInProgressRef = useRef(false);

    // Forward the ref while keeping a local copy for `close()`.
    const setRef = useCallback(
      (r: Swipeable | null) => {
        internalRef.current = r;
        if (typeof ref === 'function') {
          ref(r);
        } else if (ref) {
          (ref as React.MutableRefObject<Swipeable | null>).current = r;
        }
      },
      [ref],
    );

    const close = useCallback(() => {
      internalRef.current?.close();
    }, []);

    const handleHideBalance = useCallback(() => {
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      onToggleHideBalance();
      close();
    }, [onToggleHideBalance, close]);

    const handleChangeUnit = useCallback(() => {
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      onChangeUnit();
      close();
    }, [onChangeUnit, close]);

    /**
     * iOS-style reveal: the whole panel slides in together.
     * `progress` goes from 0 → 1 as the row opens, so we translate
     * each button from its fully-hidden offset → 0.
     */
    const renderRightActions = useCallback(
      (progress: Animated.AnimatedInterpolation<number>) => {
        const totalWidth = ACTION_WIDTH * 2;

        const panelTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [totalWidth, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View style={[styles.actionsContainer, { transform: [{ translateX: panelTranslate }] }]}>
            {/* Change Unit */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonUnit,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleChangeUnit}
              accessibilityRole="button"
              accessibilityLabel={loc.wallets.swipe_change_unit}
            >
              <Text style={styles.actionIcon}>↻</Text>
              <Text style={[styles.actionText, styles.actionTextDark]}>{currentUnit}</Text>
            </Pressable>

            {/* Hide / Show Balance — rightmost, matches iOS "destructive" slot */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.buttonBackgroundColor },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleHideBalance}
              accessibilityRole="button"
              accessibilityLabel={isHidden ? loc.wallets.swipe_balance_show : loc.wallets.swipe_balance_hide}
            >
              <Text style={styles.actionIcon}>{isHidden ? '👁' : '🙈'}</Text>
              <Text style={[styles.actionText, { color: colors.buttonTextColor }]}>
                {isHidden ? loc.wallets.swipe_balance_show : loc.wallets.swipe_balance_hide}
              </Text>
            </Pressable>
          </Animated.View>
        );
      },
      [colors, currentUnit, handleChangeUnit, handleHideBalance, isHidden],
    );

    if (!enabled) {
      return <>{children}</>;
    }

    return (
      <Swipeable
        ref={setRef}
        renderRightActions={renderRightActions}
        // friction=1 gives a 1:1 feel with the finger — most iOS-like.
        friction={1}
        rightThreshold={ACTION_WIDTH / 2}
        // Allow a small overshoot but snap back quickly.
        overshootRight={false}
        overshootFriction={8}
        onSwipeableWillOpen={() => {
          swipeInProgressRef.current = true;
          triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
        }}
        onSwipeableWillClose={() => {
          swipeInProgressRef.current = false;
        }}
        onSwipeableClose={() => {
          swipeInProgressRef.current = false;
        }}
      >
        {children}
      </Swipeable>
    );
  },
);

SwipeableWalletRow.displayName = 'SwipeableWalletRow';

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    width: ACTION_WIDTH * 2,
  },
  actionButton: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  actionButtonUnit: {
    backgroundColor: '#FF9500', // iOS orange — universally understood as "change"
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionTextDark: {
    color: '#FFFFFF',
  },
});

export default SwipeableWalletRow;
