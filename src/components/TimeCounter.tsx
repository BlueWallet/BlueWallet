import React from 'react';
import { View, StyleSheet } from 'react-native';

import { secondsToFormat } from 'app/helpers/date';
import { palette, fonts } from 'app/styles';

import { Text } from './Text';

interface Props {
  value: number;
}

export const TimeCounter = ({ value }: Props) => (
  <View style={styles.container}>
    {secondsToFormat(value, 'mm:ss')
      .split('')
      .map((element, index) => (
        <View key={index} style={element === ':' ? styles.breakContainer : styles.valueContainer}>
          <Text style={styles.number}>{element}</Text>
        </View>
      ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  valueContainer: {
    borderBottomWidth: 1,
    borderBottomColor: palette.borderGrey,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  breakContainer: {
    width: 4,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 24,
  },
});
