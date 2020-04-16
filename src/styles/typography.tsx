import { StyleSheet } from 'react-native';

import { fonts } from './fonts';

export const typography = StyleSheet.create({
  headline1: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 40,
    letterSpacing: 0,
  },
  headline2: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 28,
    letterSpacing: 0,
  },
  headline3: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 24,
    letterSpacing: 0,
  },
  headline4: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 16,
    letterSpacing: 0,
  },
  headline5: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 14,
    letterSpacing: 0,
  },
  headline6: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 12,
    letterSpacing: 0,
  },
  subtitle1: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 16,
    letterSpacing: 0,
  },
  subtitle2: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 10,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  button: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 14,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 19,
  },
  overline: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 12,
    letterSpacing: 0,
  },
});
