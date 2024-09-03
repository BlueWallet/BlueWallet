import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

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

const CopyTextToClipboard = forwardRef<React.ElementRef<typeof TouchableOpacity>, CopyTextToClipboardProps>(({ text, truncated }, ref) => {
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
      <TouchableOpacity
        ref={ref}
        accessibilityRole="button"
        onPress={copyToClipboard}
        disabled={hasTappedText}
        testID="CopyTextToClipboard"
      >
        <Animated.Text
          style={styleCopyTextToClipboard.address}
          {...(truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
          testID="AddressValue"
        >
          {address}
        </Animated.Text>
      </TouchableOpacity>
    </View>
  );
});

export default CopyTextToClipboard;

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
});
