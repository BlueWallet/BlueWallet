import React, { useCallback } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import BlueButtonLink from './BlueButtonLink';
import { KEYBOARD_ACCESSORY_BAR_HEIGHT } from './keyboardAccessory';
import loc from '../loc';

interface KeyboardAccessoryClearPasteDoneProps {
  onPasteTapped: (clipboard: string) => void;
  onClearTapped: () => void;
}

/** Pure Clear / Paste / Done bar content for KeyboardAccessoryDock (chrome lives on the dock). */
const KeyboardAccessoryClearPasteDone: React.FC<KeyboardAccessoryClearPasteDoneProps> = ({ onPasteTapped, onClearTapped }) => {
  const handlePaste = useCallback(async () => {
    const clipboard = await Clipboard.getString();
    onPasteTapped(clipboard);
  }, [onPasteTapped]);

  return (
    <View style={styles.container}>
      <BlueButtonLink title={loc.send.input_clear} onPress={onClearTapped} />
      <BlueButtonLink title={loc.send.input_paste} onPress={handlePaste} />
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
});

export default KeyboardAccessoryClearPasteDone;
