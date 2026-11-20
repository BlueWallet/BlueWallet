import React from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from './themes';
import BlueButtonLink from './BlueButtonLink';
import loc from '../loc';

interface DismissKeyboardInputAccessoryProps {
  nativeID?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}

export const DismissKeyboardInputAccessoryViewID = 'DismissKeyboardInputAccessory';
export const DismissKeyboardInputAccessory: React.FC<DismissKeyboardInputAccessoryProps> = ({
  nativeID = DismissKeyboardInputAccessoryViewID,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}) => {
  const { colors } = useTheme();
  const styleHooks = StyleSheet.create({
    container: {
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={[styles.container, styleHooks.container]}>
        {onPrevious ? (
          <BlueButtonLink
            title={loc.send.dynamic_prev}
            onPress={onPrevious}
            disabled={previousDisabled}
            accessibilityLabel={loc.send.dynamic_prev}
            accessibilityState={{ disabled: previousDisabled }}
            testID="KeyboardPreviousButton"
          />
        ) : null}
        {onNext ? (
          <BlueButtonLink
            title={loc.send.dynamic_next}
            onPress={onNext}
            disabled={nextDisabled}
            accessibilityLabel={loc.send.dynamic_next}
            accessibilityState={{ disabled: nextDisabled }}
            testID="KeyboardNextButton"
          />
        ) : null}
        <View style={styles.spacer} />
        <BlueButtonLink
          title={loc.send.input_done}
          onPress={Keyboard.dismiss}
          accessibilityLabel={loc.send.input_done}
          testID="KeyboardDoneButton"
        />
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  spacer: { flex: 1 },
});
