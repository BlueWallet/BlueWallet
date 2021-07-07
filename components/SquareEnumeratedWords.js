import React from 'react';
import { useTheme } from '@react-navigation/native';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';

export const SquareEnumeratedWordsContentAlign = Object.freeze({ left: 'flex-start', center: 'center', right: 'flex-end' });
const SquareEnumeratedWords = props => {
  const {
    entries = ['Empty entries prop. Please provide an array of strings'],
    appendNumber = true,
    contentAlign = SquareEnumeratedWordsContentAlign.center,
  } = props;
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    entryTextContainer: {
      backgroundColor: colors.inputBackgroundColor,
    },
    entryText: {
      color: colors.labelText,
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

  return <View style={[styles.container, { justifyContent: contentAlign }]}>{renderSecret()}</View>;
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
SquareEnumeratedWords.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.string),
  contentAlign: PropTypes.string,
  appendNumber: PropTypes.bool,
};

export default SquareEnumeratedWords;
