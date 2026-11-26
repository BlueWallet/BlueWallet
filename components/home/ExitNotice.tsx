/**
 * Back on the home leaves the app: the first press only warns, with a way to
 * stay, and a second press within a few seconds does leave. Pressing back by
 * mistake (reaching for the gesture bar, a back too many after a screen) no
 * longer drops the user out of the wallet.
 *
 * Android only: iOS has no system back that leaves an app.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDrawerStatus } from '@react-navigation/drawer';

import { triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import { useSizeClass } from '../../blue_modules/sizeClass';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import Icon from '../Icon';
import { useHomePalette } from './homeTheme';

/** How long the second press has to come. */
const ARMED_MS = 3_000;

const TONE = {
  onLight: { bg: '#1f2937', text: '#f9fafb', action: '#fdba74' },
  onDark: { bg: '#f3f4f6', text: '#111827', action: '#c2410c' },
};

/**
 * State of the double back. `onBack` is called from the screen's back handler
 * when the home itself would be left: true when it took the press (the first
 * one), false when the press should go on and leave the app.
 */
export function useBackToExit() {
  const navigation = useExtendedNavigation();
  const drawerStatus = useDrawerStatus();
  const { isLargeScreen } = useSizeClass();
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disarm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    armedRef.current = false;
    setArmed(false);
  }, []);
  useEffect(() => () => disarm(), [disarm]);

  const onBack = useCallback((): boolean => {
    // Not leaving the app: the open wallets panel closes, or a screen below comes back.
    if ((drawerStatus === 'open' && !isLargeScreen) || navigation.canGoBack()) return false;
    if (armedRef.current) {
      disarm();
      return false;
    }
    armedRef.current = true;
    setArmed(true);
    triggerSelectionHapticFeedback();
    AccessibilityInfo.announceForAccessibility(loc.home.exit_again);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(disarm, ARMED_MS);
    return true;
  }, [drawerStatus, isLargeScreen, navigation, disarm]);

  return { armed, onBack, disarm };
}

/** The warning, floating above the bottom bar, with the way to stay. */
export const ExitNotice: React.FC<{ visible: boolean; bottom: number; onCancel: () => void }> = ({ visible, bottom, onCancel }) => {
  const p = useHomePalette();
  const shown = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(shown, { toValue: visible ? 1 : 0, duration: visible ? 180 : 140, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, shown]);

  if (!mounted) return null;
  // Inverted against the theme, like a system toast: it reads as a passing
  // note from the app, not as part of the screen.
  const tone = p.dark ? TONE.onDark : TONE.onLight;
  const translateY = shown.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Animated.View
        style={[styles.notice, { backgroundColor: tone.bg, opacity: shown, transform: [{ translateY }] }]}
        accessibilityLiveRegion="assertive"
        testID="ExitNotice"
      >
        <Icon name="logout" type="material" size={20} color={tone.text} />
        <Text style={[styles.text, { color: tone.text }]}>{loc.home.exit_again}</Text>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={loc.home.exit_stay}
          hitSlop={8}
          testID="ExitNoticeCancel"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={[styles.cancelText, { color: tone.action }]}>{loc._.cancel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    maxWidth: 440,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#111827',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { flexShrink: 1, fontSize: 14, fontWeight: '600', paddingVertical: 8 },
  cancel: { minHeight: 40, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
