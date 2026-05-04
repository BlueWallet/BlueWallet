import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, Text, TextProps, TouchableOpacity, View, ViewStyle } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueText } from '../BlueComponents';
import loc from '../loc';
import { useTheme } from './themes';

export type CopyTextToClipboardHandle = {
  copy: (options?: { suppressHaptic?: boolean }) => void;
};

type CopyTextToClipboardProps = TextProps & {
  text: string;
  displayText?: string; // Optional text to display instead of the actual text (but still copies the actual text)
  truncated?: boolean;
  selectable?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'auto' | 'justify';
  containerStyle?: ViewStyle;
  isAddress?: boolean;
  interactive?: boolean;
  buttonTestID?: string;
  textTestID?: string;
};

const styles = StyleSheet.create({
  defaultTextStyle: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  /** Receive address row and `isAddress` paths: matches master `address` style (no large margins). */
  addressDefaultTextStyle: {
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  textFillContainer: {
    width: '100%',
    minWidth: 0,
  },
  nonInteractiveContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const CopyTextToClipboard = forwardRef<CopyTextToClipboardHandle, CopyTextToClipboardProps>(
  (
    {
      text,
      displayText: displayTextProp,
      truncated,
      style,
      numberOfLines,
      ellipsizeMode,
      selectable,
      textAlign,
      containerStyle,
      accessibilityLabel,
      isAddress,
      interactive = true,
      buttonTestID = 'CopyTextToClipboard',
      textTestID = 'AddressValue',
      ...textProps
    },
    ref,
  ) => {
    const [hasTappedText, setHasTappedText] = useState(false);
    const initialDisplayText = displayTextProp || text;
    const [displayText, setDisplayText] = useState(initialDisplayText);
    const isCopiedState = hasTappedText && displayText === loc._.copied;
    const { colors } = useTheme();

    const stylesHook = StyleSheet.create({
      addressSection: {
        color: colors.alternativeTextColor2,
        fontWeight: '500',
      },
    });

    useEffect(() => {
      if (!hasTappedText) {
        setDisplayText(displayTextProp || text);
      }
    }, [text, displayTextProp, hasTappedText]);

    const copyToClipboard = useCallback(
      (options?: { suppressHaptic?: boolean }) => {
        // Don't copy if already showing the copied state, or text is empty / "-"
        if (hasTappedText || !text || text === '-') {
          return;
        }

        setHasTappedText(true);
        Clipboard.setString(text);
        if (!options?.suppressHaptic) {
          triggerHapticFeedback(HapticFeedbackTypes.Selection);
        }
        setDisplayText(loc._.copied);
        setTimeout(() => {
          setHasTappedText(false);
          setDisplayText(displayTextProp || text);
        }, 1500);
      },
      [hasTappedText, text, displayTextProp],
    );

    useImperativeHandle(ref, () => ({ copy: copyToClipboard }), [copyToClipboard]);

    /** Single-line value for screen readers / Detox `by.label` when visual text uses newlines or splits (e.g. receive address). */
    const accessibilityLabelResolved = accessibilityLabel ?? (isCopiedState ? loc._.copied : text);

    const mergedTextStyle = style ?? (isAddress ? styles.addressDefaultTextStyle : styles.defaultTextStyle);
    const textAlignStyle = textAlign ? { textAlign } : undefined;
    const finalNumberOfLines = isCopiedState ? 1 : numberOfLines !== undefined ? numberOfLines : truncated ? 1 : 0;
    const finalEllipsizeMode = isCopiedState ? undefined : ellipsizeMode || (truncated ? 'middle' : undefined);

    const textStyleArray =
      containerStyle && !isCopiedState ? [mergedTextStyle, styles.textFillContainer, textAlignStyle] : [mergedTextStyle, textAlignStyle];

    const renderHighlightedAddress = () => {
      // While showing the "Copied!" feedback, render plain text without highlights.
      if (isCopiedState) {
        return (
          <BlueText
            style={textStyleArray}
            numberOfLines={finalNumberOfLines}
            ellipsizeMode={finalEllipsizeMode}
            selectable={selectable}
            {...textProps}
            testID={textTestID}
          >
            {displayText}
          </BlueText>
        );
      }

      if (displayText.toLocaleLowerCase().startsWith('bitcoin:')) {
        const prefix = displayText.slice(0, 8); // "bitcoin:"
        const afterPrefix = displayText.slice(8);
        const qIndex = afterPrefix.indexOf('?');
        const addrPart = qIndex === -1 ? afterPrefix : afterPrefix.slice(0, qIndex);
        const queryPart = qIndex === -1 ? '' : afterPrefix.slice(qIndex);
        const start = addrPart.slice(0, 6);
        const middle = addrPart.slice(6, -6);
        const end = addrPart.slice(-6);

        return (
          <BlueText
            style={textStyleArray}
            numberOfLines={finalNumberOfLines}
            ellipsizeMode={finalEllipsizeMode}
            selectable={selectable}
            {...textProps}
            testID={textTestID}
          >
            <Text>{prefix}</Text>
            <Text style={stylesHook.addressSection}>{start}</Text>
            <Text>{middle}</Text>
            <Text style={stylesHook.addressSection}>{end}</Text>
            <Text>{queryPart}</Text>
          </BlueText>
        );
      }

      return (
        <BlueText
          style={textStyleArray}
          numberOfLines={finalNumberOfLines}
          ellipsizeMode={finalEllipsizeMode}
          selectable={selectable}
          {...textProps}
          testID={textTestID}
        >
          <Text style={stylesHook.addressSection}>{displayText.slice(0, 6)}</Text>
          <Text>{displayText.slice(6, -6)}</Text>
          <Text style={stylesHook.addressSection}>{displayText.slice(-6)}</Text>
        </BlueText>
      );
    };

    const textContent = isAddress ? (
      renderHighlightedAddress()
    ) : (
      <BlueText
        style={textStyleArray}
        numberOfLines={finalNumberOfLines}
        ellipsizeMode={finalEllipsizeMode}
        selectable={selectable}
        {...textProps}
        testID={textTestID}
      >
        {displayText}
      </BlueText>
    );

    if (!interactive) {
      return (
        <View
          style={containerStyle ?? styles.nonInteractiveContainer}
          testID={buttonTestID}
          accessible
          accessibilityRole="text"
          accessibilityLabel={accessibilityLabelResolved}
        >
          {textContent}
        </View>
      );
    }

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabelResolved}
        onPress={() => copyToClipboard()}
        disabled={hasTappedText || !text || text === '-'}
        testID={buttonTestID}
        activeOpacity={0.7}
        style={containerStyle}
      >
        {containerStyle ? <View style={containerStyle}>{textContent}</View> : textContent}
      </TouchableOpacity>
    );
  },
);

export default CopyTextToClipboard;
