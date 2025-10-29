import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useEffect, useState } from 'react';
import { Animated, StyleSheet, Pressable, View } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';

type CopyTextToClipboardProps = {
  text: string;
  truncated?: boolean;
};

const styleCopyTextToClipboard = StyleSheet.create({
  address: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
});

const CopyTextToClipboard = forwardRef<React.ElementRef<typeof Pressable>, CopyTextToClipboardProps>(({ text, truncated }, ref) => {
  const [hasTappedText, setHasTappedText] = useState(false);
  const [address, setAddress] = useState(text);

  useEffect(() => {
    if (!hasTappedText) {
      setAddress(text);
    }
  }, [text, hasTappedText]);

  const copyToClipboard = () => {
    setHasTappedText(true);
    Clipboard.setString(text);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    setAddress(loc.wallets.xpub_copiedToClipboard); // Adjust according to your localization logic
    setTimeout(() => {
      setHasTappedText(false);
      setAddress(text);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Pressable
        ref={ref}
        accessibilityRole="button"
        onPress={copyToClipboard}
        disabled={hasTappedText}
        testID="CopyTextToClipboard"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Animated.Text
          style={styleCopyTextToClipboard.address}
          {...(truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
          testID="AddressValue"
        >
          {address}
        </Animated.Text>
      </Pressable>
    </View>
  );
});

export default CopyTextToClipboard;

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  pressed: {
    opacity: 0.6,
  },
});
