import React from 'react';
import { secretTextStyle } from '../helpers/secretsOnScreen';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from './themes';

type ContentAlignType = 'flex-start' | 'center' | 'flex-end';
export const SquareEnumeratedWordsContentAlign: Record<string, ContentAlignType> = Object.freeze({
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
});

interface SquareEnumeratedWordsProps {
  entries: string[];
  /** Seed words: end-to-end builds draw them in transparent ink. */
  secret?: boolean;
  appendNumber: boolean;
  contentAlign: ContentAlignType;
}

const SquareEnumeratedWords: React.FC<SquareEnumeratedWordsProps> = ({ entries, appendNumber, contentAlign, secret = false }) => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    entryTextContainer: {
      backgroundColor: colors.inputBackgroundColor,
    },
    entryText: {
      color: colors.labelText,
    },
    container: {
      justifyContent: contentAlign,
    },
  });

  const renderSecret = () => {
    const component = [];
    const entriesObject = entries.entries();
    for (const [index, entry] of entriesObject) {
      if (entries.length > 1) {
        const text = appendNumber ? `${index + 1}. ${entry}  ` : `${entry}  `;
        component.push(
          <View style={[styles.entryTextContainer, stylesHook.entryTextContainer]} key={`${entry}${index}`}>
            <Text textBreakStrategy="simple" style={[styles.entryText, stylesHook.entryText, secret ? secretTextStyle : undefined]}>
              {text}
            </Text>
          </View>,
        );
      } else {
        component.push(
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.entryTextContainer, stylesHook.entryTextContainer]}
            key={`${entry}${index}`}
          >
            <Text textBreakStrategy="simple" style={[styles.entryText, stylesHook.entryText, secret ? secretTextStyle : undefined]}>
              {entry}
            </Text>
          </TouchableOpacity>,
        );
      }
    }
    return component;
  };

  return <View style={[styles.container, stylesHook.container]}>{renderSecret()}</View>;
};

const styles = StyleSheet.create({
  entryTextContainer: {
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  entryText: {
    fontWeight: 'bold',
    textAlign: 'left',
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default SquareEnumeratedWords;
