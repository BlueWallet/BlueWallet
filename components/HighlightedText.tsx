import React, { useCallback, useRef, useEffect } from 'react';
import { Text, Animated, StyleSheet, Platform, TextStyle } from 'react-native';
import { useTheme } from './themes';

interface HighlightedTextProps {
  text: string;
  query: string;
  numberOfLines?: number;
  style?: TextStyle | TextStyle[];
  highlightStyle?: TextStyle;
  bounceAnim?: Animated.Value;
  caseSensitive?: boolean;
  highlightOnlyFirstMatch?: boolean;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  query,
  numberOfLines,
  style,
  highlightStyle,
  bounceAnim: externalBounceAnim,
  caseSensitive = false,
  highlightOnlyFirstMatch = false,
}) => {
  const { colors } = useTheme();
  const internalBounceAnim = useRef(new Animated.Value(1)).current;

  const bounceAnim = externalBounceAnim || internalBounceAnim;

  useEffect(() => {
    if (!externalBounceAnim && Platform.OS === 'ios' && query) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.07,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 4,
          tension: 20,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [query, bounceAnim, externalBounceAnim]);

  const renderHighlightedText = useCallback(() => {
    if (!query) {
      return (
        <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
          {text}
        </Text>
      );
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();

    if (escapedQuery === '') {
      return (
        <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
          {text}
        </Text>
      );
    }

    try {
      if (escapedQuery.length === 1 && highlightOnlyFirstMatch) {
        const searchChar = caseSensitive ? escapedQuery : escapedQuery.toLowerCase();
        const processedText = caseSensitive ? text : text.toLowerCase();

        const index = processedText.indexOf(searchChar);

        if (index === -1) {
          return (
            <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
              {text}
            </Text>
          );
        }

        const before = text.substring(0, index);
        const match = text.substring(index, index + 1);
        const after = text.substring(index + 1);

        return (
          <Text numberOfLines={numberOfLines} style={style || styles.defaultText}>
            {before}
            <Animated.View style={[styles.highlightedContainer, styles.singleCharacterContainer, { transform: [{ scale: bounceAnim }] }]}>
              <Text
                style={[
                  styles.highlighted,
                  Platform.OS === 'ios' ? styles.iOSHighlight : styles.androidHighlight,
                  styles.singleCharacterText,
                  highlightStyle,
                ]}
              >
                {match}
              </Text>
            </Animated.View>
            {after}
          </Text>
        );
      }

      const queryWithFlexibleWhitespace = escapedQuery.replace(/\s+/g, '\\s+');

      let regex: RegExp;
      try {
        regex = new RegExp(`(${queryWithFlexibleWhitespace})`, caseSensitive ? 'g' : 'gi');
      } catch (error) {
        return (
          <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
            {text}
          </Text>
        );
      }

      const parts = text.split(regex).filter(Boolean);

      const isExactMatch = (part: string): boolean => {
        if (caseSensitive) {
          regex.lastIndex = 0;
          return regex.test(part);
        } else {
          return part.toLowerCase().includes(escapedQuery.toLowerCase());
        }
      };

      return (
        <Text numberOfLines={numberOfLines} style={style}>
          {parts.map((part, index) => {
            const isMatch = isExactMatch(part);

            if (isMatch) {
              const isFirstHighlight = index === 0 || !isExactMatch(parts[index - 1]);
              const isLastHighlight = index === parts.length - 1 || !isExactMatch(parts[index + 1]);

              const highlightContainerStyle = [
                styles.highlightedContainer,
                isFirstHighlight && styles.firstHighlightContainer,
                isLastHighlight && styles.lastHighlightContainer,
                !isFirstHighlight && !isLastHighlight && styles.middleHighlightContainer,
                Platform.OS === 'ios' ? { transform: [{ scale: bounceAnim }] } : { backgroundColor: colors.brandingColor + '30' },
              ];

              const highlightTextStyle = [
                styles.highlighted,
                Platform.OS === 'ios' ? styles.iOSHighlight : styles.androidHighlight,
                isFirstHighlight && styles.firstHighlightText,
                isLastHighlight && styles.lastHighlightText,
                !isFirstHighlight && !isLastHighlight && styles.middleHighlightText,
                highlightStyle,
              ];

              return (
                <Animated.View key={`${index}-${part}`} style={highlightContainerStyle}>
                  <Text style={highlightTextStyle}>{part}</Text>
                </Animated.View>
              );
            } else {
              return (
                <Text key={`${index}-${part}`} style={[query ? styles.dimmedText : styles.defaultText, style]}>
                  {part}
                </Text>
              );
            }
          })}
        </Text>
      );
    } catch (e) {
      console.warn('Error in HighlightedText:', e);
      return (
        <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
          {text}
        </Text>
      );
    }
  }, [query, text, bounceAnim, colors.brandingColor, numberOfLines, style, highlightStyle, caseSensitive, highlightOnlyFirstMatch]);

  return renderHighlightedText();
};

const styles = StyleSheet.create({
  dimmedText: {
    opacity: 0.8,
  },
  defaultText: {
    fontSize: 19,
    fontWeight: '600',
  },
  highlighted: {
    fontSize: 19,
    fontWeight: '600',
    color: 'black',
    textShadowRadius: 1,
    textShadowOffset: { width: 1, height: 1 },
    textShadowColor: '#000',
    textDecorationStyle: 'double',
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
    padding: 2,
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: 'white',
  },
  highlightedContainer: {
    alignSelf: 'flex-start',
  },
  iOSHighlight: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'black',
    textShadowRadius: 1,
    textShadowOffset: { width: 1, height: 1 },
    textShadowColor: '#000',
  },
  androidHighlight: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: 'black',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textShadowRadius: 0,
  },
  singleCharacterContainer: {
    borderRadius: 5,
  },
  singleCharacterText: {
    borderRadius: 5,
  },
  firstHighlightContainer: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  lastHighlightContainer: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  middleHighlightContainer: {
    borderRadius: 0,
  },
  firstHighlightText: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderLeftWidth: 1,
    marginLeft: 0,
    borderRadius: 0,
  },
  lastHighlightText: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderRightWidth: 1,
    marginRight: 0,
    borderRadius: 0,
  },
  middleHighlightText: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    marginLeft: -1,
    marginRight: -1,
  },
});

export default HighlightedText;
