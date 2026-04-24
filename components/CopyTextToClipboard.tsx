import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, TextProps, TouchableOpacity, View, ViewStyle } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueText } from '../BlueComponents';

type CopyTextToClipboardProps = TextProps & {
  text: string;
  displayText?: string; // Optional text to display instead of the actual text (but still copies the actual text)
  truncated?: boolean;
  selectable?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'auto' | 'justify';
  containerStyle?: ViewStyle;
  isAddress?: boolean;
};
const styles = StyleSheet.create({
  defaultTextStyle: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  textFillContainer: {
    width: '100%',
    minWidth: 0,
  },
});

const CopyTextToClipboard = forwardRef<React.ElementRef<typeof TouchableOpacity>, CopyTextToClipboardProps>(
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
      ...textProps
    },
    ref,
  ) => {
    const [hasTappedText, setHasTappedText] = useState(false);
    const initialDisplayText = displayTextProp || text;
    const [displayText, setDisplayText] = useState(initialDisplayText);
    const isCopiedState = hasTappedText && displayText === 'copied!';

    useEffect(() => {
      if (!hasTappedText) {
        setDisplayText(displayTextProp || text);
      }
    }, [text, displayTextProp, hasTappedText]);

    const copyToClipboard = () => {
      // Don't copy if text is empty or just "-"
      if (!text || text === '-') {
        return;
      }

      setHasTappedText(true);
      Clipboard.setString(text);
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      setDisplayText('copied!');
      setTimeout(() => {
        setHasTappedText(false);
        setDisplayText(displayTextProp || text);
      }, 1500);
    };

    const mergedTextStyle = style || styles.defaultTextStyle;
    const textAlignStyle = textAlign ? { textAlign } : undefined;
    const finalNumberOfLines = isCopiedState ? 1 : numberOfLines !== undefined ? numberOfLines : truncated ? 1 : 0;
    const finalEllipsizeMode = isCopiedState ? undefined : ellipsizeMode || (truncated ? 'middle' : undefined);

    // When containerStyle is used (e.g. fixed width for ellipsis), wrap Text in a View with that
    // width so Android constrains the Text and applies ellipsis instead of wrapping (long IDs).
    const textContent = (
      <BlueText
        style={containerStyle && !isCopiedState ? [mergedTextStyle, styles.textFillContainer, textAlignStyle] : [mergedTextStyle, textAlignStyle]}
        numberOfLines={finalNumberOfLines}
        ellipsizeMode={finalEllipsizeMode}
        selectable={selectable}
        {...textProps}
        testID="AddressValue"
      >
        {displayText}
      </BlueText>
    );

    return (
      <TouchableOpacity
        ref={ref}
        accessibilityRole="button"
        onPress={copyToClipboard}
        disabled={hasTappedText || !text || text === '-'}
        testID="CopyTextToClipboard"
        activeOpacity={0.7}
        style={containerStyle}
      >
        {containerStyle ? <View style={containerStyle}>{textContent}</View> : textContent}
      </TouchableOpacity>
    );
  },
);

export default CopyTextToClipboard;
