import Clipboard from '@react-native-clipboard/clipboard';
import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';

type CopyToClipboardButtonProps = {
  stringToCopy: string;
  displayText?: string;
};

export const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ stringToCopy, displayText }) => {
  const onPress = () => {
    Clipboard.setString(stringToCopy);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  };

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Text style={styles.text}>{displayText && displayText.length > 0 ? displayText : loc.transactions.details_copy}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: { fontSize: 16, fontWeight: '400', color: '#68bbe1' },
  pressed: {
    opacity: 0.6,
  },
});

export default CopyToClipboardButton;
