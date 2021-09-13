import { DefaultTheme, DarkTheme, useTheme as useThemeBase } from '@react-navigation/native';
import { Appearance } from 'react-native';

export const BlueDefaultTheme = {
  ...DefaultTheme,
  closeImage: require('../img/close.png'),
  scanImage: require('../img/scan.png'),
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
    lnborderColor: '#FFB600',
    lnbackgroundColor: '#FFFAEF',
    background: '#FFFFFF',
    lightButton: '#eef0f4',
    ballReceive: '#d2f8d6',
    ballOutgoing: '#f8d2d2',
    lightBorder: '#ededed',
    ballOutgoingExpired: '#EEF0F4',
    modal: '#ffffff',
    formBorder: '#d2d2d2',
    modalButton: '#ccddf9',
    darkGray: '#9AA0AA',
    scanLabel: '#9AA0AA',
    feeText: '#81868e',
    feeLabel: '#d2f8d6',
    feeValue: '#37c0a1',
    feeActive: '#d2f8d6',
    labelText: '#81868e',
    cta2: '#062453',
    outputValue: '#13244D',
    elevated: '#ffffff',
    mainColor: '#CFDCF6',
    success: '#ccddf9',
    successCheck: '#0f5cc0',
    msSuccessBG: '#37c0a1',
    msSuccessCheck: '#ffffff',
    newBlue: '#007AFF',
    redBG: '#F8D2D2',
    redText: '#D0021B',
    changeBackground: '#FDF2DA',
    changeText: '#F38C47',
    receiveBackground: '#D1F9D6',
    receiveText: '#37C0A1',
  },
};

export type Theme = typeof BlueDefaultTheme;

export const BlueDarkTheme: Theme = {
  ...DarkTheme,
  closeImage: require('../img/close-white.png'),
  scanImage: require('../img/scan-white.png'),
  colors: {
    ...BlueDefaultTheme.colors,
    ...DarkTheme.colors,
    brandingColor: '#000000',
    borderTopColor: '#9aa0aa',
    foregroundColor: '#ffffff',
    buttonDisabledBackgroundColor: '#3A3A3C',
    buttonBackgroundColor: '#3A3A3C',
    buttonTextColor: '#ffffff',
    lightButton: 'rgba(255,255,255,.1)',
    buttonAlternativeTextColor: '#ffffff',
    alternativeTextColor: '#9aa0aa',
    alternativeTextColor2: '#0A84FF',
    ballReceive: '#202020',
    ballOutgoing: '#202020',
    lightBorder: '#313030',
    ballOutgoingExpired: '#202020',
    modal: '#202020',
    formBorder: '#202020',
    inputBackgroundColor: '#262626',
    modalButton: '#000000',
    darkGray: '#3A3A3C',
    feeText: '#81868e',
    feeLabel: '#8EFFE5',
    feeValue: '#000000',
    feeActive: 'rgba(210,248,214,.2)',
    cta2: '#ffffff',
    outputValue: '#ffffff',
    elevated: '#121212',
    mainColor: '#0A84FF',
    success: '#202020',
    successCheck: '#0A84FF',
    buttonBlueBackgroundColor: '#202020',
    scanLabel: 'rgba(255,255,255,.2)',
    labelText: '#ffffff',
    msSuccessBG: '#8EFFE5',
    msSuccessCheck: '#000000',
    newBlue: '#007AFF',
    redBG: '#5A4E4E',
    redText: '#FC6D6D',
    changeBackground: '#5A4E4E',
    changeText: '#F38C47',
    receiveBackground: 'rgba(210,248,214,.2)',
    receiveText: '#37C0A1',
  },
};

// Casting theme value to get autocompletion
export const useTheme = (): Theme => useThemeBase() as Theme;

export class BlueCurrentTheme {
  static colors: Theme['colors'];
  static closeImage: Theme['closeImage'];
  static scanImage: Theme['scanImage'];

  static updateColorScheme(): void {
    const isColorSchemeDark = Appearance.getColorScheme() === 'dark';
    BlueCurrentTheme.colors = isColorSchemeDark ? BlueDarkTheme.colors : BlueDefaultTheme.colors;
    BlueCurrentTheme.closeImage = isColorSchemeDark ? BlueDarkTheme.closeImage : BlueDefaultTheme.closeImage;
    BlueCurrentTheme.scanImage = isColorSchemeDark ? BlueDarkTheme.scanImage : BlueDefaultTheme.scanImage;
  }
}

BlueCurrentTheme.updateColorScheme();
