import React, { useCallback, useMemo } from 'react';
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

  const highlightedStyle = useMemo(
    () => ({
      ...styles.highlight,
      backgroundColor: '#FFF5C0',
      color: '#000000',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      transform: Platform.OS === 'ios' ? [{ scale: bounceAnim }] : undefined,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
      ...(highlightStyle || {}),
    }),
    [bounceAnim, highlightStyle],
  );

  // Render an individual text part (highlighted or plain)
  const renderTextPart = useCallback(
    (part: TextPart, index: number) => {
      if (part.isMatch) {
        return (
          <Animated.View
            key={`highlight-container-${index}-${query}`}
            style={[styles.highlightContainer, { transform: [{ scale: bounceAnim }] }]}
          >
            <Animated.Text key={`highlight-${index}-${query}`} style={highlightedStyle}>
              {part.text}
            </Animated.Text>
          </Animated.View>
        );
      }

      return (
        <Text key={`text-${index}-${query}`} style={query ? styles.nonHighlightedText : undefined}>
          {part.text}
        </Text>
      );
    },
    [query, highlightedStyle, bounceAnim],
  );

  // Process the text to find parts that should be highlighted
  const textParts = useMemo((): TextPart[] => {
    // If no query, return the full text as a single non-matched part
    if (!query || query.trim() === '') {
      return [{ text, isMatch: false }];
    }

    try {
      const trimmedQuery = query.trim();
      if (trimmedQuery === '') {
        return [{ text, isMatch: false }];
      }

      const searchQueryText = caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase();
      const processedText = caseSensitive ? text : text.toLowerCase();

      const parts: TextPart[] = [];
      let lastIndex = 0;
      let searchStartIndex = 0;

      // Find all occurrences of the query
      while (true) {
        const matchIndex = processedText.indexOf(searchQueryText, searchStartIndex);

        // If no more matches, break out of the loop
        if (matchIndex === -1) {
          break;
        }

        // Add the text before the match
        if (matchIndex > lastIndex) {
          parts.push({
            text: text.substring(lastIndex, matchIndex),
            isMatch: false,
          });
        }

        // Add the exact matching text portion (using the original casing)
        parts.push({
          text: text.substring(matchIndex, matchIndex + searchQueryText.length),
          isMatch: true,
        });

        // Update indices
        lastIndex = matchIndex + searchQueryText.length;
        searchStartIndex = lastIndex;

        if (highlightOnlyFirstMatch) {
          break;
        }
      }

      // Add any remaining text
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

  // If only one part and it's not a match, render a simple Text component
  if (textParts.length === 1 && !textParts[0].isMatch) {
    return (
      <Text style={[styles.text, style]} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Render the text with highlighted parts
  return (
    <Text numberOfLines={numberOfLines} style={[styles.text, style]} key={`highlighted-wrapper-${query}`}>
      {textParts.map(renderTextPart)}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
  },
  nonHighlightedText: {
    opacity: 0.8,
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
  },
});

export default HighlightedText;
