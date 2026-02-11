import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, TextProps, TouchableOpacity, View } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueText } from '../BlueComponents';

type CopyTextToClipboardProps = TextProps & {
  text: string;
  displayText?: string; // Optional text to display instead of the actual text (but still copies the actual text)
  truncated?: boolean;
  selectable?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'auto' | 'justify';
};

const styles = StyleSheet.create({
  defaultTextStyle: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  defaultContainerStyle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
      ...textProps
    },
    ref,
  ) => {
    const [hasTappedText, setHasTappedText] = useState(false);
    const initialDisplayText = displayTextProp || text;
    const [displayText, setDisplayText] = useState(initialDisplayText);

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
      }, 1000);
    };

    const useDefaultStyles = !style;
    const mergedTextStyle = useDefaultStyles ? styles.defaultTextStyle : style;
    const finalNumberOfLines = numberOfLines !== undefined ? numberOfLines : truncated ? 1 : 0;
    const finalEllipsizeMode = ellipsizeMode || (truncated ? 'middle' : undefined);

    const content = (
      <TouchableOpacity
        ref={ref}
        accessibilityRole="button"
        onPress={copyToClipboard}
        disabled={hasTappedText || !text || text === '-'}
        testID="CopyTextToClipboard"
        activeOpacity={0.7}
      >
        <BlueText
          style={mergedTextStyle}
          numberOfLines={finalNumberOfLines}
          ellipsizeMode={finalEllipsizeMode}
          selectable={selectable}
          textAlign={textAlign}
          {...textProps}
          testID="AddressValue"
        >
          {displayText}
        </BlueText>
      </TouchableOpacity>
    );

    if (useDefaultStyles) {
      return <View style={styles.defaultContainerStyle}>{content}</View>;
    }
    return content;
  },
);

export default CopyTextToClipboard;
