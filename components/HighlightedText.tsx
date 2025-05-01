import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Text, Animated, StyleSheet, Platform, TextStyle } from 'react-native';
import useBounceAnimation from '../hooks/useBounceAnimation';

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

interface TextPart {
  text: string;
  isMatch: boolean;
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
  const internalBounceAnim = useBounceAnimation(query);
  const bounceAnim = externalBounceAnim || internalBounceAnim;
  const [queryKey, setQueryKey] = useState<string>('');

  useEffect(() => {
    setQueryKey(query);
  }, [query]);

  const baseTextStyle = useMemo(() => {
    if (!style) return {};

    if (Array.isArray(style)) {
      return style.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    }

    return style;
  }, [style]);

  const highlightedStyle = useMemo(
    () => ({
      ...styles.highlight,
      ...(highlightStyle || {}),
      fontSize: baseTextStyle.fontSize,
      fontFamily: baseTextStyle.fontFamily,
      fontWeight: baseTextStyle.fontWeight || '600',
      lineHeight: baseTextStyle.lineHeight,
      letterSpacing: baseTextStyle.letterSpacing,
      transform: Platform.OS === 'ios' ? [{ scale: bounceAnim }] : undefined,
    }),
    [bounceAnim, highlightStyle, baseTextStyle],
  );

  // Create a style for non-highlighted text parts that ensures it looks the same as original text
  const nonHighlightedStyle = useMemo(
    () => ({
      ...baseTextStyle, // Copy all original text properties
    }),
    [baseTextStyle],
  );

  const renderTextPart = useCallback(
    (part: TextPart, index: number) => {
      if (part.isMatch) {
        return (
          <Animated.View
            key={`highlight-container-${index}-${queryKey}`}
            style={[styles.highlightContainer, { transform: [{ scale: bounceAnim }] }]}
          >
            <Animated.Text key={`highlight-${index}-${queryKey}`} style={highlightedStyle}>
              {part.text}
            </Animated.Text>
          </Animated.View>
        );
      }

      return (
        <Text key={`text-${index}-${queryKey}`} style={nonHighlightedStyle}>
          {part.text}
        </Text>
      );
    },
    [queryKey, highlightedStyle, bounceAnim, nonHighlightedStyle],
  );

  const textParts = useMemo((): TextPart[] => {
    if (!query) {
      return [{ text, isMatch: false }];
    }

    try {
      const searchQueryText = caseSensitive ? query : query.toLowerCase();
      const processedText = caseSensitive ? text : text.toLowerCase();

      if (searchQueryText.trim() === '') {
        return [{ text, isMatch: false }];
      }

      const parts: TextPart[] = [];
      let lastIndex = 0;
      let searchStartIndex = 0;

      while (true) {
        const matchIndex = processedText.indexOf(searchQueryText, searchStartIndex);

        if (matchIndex === -1) {
          break;
        }

        if (matchIndex > lastIndex) {
          parts.push({
            text: text.substring(lastIndex, matchIndex),
            isMatch: false,
          });
        }

        parts.push({
          text: text.substring(matchIndex, matchIndex + searchQueryText.length),
          isMatch: true,
        });

        lastIndex = matchIndex + searchQueryText.length;
        searchStartIndex = lastIndex;

        if (highlightOnlyFirstMatch) {
          break;
        }
      }

      if (lastIndex < text.length) {
        parts.push({
          text: text.substring(lastIndex),
          isMatch: false,
        });
      }

      return parts.length > 0 ? parts : [{ text, isMatch: false }];
    } catch (e) {
      return [{ text, isMatch: false }];
    }
  }, [text, query, caseSensitive, highlightOnlyFirstMatch]);

  if (textParts.length === 1 && !textParts[0].isMatch) {
    return (
      <Text style={[styles.text, style]} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text numberOfLines={numberOfLines} style={[styles.text, style]} key={`highlighted-wrapper-${queryKey}`}>
      {textParts.map(renderTextPart)}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
  },
  highlightContainer: {
    overflow: 'hidden',
    margin: 0,
    padding: 0,
  },
  highlight: {
    fontWeight: '600',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginHorizontal: 1,
    overflow: 'hidden',
    textDecorationLine: Platform.OS === 'android' ? 'underline' : 'none',
    backgroundColor: '#FFF5C0',
    color: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default HighlightedText;
