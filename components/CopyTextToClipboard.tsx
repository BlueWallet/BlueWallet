import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextProps, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import BlueText from './BlueText';
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

const COPY_FEEDBACK_MS = 1500;

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
    const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addressSectionStyle = useMemo<TextStyle>(
      () => ({
        color: colors.alternativeTextColor2,
        fontWeight: '500',
      }),
      [colors.alternativeTextColor2],
    );

    useEffect(() => {
      if (!hasTappedText) {
        setDisplayText(displayTextProp || text);
      }
    }, [text, displayTextProp, hasTappedText]);

    useEffect(
      () => () => {
        if (copyResetTimeoutRef.current) {
          clearTimeout(copyResetTimeoutRef.current);
          copyResetTimeoutRef.current = null;
        }
      },
      [],
    );

    const copyToClipboard = useCallback(
      (options?: { suppressHaptic?: boolean }) => {
        // Don't copy if already showing the copied state, or text is empty / "-"
        if (hasTappedText || !text || text === '-') {
          return;
        }

        if (copyResetTimeoutRef.current) {
          clearTimeout(copyResetTimeoutRef.current);
          copyResetTimeoutRef.current = null;
        }

        setHasTappedText(true);
        Clipboard.setString(text);
        if (!options?.suppressHaptic) {
          triggerHapticFeedback(HapticFeedbackTypes.Selection);
        }
        setDisplayText(loc._.copied);
        copyResetTimeoutRef.current = setTimeout(() => {
          copyResetTimeoutRef.current = null;
          setHasTappedText(false);
          setDisplayText(displayTextProp || text);
        }, COPY_FEEDBACK_MS);
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
            <Text style={addressSectionStyle}>{start}</Text>
            <Text>{middle}</Text>
            <Text style={addressSectionStyle}>{end}</Text>
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
          <Text style={addressSectionStyle}>{displayText.slice(0, 6)}</Text>
          <Text>{displayText.slice(6, -6)}</Text>
          <Text style={addressSectionStyle}>{displayText.slice(-6)}</Text>
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
