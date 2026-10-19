import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import BlueButtonLink from './BlueButtonLink';
import loc from '../loc';
import { useTheme } from './themes';
import Clipboard from '@react-native-clipboard/clipboard';
import { isIOS26OrHigher } from '../blue_modules/environment';
import { withAlpha } from './color';

export const KEYBOARD_ACCESSORY_BAR_HEIGHT = 44;

const BAR_HEIGHT = KEYBOARD_ACCESSORY_BAR_HEIGHT;

interface DoneAndDismissKeyboardInputAccessoryProps {
  onPasteTapped: (clipboard: string) => void;
  onClearTapped: () => void;
  suggestions?: string[];
  onSuggestionTapped?: (word: string) => void;
}

export const DoneAndDismissKeyboardInputAccessoryViewID = 'DoneAndDismissKeyboardInputAccessory';

export const DoneAndDismissKeyboardInputAccessory: React.FC<DoneAndDismissKeyboardInputAccessoryProps> = props => {
  const { colors } = useTheme();
  const isDark = useColorScheme() === 'dark';
  const isSuggestionMode = props.onSuggestionTapped != null;
  const useIos26Capsule = isSuggestionMode && isIOS26OrHigher;

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

  const onPasteTapped = async () => {
    const clipboard = await Clipboard.getString();
    props.onPasteTapped(clipboard);
  };

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionsScroll}
        contentContainerStyle={styles.suggestionsContent}
        keyboardShouldPersistTaps="always"
      >
        {props.suggestions?.map(word => (
          <Pressable
            key={word}
            accessibilityRole="button"
            accessibilityLabel={word}
            testID={`Bip39Suggestion-${word}`}
            onPress={() => props.onSuggestionTapped?.(word)}
            style={({ pressed }) => [styles.chip, styleHooks.chip, pressed && styles.chipPressed]}
          >
            <Text style={[styles.chipText, styleHooks.chipText]}>{word}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {useIos26Capsule ? (
        <Pressable
          accessibilityRole="button"
          onPress={Keyboard.dismiss}
          style={({ pressed }) => [styles.doneIos26, pressed && styles.chipPressed]}
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

  if (Platform.OS === 'ios') {
    return <InputAccessoryView nativeID={DoneAndDismissKeyboardInputAccessoryViewID}>{inputView}</InputAccessoryView>;
  } else {
    return inputView;
  }
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
