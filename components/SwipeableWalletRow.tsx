import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useTheme } from './themes';
import loc from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { useSettings } from '../hooks/context/useSettings';
import Icon from './Icon';

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
  onSwipeStateChange?: (isSwipeInProgress: boolean) => void;
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
  ({ children, enabled, isHidden, currentUnit, onToggleHideBalance, onChangeUnit, onSwipeStateChange }, ref) => {
    const { colors } = useTheme();
    const { preferredFiatCurrency } = useSettings();
    const internalRef = useRef<Swipeable | null>(null);

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

    const getUnitLabel = useCallback(() => {
      if (currentUnit === BitcoinUnit.BTC) return loc.units.BTC;
      if (currentUnit === BitcoinUnit.SATS) return loc.units.sats;
      return preferredFiatCurrency?.endPointKey ?? FiatUnit.USD;
    }, [currentUnit, preferredFiatCurrency]);

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
                { backgroundColor: colors.changeBackground },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleChangeUnit}
              accessibilityRole="button"
              accessibilityLabel={loc.wallets.swipe_change_unit}
            >
              <Icon name="arrows-rotate" type="font-awesome-6" size={14} color={colors.changeText} />
              <Text style={[styles.actionText, { color: colors.changeText }]}>{getUnitLabel()}</Text>
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
              <Icon name={isHidden ? 'eye' : 'eye-slash'} type="font-awesome" size={14} color={colors.buttonTextColor} />
              <Text style={[styles.actionText, { color: colors.buttonTextColor }]}>
                {isHidden ? loc.wallets.swipe_balance_show : loc.wallets.swipe_balance_hide}
              </Text>
            </Pressable>
          </Animated.View>
        );
      },
      [colors, getUnitLabel, handleChangeUnit, handleHideBalance, isHidden],
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
          onSwipeStateChange?.(true);
          triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
        }}
        onSwipeableWillClose={() => {
          onSwipeStateChange?.(false);
        }}
        onSwipeableClose={() => {
          onSwipeStateChange?.(false);
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
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SwipeableWalletRow;
