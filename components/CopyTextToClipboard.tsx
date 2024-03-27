import Clipboard from '@react-native-clipboard/clipboard';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
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

export const CopyTextToClipboard: React.FC<CopyTextToClipboardProps> = ({ text, truncated }) => {
  const [hasTappedText, setHasTappedText] = useState(false);
  const [address, setAddress] = useState(text);

  // Replace `getDerivedStateFromProps`
  useEffect(() => {
    if (!hasTappedText) {
      setAddress(text);
    }
  }, [text, hasTappedText]);

  const copyToClipboard = () => {
    setHasTappedText(true);
    Clipboard.setString(text);
    setAddress(loc.wallets.xpub_copiedToClipboard); // Replace with your localization logic if needed
    setTimeout(() => {
      setHasTappedText(false);
      setAddress(text);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity accessibilityRole="button" onPress={copyToClipboard} disabled={hasTappedText} testID="CopyTextToClipboard">
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
};

export default CopyTextToClipboard;

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
});
