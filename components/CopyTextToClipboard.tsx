import Clipboard from '@react-native-clipboard/clipboard';
import React, { forwardRef, useEffect, useState } from 'react';
import { TextProps, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueText } from '../BlueComponents';

type CopyTextToClipboardProps = TextProps & {
  text: string;
  displayText?: string; // Optional text to display instead of the actual text (but still copies the actual text)
  truncated?: boolean;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'auto' | 'justify';
};

const defaultTextStyle: TextStyle = {
  marginVertical: 32,
  fontSize: 15,
  color: '#9aa0aa',
  textAlign: 'center',
};

const defaultContainerStyle: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 16,
};

const CopyTextToClipboard = forwardRef<React.ElementRef<typeof TouchableOpacity>, CopyTextToClipboardProps>(
  (
    {
      text,
      displayText: displayTextProp,
      truncated,
      style,
      containerStyle,
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

    // Determine if we should use default styles or custom styles
    const useDefaultStyles = !style && !containerStyle;
    const mergedTextStyle = useDefaultStyles ? defaultTextStyle : style;
    const mergedContainerStyle = useDefaultStyles ? defaultContainerStyle : containerStyle || {};

    // Determine numberOfLines and ellipsizeMode
    const finalNumberOfLines = numberOfLines !== undefined ? numberOfLines : truncated ? 1 : 0;
    const finalEllipsizeMode = ellipsizeMode || (truncated ? 'middle' : undefined);

    return (
      <View style={mergedContainerStyle}>
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
      </View>
    );
  },
);

export default CopyTextToClipboard;
