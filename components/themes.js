import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Appearance } from 'react-native';

export class BlueCurrentTheme {
  static colors = () => {
    return Appearance.getColorScheme() === 'dark' ? BlueDarkTheme.colors : BlueDefaultTheme.colors;
  };

  static closeImage = () => {
    return Appearance.getColorScheme() === 'dark' ? BlueDarkTheme.closeImage : BlueDefaultTheme.closeImage;
  };
}

export const BlueDefaultTheme = {
  ...DefaultTheme,
  closeImage: require('../img/close.png'),
  colors: {
    ...DefaultTheme.colors,
    brandingColor: '#ffffff',
    foregroundColor: '#0c2550',
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    buttonBackgroundColor: '#ccddf9',
    buttonTextColor: '#0c2550',
    buttonAlternativeTextColor: '#2f5fb3',
    buttonDisabledBackgroundColor: '#eef0f4',
    buttonDisabledTextColor: '#9aa0aa',
    inputBorderColor: '#d2d2d2',
    inputBackgroundColor: '#f5f5f5',
    alternativeTextColor: '#9aa0aa',
    alternativeTextColor2: '#0f5cc0',
    buttonBlueBackgroundColor: '#ccddf9',
    incomingBackgroundColor: '#d2f8d6',
    incomingForegroundColor: '#37c0a1',
    outgoingBackgroundColor: '#f8d2d2',
    outgoingForegroundColor: '#d0021b',
    successColor: '#37c0a1',
    failedColor: '#ff0000',
    shadowColor: '#000000',
    inverseForegroundColor: '#ffffff',
    hdborderColor: '#68BBE1',
    hdbackgroundColor: '#ECF9FF',
    lnborderColor: '#F7C056',
    lnbackgroundColor: '#FFFAEF',
    background: '#FFFFFF',
    borderWidth: 0,
  },
};

export const BlueDarkTheme = {
  ...DarkTheme,
  closeImage: require('../img/close-white.png'),
  colors: {
    ...BlueDefaultTheme.colors,
    ...DarkTheme.colors,
    borderTopColor: '#9aa0aa',
    foregroundColor: '#ffffff',
    borderWidth: 1,
  },
};
