import React from 'react';
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
import BlueButtonLink from './BlueButtonLink';
import loc from '../loc';
import { useTheme } from './themes';
import { withAlpha } from './color';

export const IMPORT_WALLET_ACCESSORY_BAR_HEIGHT = 44;

/** Extra lift above IME-reported keyboard top on Android. Tune on device if misaligned. */
export const ANDROID_KEYBOARD_TOP_EXTRA_OFFSET = 24;

const BAR_HEIGHT = IMPORT_WALLET_ACCESSORY_BAR_HEIGHT;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeAndroidAccessoryTop(keyboardTop: number, anchorScreenY: number, windowHeight: number): number {
  const unclamped = keyboardTop - anchorScreenY - BAR_HEIGHT - ANDROID_KEYBOARD_TOP_EXTRA_OFFSET;
  return clamp(unclamped, 0, Math.max(0, windowHeight - BAR_HEIGHT));
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
  keyboardScreenY?: number;
  keyboardHeight?: number;
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

  const keyboardTop = isAndroid ? computeKeyboardTop(keyboardScreenY, keyboardHeight, windowHeight) : 0;

  const inputView = (
    <View
      style={[styles.root, isAndroid ? styles.rootAndroid : styles.rootIOS, isAndroid && stylesHook.androidSeparator, stylesHook.root]}
      testID="ImportWalletKeyboardAccessoryBar"
    >
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

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.androidFloating,
        {
          top: computeAndroidAccessoryTop(keyboardTop, anchorScreenY, windowHeight),
          height: BAR_HEIGHT,
        },
      ]}
    >
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
  suggestionsScroll: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
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
