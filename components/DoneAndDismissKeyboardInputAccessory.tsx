import React, { useCallback, useEffect, useMemo } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import BlueButtonLink from './BlueButtonLink';
import loc from '../loc';
import { useTheme } from './themes';
import Clipboard from '@react-native-clipboard/clipboard';
import { isIOS26OrHigher } from '../blue_modules/environment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { withAlpha } from './color';

export const KEYBOARD_ACCESSORY_BAR_HEIGHT = 44;

const BAR_HEIGHT = KEYBOARD_ACCESSORY_BAR_HEIGHT;
const CHIP_FADE_IN_MS = 180;
const CHIP_PRESS_SCALE = 0.94;
const RIGHT_EDGE_FADE_WIDTH = 20;
const chipSpring = { damping: 14, stiffness: 220, mass: 0.8 };
const chipFadeEasing = Easing.out(Easing.cubic);
const RIGHT_EDGE_FADE_START = { x: 0, y: 0.5 };
const RIGHT_EDGE_FADE_END = { x: 1, y: 0.5 };

interface DoneAndDismissKeyboardInputAccessoryProps {
  onPasteTapped: (clipboard: string) => void;
  onClearTapped: () => void;
  suggestions?: string[];
  onSuggestionTapped?: (word: string) => void;
}

interface SuggestionChipProps {
  word: string;
  chipStyle: StyleProp<ViewStyle>;
  chipTextStyle: StyleProp<TextStyle>;
  onPress: (word: string) => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ word, chipStyle, chipTextStyle, onPress }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: CHIP_FADE_IN_MS, easing: chipFadeEasing });
  }, [opacity, word]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(CHIP_PRESS_SCALE, chipSpring);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, chipSpring);
  }, [scale]);

  const handlePress = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    onPress(word);
  }, [onPress, word]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={word}
      testID={`Bip39Suggestion-${word}`}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.chip, chipStyle, animatedStyle]}>
        <Text style={[styles.chipText, chipTextStyle]}>{word}</Text>
      </Animated.View>
    </Pressable>
  );
};

export const DoneAndDismissKeyboardInputAccessoryViewID = 'DoneAndDismissKeyboardInputAccessory';

export const DoneAndDismissKeyboardInputAccessory: React.FC<DoneAndDismissKeyboardInputAccessoryProps> = props => {
  const { colors } = useTheme();
  const isDark = useColorScheme() === 'dark';
  const isSuggestionMode = props.onSuggestionTapped != null;
  const useIos26Capsule = isSuggestionMode && isIOS26OrHigher;
  const suggestions = props.suggestions ?? [];
  const onSuggestionTapped = props.onSuggestionTapped;

  const styleHooks = StyleSheet.create({
    container: {
      backgroundColor: colors.inputBackgroundColor,
    },
    chip: useIos26Capsule
      ? {
          backgroundColor: isDark ? colors.buttonDisabledBackgroundColor : withAlpha(colors.shadowColor, 0.06),
        }
      : {
          backgroundColor: colors.buttonDisabledBackgroundColor,
        },
    chipText: {
      color: useIos26Capsule && isDark ? colors.buttonDisabledTextColor : colors.alternativeTextColor,
    },
    doneText: {
      color: colors.foregroundColor,
    },
    androidSeparator: {
      borderTopColor: colors.formBorder,
    },
  });

  const rightEdgeFadeColors = useMemo(
    () => [withAlpha(colors.inputBackgroundColor, 0), colors.inputBackgroundColor],
    [colors.inputBackgroundColor],
  );

  const onPasteTapped = async () => {
    const clipboard = await Clipboard.getString();
    props.onPasteTapped(clipboard);
  };

  const handleSuggestionTapped = useCallback(
    (word: string) => {
      onSuggestionTapped?.(word);
    },
    [onSuggestionTapped],
  );

  // Suggestion mode is docked by the parent (not InputAccessoryView) so chip updates can animate.
  const inputView = isSuggestionMode ? (
    <View
      style={[
        styles.suggestionBar,
        useIos26Capsule && styles.suggestionBarIos26,
        Platform.OS === 'android' && styles.suggestionBarAndroid,
        styleHooks.container,
        Platform.OS === 'android' && styleHooks.androidSeparator,
      ]}
      testID="ImportWalletKeyboardAccessoryBar"
    >
      <View style={styles.suggestionsScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScrollView}
          contentContainerStyle={styles.suggestionsContent}
          keyboardShouldPersistTaps="always"
        >
          {suggestions.map(word => (
            <SuggestionChip
              key={word}
              word={word}
              chipStyle={styleHooks.chip}
              chipTextStyle={styleHooks.chipText}
              onPress={handleSuggestionTapped}
            />
          ))}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={rightEdgeFadeColors}
          start={RIGHT_EDGE_FADE_START}
          end={RIGHT_EDGE_FADE_END}
          style={styles.rightEdgeFade}
        />
      </View>
      {useIos26Capsule ? (
        <Pressable
          accessibilityRole="button"
          onPress={Keyboard.dismiss}
          style={({ pressed }) => [styles.doneIos26, pressed && styles.donePressed]}
        >
          <Text style={[styles.doneIos26Text, styleHooks.doneText]}>{loc.send.input_done}</Text>
        </Pressable>
      ) : (
        <BlueButtonLink title={loc.send.input_done} onPress={Keyboard.dismiss} />
      )}
    </View>
  ) : (
    <View style={[styles.container, styleHooks.container]}>
      <BlueButtonLink title={loc.send.input_clear} onPress={props.onClearTapped} />
      <BlueButtonLink title={loc.send.input_paste} onPress={onPasteTapped} />
      <BlueButtonLink title={loc.send.input_done} onPress={Keyboard.dismiss} />
    </View>
  );

  if (Platform.OS === 'ios' && !isSuggestionMode) {
    return <InputAccessoryView nativeID={DoneAndDismissKeyboardInputAccessoryViewID}>{inputView}</InputAccessoryView>;
  }

  return inputView;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    maxHeight: BAR_HEIGHT,
  },
  suggestionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    maxHeight: BAR_HEIGHT,
    overflow: 'hidden',
  },
  suggestionBarIos26: {
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 20,
  },
  suggestionBarAndroid: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionsScroll: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    position: 'relative',
  },
  suggestionsScrollView: {
    flex: 1,
  },
  suggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: RIGHT_EDGE_FADE_WIDTH,
    gap: 6,
    minHeight: BAR_HEIGHT,
  },
  rightEdgeFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: RIGHT_EDGE_FADE_WIDTH,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  donePressed: {
    opacity: 0.6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  doneIos26: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: BAR_HEIGHT,
    justifyContent: 'center',
  },
  doneIos26Text: {
    fontSize: 16,
    fontWeight: '500',
  },
});
