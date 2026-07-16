import React, { useMemo } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import BlueButtonLink from './BlueButtonLink';
import loc from '../loc';
import { useTheme } from './themes';
import { withAlpha } from './color';

const BAR_HEIGHT = 44;

/**
 * Edge-to-edge Android: extra lift above IME-reported keyboard top so the bar sits on the visible keys.
 * Tune on device: increase if the bar hides behind the keyboard, decrease if it floats with a gap.
 */
const ANDROID_KEYBOARD_TOP_EXTRA_OFFSET = 24;

function computeAndroidAccessoryTop(
  keyboardTop: number,
  anchorScreenY: number,
  barHeight: number = BAR_HEIGHT,
  extraOffset: number = ANDROID_KEYBOARD_TOP_EXTRA_OFFSET,
): number {
  return keyboardTop - anchorScreenY - barHeight - extraOffset;
}

function computeKeyboardTop(keyboardScreenY: number, keyboardHeight: number, windowHeight: number): number {
  if (keyboardHeight <= 0) {
    return keyboardScreenY;
  }
  const topFromHeight = windowHeight - keyboardHeight;
  if (keyboardScreenY <= 0) {
    return topFromHeight;
  }
  return Math.min(keyboardScreenY, topFromHeight);
}

interface ImportWalletKeyboardAccessoryProps {
  suggestions: string[];
  onSuggestionTapped: (word: string) => void;
  onDone?: () => void;
  /** Android only: keyboard top edge in screen coordinates (from Keyboard.endCoordinates.screenY). */
  keyboardScreenY?: number;
  /** Android only: keyboard height (from Keyboard.endCoordinates.height). */
  keyboardHeight?: number;
  /** Android only: Y of the positioning anchor view in screen coordinates. */
  anchorScreenY?: number;
}

export const ImportWalletKeyboardAccessoryViewID = 'ImportWalletKeyboardAccessory';

const ImportWalletKeyboardAccessory: React.FC<ImportWalletKeyboardAccessoryProps> = ({
  suggestions,
  onSuggestionTapped,
  onDone = Keyboard.dismiss,
  keyboardScreenY = 0,
  keyboardHeight = 0,
  anchorScreenY = 0,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const isAndroid = Platform.OS === 'android';
  const isDark = useColorScheme() === 'dark';

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.inputBackgroundColor,
    },
    chip: {
      backgroundColor: isDark ? colors.buttonDisabledBackgroundColor : withAlpha(colors.shadowColor, 0.06),
    },
    chipText: {
      color: isDark ? colors.buttonDisabledTextColor : colors.alternativeTextColor,
      fontSize: 15,
      fontWeight: '500',
      textAlign: 'center',
    },
    androidSeparator: {
      borderTopColor: colors.formBorder,
    },
  });

  const fadeColorsLeft = useMemo(
    () => [colors.inputBackgroundColor, withAlpha(colors.inputBackgroundColor, 0)],
    [colors.inputBackgroundColor],
  );
  const fadeColorsRight = useMemo(
    () => [withAlpha(colors.inputBackgroundColor, 0), colors.inputBackgroundColor],
    [colors.inputBackgroundColor],
  );

  const keyboardTop = useMemo(() => {
    if (!isAndroid) {
      return 0;
    }
    return computeKeyboardTop(keyboardScreenY, keyboardHeight, windowHeight);
  }, [isAndroid, keyboardHeight, keyboardScreenY, windowHeight]);

  const inputView = (
    <View
      style={[styles.root, isAndroid ? styles.rootAndroid : styles.rootIOS, isAndroid && stylesHook.androidSeparator, stylesHook.root]}
      testID="ImportWalletKeyboardAccessoryBar"
    >
      <View style={styles.suggestionsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestionsContent}
          keyboardShouldPersistTaps="always"
        >
          {suggestions.map(word => (
            <Pressable
              key={word}
              accessibilityRole="button"
              accessibilityLabel={word}
              testID={`Bip39Suggestion-${word}`}
              onPress={() => onSuggestionTapped(word)}
              style={({ pressed }) => [styles.chip, stylesHook.chip, pressed && styles.chipPressed]}
            >
              <Text style={stylesHook.chipText}>{word}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View pointerEvents="none" style={styles.fadeLeft}>
          <LinearGradient colors={fadeColorsLeft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fadeGradient} />
        </View>
        <View pointerEvents="none" style={styles.fadeRight}>
          <LinearGradient colors={fadeColorsRight} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fadeGradient} />
        </View>
      </View>
      <View style={styles.right}>
        <BlueButtonLink
          style={isAndroid ? styles.doneAndroid : styles.doneIOS}
          titleStyle={styles.doneTitle}
          title={loc.send.input_done}
          onPress={onDone}
        />
      </View>
    </View>
  );

  if (!isAndroid) {
    return <InputAccessoryView nativeID={ImportWalletKeyboardAccessoryViewID}>{inputView}</InputAccessoryView>;
  }

  const androidTop = computeAndroidAccessoryTop(keyboardTop, anchorScreenY);

  return (
    <View pointerEvents="box-none" style={[styles.androidFloating, { top: androidTop, height: BAR_HEIGHT }]}>
      {inputView}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    maxHeight: BAR_HEIGHT,
    alignItems: 'center',
    overflow: 'hidden',
  },
  rootIOS: {
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 20,
  },
  rootAndroid: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionsContainer: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    height: BAR_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  suggestionsScroll: {
    ...StyleSheet.absoluteFill,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 2,
    elevation: 2,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 2,
    elevation: 2,
  },
  fadeGradient: {
    flex: 1,
    width: 24,
    height: '100%',
  },
  suggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    minHeight: BAR_HEIGHT,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipPressed: {
    opacity: 0.6,
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  doneIOS: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: BAR_HEIGHT,
    justifyContent: 'center',
  },
  doneAndroid: {
    paddingHorizontal: 12,
    minHeight: BAR_HEIGHT,
    justifyContent: 'center',
  },
  doneTitle: {
    fontWeight: '500',
  },
  androidFloating: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
});

export default ImportWalletKeyboardAccessory;
