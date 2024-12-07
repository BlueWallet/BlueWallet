import React from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';

import { useTheme } from './themes';

const SeedWords = ({ seed }: { seed: string }) => {
  const words = seed.split(/\s/);
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wortText: {
      color: colors.labelText,
    },
  });

  return (
    <View style={styles.secret}>
      {words.map((secret, index) => {
        const text = `${index + 1}. ${secret}  `;
        return (
          <View style={[styles.word, stylesHook.word]} key={index}>
            <Text style={[styles.wortText, stylesHook.wortText]} textBreakStrategy="simple">
              {text}
            </Text>
          </View>
        );
      })}
      <Text style={styles.hiddenText} testID="Secret">
        {seed}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  word: {
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  wortText: {
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 17,
  },
  secret: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  hiddenText: {
    height: 0,
    width: 0,
  },
});

export default SeedWords;
