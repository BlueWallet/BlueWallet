import React, { forwardRef, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  ImageProps,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from './themes';
import { withAlpha } from './color';

const BUTTON_HEIGHT = 52;
const BUTTON_FONT_SIZE = 18;
const SIDE_MARGIN = 16;
const BUTTON_GAP = 10;
const FLOAT_BUTTON_LIST_CLEARANCE = 18;
const getFloatButtonBottomOffset = (bottomInset: number): number => (bottomInset ? bottomInset + 10 : 30);

// Estimate used before native layout. Screens replace it with the measured reserved height.
export const getFloatingButtonReservedHeight = (fontScale = 1, bottomInset = 0): number =>
  Math.max(BUTTON_HEIGHT, BUTTON_HEIGHT * fontScale) + FLOAT_BUTTON_LIST_CLEARANCE + getFloatButtonBottomOffset(bottomInset) - bottomInset;

const useButtonAccessibility = () => {
  // Avoid motion until the initial device preference has been read.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [boldText, setBoldText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    let active = true;
    const observe = (
      query: () => Promise<boolean>,
      event:
        | 'reduceMotionChanged'
        | 'boldTextChanged'
        | 'darkerSystemColorsChanged'
        | 'highTextContrastChanged'
        | 'reduceTransparencyChanged',
      update: (value: boolean) => void,
    ) => {
      let revision = 0;
      const refresh = () => {
        const currentRevision = ++revision;
        query()
          .then(value => {
            if (active && revision === currentRevision) update(value);
          })
          .catch(() => {});
      };
      const subscription = AccessibilityInfo.addEventListener(event, value => {
        revision++;
        update(value);
      });
      refresh();
      return { refresh, remove: () => subscription.remove() };
    };
    const observers = [observe(AccessibilityInfo.isReduceMotionEnabled, 'reduceMotionChanged', setReduceMotion)];
    if (Platform.OS === 'ios') {
      observers.push(
        observe(AccessibilityInfo.isBoldTextEnabled, 'boldTextChanged', setBoldText),
        observe(AccessibilityInfo.isDarkerSystemColorsEnabled, 'darkerSystemColorsChanged', setHighContrast),
        observe(AccessibilityInfo.isReduceTransparencyEnabled, 'reduceTransparencyChanged', setReduceTransparency),
      );
    } else {
      setReduceTransparency(false);
      if (Platform.OS === 'android') {
        observers.push(observe(AccessibilityInfo.isHighTextContrastEnabled, 'highTextContrastChanged', setHighContrast));
      }
    }
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') observers.forEach(observer => observer.refresh());
    });
    return () => {
      active = false;
      observers.forEach(observer => observer.remove());
      appState.remove();
    };
  }, []);

  return { reduceMotion, boldText, highContrast, reduceTransparency };
};

interface FContainerProps {
  children: ReactNode;
  inline?: boolean;
  /** Space above the bottom safe area needed by the buttons and list clearance. */
  onReservedHeightChange?: (height: number) => void;
}

interface FButtonProps
  extends Pick<TouchableOpacityProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityActions' | 'onAccessibilityAction'> {
  text: string;
  icon: ReactNode;
  disabled?: boolean;
  testID?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const FButton = ({ text, icon, disabled = false, onLongPress, onPress, accessibilityLabel = text, ...props }: FButtonProps) => {
  const { colors, dark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { reduceMotion, boldText, highContrast } = useButtonAccessibility();
  const scale = useRef(new Animated.Value(1)).current;
  const iconSize = Math.max(24, Math.round(24 * fontScale));
  const foreground = highContrast ? (dark ? '#000000' : '#ffffff') : colors.buttonAlternativeTextColor;
  const background = highContrast ? (dark ? '#ffffff' : '#000000') : colors.buttonBackgroundColor;

  useEffect(() => {
    if (reduceMotion || disabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [reduceMotion, disabled, scale]);

  const animateScale = (value: number) => {
    if (reduceMotion || disabled) return;
    Animated.timing(scale, {
      toValue: value,
      duration: 110,
      useNativeDriver: true,
    }).start();
  };

  // Wrapping icon containers are common at call sites. Scale the whole decoration without
  // passing unsupported size props to native Views or changing the caller's icon colors.
  return (
    <Animated.View style={[styles.buttonWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        {...props}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        accessibilityActions={props.accessibilityActions ?? (onLongPress ? [{ name: 'longpress' }] : undefined)}
        onAccessibilityAction={
          props.onAccessibilityAction ??
          (event => {
            if (disabled) return;
            if (event.nativeEvent.actionName === 'longpress') onLongPress?.();
            if (event.nativeEvent.actionName === 'activate') onPress();
          })
        }
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => animateScale(0.96)}
        onPressOut={() => animateScale(1)}
        activeOpacity={1}
        style={[
          styles.button,
          (disabled || highContrast) && styles.outlined,
          disabled && styles.disabled,
          {
            backgroundColor: background,
            borderColor: foreground,
          },
        ]}
      >
        {!highContrast && (
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.iconFrame, { width: iconSize, height: iconSize }]}
          >
            <View style={[styles.icon, { transform: [{ scale: iconSize / 24 }] }]}>
              {React.isValidElement<ImageProps>(icon) && icon.type === Image
                ? React.cloneElement(icon, { style: [icon.props.style, { width: 24, height: 24 }] })
                : icon}
            </View>
          </View>
        )}
        <Text
          allowFontScaling
          maxFontSizeMultiplier={0}
          style={[
            styles.text,
            boldText && styles.boldText,
            {
              color: foreground,
            },
          ]}
        >
          {text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const FContainer = forwardRef<View, FContainerProps>(({ children, inline = false, onReservedHeightChange }, ref) => {
  const insets = useSafeAreaInsets();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const bottom = getFloatButtonBottomOffset(insets.bottom);
  const onLayout = useCallback((event: LayoutChangeEvent) => setMeasuredHeight(event.nativeEvent.layout.height), []);

  useEffect(() => {
    if (measuredHeight > 0) {
      onReservedHeightChange?.(measuredHeight + FLOAT_BUTTON_LIST_CLEARANCE + bottom - insets.bottom);
    }
  }, [measuredHeight, bottom, insets.bottom, onReservedHeightChange]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        inline ? styles.inline : styles.floating,
        {
          paddingLeft: SIDE_MARGIN + insets.left,
          paddingRight: SIDE_MARGIN + insets.right,
        },
        inline ? { paddingBottom: bottom } : { bottom },
      ]}
    >
      <View ref={ref} collapsable={false} onLayout={onLayout} pointerEvents="box-none" style={styles.buttons}>
        {children}
      </View>
    </View>
  );
});

export const FloatButtonsBottomFade = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { reduceTransparency, highContrast } = useButtonAccessibility();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.fade, { height: 50 + insets.bottom }]}
    >
      {reduceTransparency || highContrast ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      ) : (
        <LinearGradient
          colors={[colors.background, withAlpha(colors.background, 0)]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  floating: { position: 'absolute', left: 0, right: 0 },
  inline: { alignSelf: 'stretch' },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    gap: BUTTON_GAP,
  },
  buttonWrapper: { flexGrow: 0, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  button: {
    flexGrow: 1,
    minHeight: BUTTON_HEIGHT,
    minWidth: 48,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { fontSize: BUTTON_FONT_SIZE, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  boldText: { fontWeight: '800' },
  outlined: { borderWidth: 2 },
  disabled: { borderStyle: 'dashed' },
  iconFrame: { alignItems: 'center', justifyContent: 'center' },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
