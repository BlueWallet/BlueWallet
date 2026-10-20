import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import BlueButtonLink from './BlueButtonLink';
import { KEYBOARD_ACCESSORY_BAR_HEIGHT } from './keyboardAccessory';
import { useTheme } from './themes';
import { isIOS26OrHigher } from '../blue_modules/environment';
import loc from '../loc';

/** Pure Done bar content for KeyboardAccessoryDock (chrome lives on the dock). */
const KeyboardAccessoryDone: React.FC = () => {
  const { colors } = useTheme();
  const useIosCapsule = isIOS26OrHigher;
  const styleHooks = StyleSheet.create({
    doneText: {
      color: colors.foregroundColor,
    },
  });

  if (useIosCapsule) {
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          onPress={Keyboard.dismiss}
          style={({ pressed }) => [styles.doneIos26, pressed && styles.donePressed]}
        >
          <Text style={[styles.doneIos26Text, styleHooks.doneText]}>{loc.send.input_done}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlueButtonLink title={loc.send.input_done} onPress={Keyboard.dismiss} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: KEYBOARD_ACCESSORY_BAR_HEIGHT,
  },
  doneIos26: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: KEYBOARD_ACCESSORY_BAR_HEIGHT,
    justifyContent: 'center',
  },
  doneIos26Text: {
    fontSize: 16,
    fontWeight: '500',
  },
  donePressed: {
    opacity: 0.6,
  },
});

export default KeyboardAccessoryDone;
