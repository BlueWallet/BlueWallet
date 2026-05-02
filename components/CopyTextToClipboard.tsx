import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { useTheme } from './themes';

export type CopyTextToClipboardHandle = {
  copy: (options?: { suppressHaptic?: boolean }) => void;
};

type CopyTextToClipboardProps = {
  text: string;
  displayText?: string;
  truncated?: boolean;
  isAddress?: boolean;
  interactive?: boolean;
};

const CopyTextToClipboard = forwardRef<CopyTextToClipboardHandle, CopyTextToClipboardProps>(
  ({ text, displayText, truncated, isAddress, interactive = true }, ref) => {
    const [hasTappedText, setHasTappedText] = useState(false);
    const resolvedDisplayText = displayText ?? text;
    const [address, setAddress] = useState(resolvedDisplayText);
    const { colors } = useTheme();

    const stylesHook = StyleSheet.create({
      addressSection: {
        color: colors.alternativeTextColor2,
        fontWeight: '500',
      },
    });

    useEffect(() => {
      if (!hasTappedText) {
        setAddress(resolvedDisplayText);
      }
    }, [resolvedDisplayText, hasTappedText]);

    const copyToClipboard = useCallback(
      (options?: { suppressHaptic?: boolean }) => {
        setHasTappedText(true);
        Clipboard.setString(text);
        if (!options?.suppressHaptic) {
          triggerHapticFeedback(HapticFeedbackTypes.Selection);
        }
        setAddress(loc.wallets.xpub_copiedToClipboard);
        setTimeout(() => {
          setHasTappedText(false);
          setAddress(resolvedDisplayText);
        }, 1800);
      },
      [text, resolvedDisplayText],
    );

    useImperativeHandle(ref, () => ({ copy: copyToClipboard }), [copyToClipboard]);

    /** Single-line value for screen readers / Detox `by.label` when visual text uses newlines or splits (e.g. receive address). */
    const accessibilityLabelResolved = hasTappedText ? loc.wallets.xpub_copiedToClipboard : text;

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

    const content = isAddress ? (
      renderHighlightedAddress()
    ) : (
      <Animated.Text
        style={styles.address}
        {...(truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
        testID="AddressValue"
      >
        {address}
      </Animated.Text>
    );

    if (!interactive) {
      return (
        <View
          style={styles.container}
          testID="CopyTextToClipboard"
          accessible
          accessibilityRole="text"
          accessibilityLabel={accessibilityLabelResolved}
        >
          {content}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <TouchableOpacity
          accessibilityRole="button"
          accessible
          accessibilityLabel={accessibilityLabelResolved}
          onPress={() => copyToClipboard()}
          disabled={hasTappedText}
          testID="CopyTextToClipboard"
        >
          {content}
        </TouchableOpacity>
      </View>
    );
  },
);

export default CopyTextToClipboard;

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  address: {
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
});
