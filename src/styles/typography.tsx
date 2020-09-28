import { StyleSheet } from 'react-native';

import { fonts } from './fonts';
import { palette } from './palette';

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
  headline7: {
    fontFamily: fonts.ubuntu.medium,
    fontSize: 16,
    letterSpacing: 0,
  },
  headline8: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 21,
  },
  headline9: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 14,
    lineHeight: 19,
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
  subtitle3: {
    fontFamily: fonts.ubuntu.medium,
    fontSize: 12,
    letterSpacing: 0,
  },
  subtitle4: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 12,
    lineHeight: 20,
  },
  subtitle5: {
    fontFamily: fonts.ubuntu.medium,
    fontSize: 21,
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
  status: {
    fontFamily: fonts.ubuntu.medium,
    fontSize: 11,
    color: palette.white,
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
  warning: {
    fontFamily: fonts.ubuntu.light,
    fontSize: 12,
    lineHeight: 14,
    color: palette.white,
  },
  warningBold: {
    fontFamily: fonts.ubuntu.bold,
    fontSize: 12,
    lineHeight: 14,
    color: palette.white,
  },
});
