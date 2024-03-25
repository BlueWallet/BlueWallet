import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from './themes';

type ContentAlignType = 'flex-start' | 'center' | 'flex-end';
export const SquareEnumeratedWordsContentAlign: Record<string, ContentAlignType> = Object.freeze({
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
});

interface SquareEnumeratedWordsProps {
  entries: string[];
  appendNumber: boolean;
  contentAlign: ContentAlignType;
}

const SquareEnumeratedWords: React.FC<SquareEnumeratedWordsProps> = ({ entries, appendNumber, contentAlign }) => {
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
    for (const [index, secret] of entriesObject) {
      if (entries.length > 1) {
        const text = appendNumber ? `${index + 1}. ${secret}  ` : `${secret}  `;
        component.push(
          <View style={[styles.entryTextContainer, stylesHook.entryTextContainer]} key={`${secret}${index}`}>
            <Text textBreakStrategy="simple" style={[styles.entryText, stylesHook.entryText]}>
              {text}
            </Text>
          </View>,
        );
      } else {
        component.push(
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.entryTextContainer, stylesHook.entryTextContainer]}
            key={`${secret}${index}`}
          >
            <Text textBreakStrategy="simple" style={[styles.entryText, stylesHook.entryText]}>
              {secret}
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
