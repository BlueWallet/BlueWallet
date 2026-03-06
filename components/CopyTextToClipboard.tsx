import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View, Text } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { useTheme } from './themes';

type CopyTextToClipboardProps = {
  text: string;
  truncated?: boolean;
  isAddress?: boolean;
};

const CopyTextToClipboard = forwardRef<React.ElementRef<typeof TouchableOpacity>, CopyTextToClipboardProps>(
  ({ text, truncated, isAddress }, ref) => {
    const [hasTappedText, setHasTappedText] = useState(false);
    const [address, setAddress] = useState(text);
    const { colors } = useTheme();

    const stylesHook = StyleSheet.create({
      addressSection: {
        color: colors.alternativeTextColor2,
        fontWeight: '500',
      },
    });

    useEffect(() => {
      if (!hasTappedText) {
        setAddress(text);
      }
    }, [text, hasTappedText]);

    const copyToClipboard = () => {
      setHasTappedText(true);
      Clipboard.setString(text);
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      setAddress(loc.wallets.xpub_copiedToClipboard);
      setTimeout(() => {
        setHasTappedText(false);
        setAddress(text);
      }, 1000);
    };

    const renderHighlightedAddress = () => {
      if (address.includes(loc.wallets.xpub_copiedToClipboard)) {
        return (
          <Animated.Text
            style={styles.address}
            {...(truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
            testID="AddressValue"
          >
            {address}
          </Animated.Text>
        );
      }
      if (address.toLocaleLowerCase().startsWith('bitcoin:')) {
        const prefix = address.slice(0, 8); // "bitcoin:"
        const afterPrefix = address.slice(8);

        const qIndex = afterPrefix.indexOf('?');

        const addrPart = qIndex === -1 ? afterPrefix : afterPrefix.slice(0, qIndex);

        const queryPart = qIndex === -1 ? '' : afterPrefix.slice(qIndex);

        const start = addrPart.slice(0, 6);
        const middle = addrPart.slice(6, -6);
        const end = addrPart.slice(-6);

        return (
          <Animated.Text style={styles.address} numberOfLines={truncated ? 1 : 0} ellipsizeMode="middle" testID="AddressValue">
            <Text>{prefix}</Text>

            <Text style={stylesHook.addressSection}>{start}</Text>

            <Text>{middle}</Text>

            <Text style={stylesHook.addressSection}>{end}</Text>

            <Text>{queryPart}</Text>
          </Animated.Text>
        );
      }

      return (
        <Animated.Text
          style={styles.address}
          {...(truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
          testID="AddressValue"
        >
          <Text style={stylesHook.addressSection}>{address.slice(0, 6)}</Text>
          <Text>{address.slice(6, -6)}</Text>
          <Text style={stylesHook.addressSection}>{address.slice(-6)}</Text>
        </Animated.Text>
      );
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
          {isAddress ? (
            <>{renderHighlightedAddress()}</>
          ) : (
            <Animated.Text
              style={styles.address}
              {...(truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
              testID="AddressValue"
            >
              {address}
            </Animated.Text>
          )}
        </TouchableOpacity>
      </View>
    );
  },
);

export default CopyTextToClipboard;

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  address: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
});
