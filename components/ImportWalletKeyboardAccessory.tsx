import React, { useMemo } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import BlueButtonLink from './BlueButtonLink';
import loc from '../loc';
import { useTheme } from './themes';
import { withAlpha } from './color';

const FADE_WIDTH = 24;
const BAR_HEIGHT = 44;

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

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.inputBackgroundColor,
    },
    chip: {
      backgroundColor: withAlpha(colors.shadowColor, 0.06),
    },
    chipText: {
      color: colors.alternativeTextColor,
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

  // On edge-to-edge Android, screenY can sit below the visible keyboard top; derive from window height when possible.
  const keyboardTop = useMemo(() => {
    if (Platform.OS !== 'android' || keyboardHeight <= 0) {
      return keyboardScreenY;
    }
    const topFromHeight = windowHeight - keyboardHeight;
    if (keyboardScreenY <= 0) {
      return topFromHeight;
    }
    return Math.min(keyboardScreenY, topFromHeight);
  }, [keyboardHeight, keyboardScreenY, windowHeight]);

  const inputView = (
    <View style={[styles.root, stylesHook.root]} testID="ImportWalletKeyboardAccessoryBar">
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
              <Text style={[styles.chipText, stylesHook.chipText]}>{word}</Text>
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
        <BlueButtonLink style={styles.done} title={loc.send.input_done} onPress={onDone} />
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return <InputAccessoryView nativeID={ImportWalletKeyboardAccessoryViewID}>{inputView}</InputAccessoryView>;
  }

  // Edge-to-edge Android: keyboardTop tracks the IME frame, not the visible key row — needs 2× bar height offset.
  const androidTop = keyboardTop - anchorScreenY - BAR_HEIGHT * 2;

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
    maxHeight: 44,
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  suggestionsContainer: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    height: 44,
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
    width: FADE_WIDTH,
    zIndex: 2,
    elevation: 2,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
    zIndex: 2,
    elevation: 2,
  },
  fadeGradient: {
    flex: 1,
    width: FADE_WIDTH,
    height: '100%',
  },
  suggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 44,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipPressed: {
    opacity: 0.6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  done: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
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
