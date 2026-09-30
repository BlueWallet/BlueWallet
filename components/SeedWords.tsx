import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from './themes';
import { useLocale } from '@react-navigation/native';

type Props = {
  seed: string;
  selectable?: boolean;
};

const SeedWords = ({ seed, selectable = false }: Props) => {
  const words = seed.trim().split(/\s+/);
  const { colors } = useTheme();
  const { direction } = useLocale();

  const stylesHook = StyleSheet.create({
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wortText: {
      color: colors.labelText,
    },
    secret: {
      flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
    },
  });

  return (
    <View
      style={[styles.secret, stylesHook.secret]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {words.map((secret, index) => {
        return (
          <View style={[styles.word, stylesHook.word]} key={index}>
            <Text accessible={false} style={[styles.wortText, stylesHook.wortText]} textBreakStrategy="simple" selectable={false}>
              {`${index + 1}. `}
            </Text>
            <Text accessible={false} style={[styles.wortText, stylesHook.wortText]} textBreakStrategy="simple" selectable={selectable}>
              {secret}
            </Text>
          </View>
        );
      })}
      <Text accessible={false} style={styles.hiddenText} testID="Secret">
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
    flexDirection: 'row',
  },
  wortText: {
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 17,
  },
  secret: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hiddenText: {
    height: 0,
    width: 0,
  },
});

export default SeedWords;
