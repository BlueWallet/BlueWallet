import { DarkTheme, DefaultTheme, useTheme as useThemeBase } from '@react-navigation/native';
import { Appearance } from 'react-native';

/**
 * NeuraiWallet color tokens.
 *
 * Re-skinned from NeuraiWallet's blue scheme to the orange-on-neutral palette
 * the neurai-faucet frontend uses (orange #f97316 accent, Tailwind gray
 * scale). Token names are kept so existing consumers across screens/buttons
 * keep working; only the values change.
 */

// Brand accent — Tailwind orange-500/600 family. Used everywhere a CTA, link
// or "selected" indicator was rendered with NeuraiWallet's `newBlue`.
const NEURAI_ORANGE = '#f97316';
const NEURAI_ORANGE_HOVER = '#ea6c10';
const NEURAI_ORANGE_LIGHT = '#fff7ed';
const NEURAI_ORANGE_LIGHT_DARK = 'rgba(249,115,22,0.12)';
const NEURAI_ORANGE_BORDER = '#fed7aa';
const NEURAI_ORANGE_BORDER_DARK = 'rgba(249,115,22,0.35)';

export const BlueDefaultTheme = {
  ...DefaultTheme,
  closeImage: require('../img/close.png'),
  barStyle: 'dark-content',
  // Float scan button now sits on an orange background; use the white
  // variant so the icon stays visible against the brand color.
  scanImage: require('../img/scan-white.png'),
  colors: {
    ...DefaultTheme.colors,
    borderWidth: 0.5,
    brandingColor: '#ffffff',
    customHeader: '#ffffff',
    foregroundColor: '#111827',
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    buttonBackgroundColor: NEURAI_ORANGE,
    buttonTextColor: '#ffffff',
    secondButtonTextColor: '#6b7280',
    buttonAlternativeTextColor: NEURAI_ORANGE,
    buttonDisabledBackgroundColor: '#f3f4f6',
    buttonDisabledTextColor: '#9ca3af',
    inputBorderColor: '#d1d5db',
    inputBackgroundColor: '#f9fafb',
    alternativeTextColor: '#6b7280',
    alternativeTextColor2: NEURAI_ORANGE,
    buttonBlueBackgroundColor: NEURAI_ORANGE_LIGHT,
    buttonGrayBackgroundColor: '#f3f4f6',
    incomingBackgroundColor: '#d1fae5',
    incomingForegroundColor: '#065f46',
    outgoingBackgroundColor: '#fee2e2',
    outgoingForegroundColor: '#991b1b',
    successColor: '#10b981',
    failedColor: '#ef4444',
    placeholderTextColor: '#9ca3af',
    shadowColor: '#000000',
    inverseForegroundColor: '#ffffff',
    hdborderColor: NEURAI_ORANGE_BORDER,
    hdbackgroundColor: NEURAI_ORANGE_LIGHT,
    lnborderColor: NEURAI_ORANGE_BORDER,
    lnbackgroundColor: NEURAI_ORANGE_LIGHT,
    background: '#f4f4f6',
    lightButton: '#ffffff',
    ballReceive: '#d1fae5',
    ballOutgoing: '#fee2e2',
    lightBorder: '#e5e7eb',
    ballOutgoingExpired: '#f3f4f6',
    modal: '#ffffff',
    formBorder: '#e5e7eb',
    modalButton: NEURAI_ORANGE,
    darkGray: '#6b7280',
    scanLabel: '#9ca3af',
    feeText: '#6b7280',
    feeLabel: NEURAI_ORANGE_LIGHT,
    feeValue: NEURAI_ORANGE_HOVER,
    feeActive: NEURAI_ORANGE_LIGHT,
    labelText: '#6b7280',
    cta2: '#111827',
    outputValue: '#111827',
    elevated: '#ffffff',
    mainColor: NEURAI_ORANGE,
    success: NEURAI_ORANGE_LIGHT,
    successCheck: NEURAI_ORANGE,
    msSuccessBG: '#10b981',
    msSuccessCheck: '#ffffff',
    newBlue: NEURAI_ORANGE,
    redBG: '#fee2e2',
    redText: '#991b1b',
    changeBackground: NEURAI_ORANGE_LIGHT,
    changeText: NEURAI_ORANGE_HOVER,
    receiveBackground: '#d1fae5',
    receiveText: '#065f46',
    androidRippleColor: '#e5e7eb',
  },
};

export type Theme = typeof BlueDefaultTheme;

export const BlueDarkTheme: Theme = {
  ...DarkTheme,
  closeImage: require('../img/close-white.png'),
  scanImage: require('../img/scan-white.png'),
  barStyle: 'light-content',
  colors: {
    ...BlueDefaultTheme.colors,
    ...DarkTheme.colors,
    customHeader: '#1f2937',
    brandingColor: '#1f2937',
    borderTopColor: '#374151',
    background: '#111827',
    foregroundColor: '#f9fafb',
    buttonDisabledBackgroundColor: '#374151',
    buttonBackgroundColor: NEURAI_ORANGE,
    buttonTextColor: '#ffffff',
    lightButton: '#1f2937',
    buttonAlternativeTextColor: NEURAI_ORANGE,
    alternativeTextColor: '#9ca3af',
    alternativeTextColor2: NEURAI_ORANGE,
    // The history's direction icons sit on cards of #1f2937: tinted balls and bright arrows, as on the transaction screen.
    ballReceive: 'rgba(34, 197, 94, 0.14)',
    ballOutgoing: 'rgba(239, 68, 68, 0.16)',
    incomingForegroundColor: '#22c55e',
    outgoingForegroundColor: '#ef4444',
    lightBorder: '#374151',
    ballOutgoingExpired: '#1f2937',
    modal: '#1f2937',
    formBorder: '#374151',
    inputBackgroundColor: '#111827',
    inputBorderColor: '#374151',
    modalButton: NEURAI_ORANGE,
    darkGray: '#374151',
    feeText: '#9ca3af',
    feeLabel: NEURAI_ORANGE_LIGHT_DARK,
    feeValue: NEURAI_ORANGE,
    feeActive: NEURAI_ORANGE_LIGHT_DARK,
    cta2: '#f9fafb',
    outputValue: '#f9fafb',
    elevated: '#1f2937',
    mainColor: NEURAI_ORANGE,
    success: NEURAI_ORANGE_LIGHT_DARK,
    successCheck: NEURAI_ORANGE,
    buttonBlueBackgroundColor: NEURAI_ORANGE_LIGHT_DARK,
    scanLabel: 'rgba(255,255,255,.2)',
    labelText: '#f9fafb',
    msSuccessBG: '#10b981',
    msSuccessCheck: '#ffffff',
    newBlue: NEURAI_ORANGE,
    redBG: '#5A4E4E',
    redText: '#FC6D6D',
    changeBackground: NEURAI_ORANGE_LIGHT_DARK,
    changeText: NEURAI_ORANGE,
    receiveBackground: 'rgba(16,185,129,0.18)',
    receiveText: '#10b981',
    androidRippleColor: '#374151',
    hdborderColor: NEURAI_ORANGE_BORDER_DARK,
    hdbackgroundColor: NEURAI_ORANGE_LIGHT_DARK,
    lnborderColor: NEURAI_ORANGE_BORDER_DARK,
    lnbackgroundColor: NEURAI_ORANGE_LIGHT_DARK,
  },
};

// Casting theme value to get autocompletion
export const useTheme = (): Theme => useThemeBase() as Theme;

export const platformColors = {
  background: BlueDefaultTheme.colors.background,
  card: BlueDefaultTheme.colors.modal ?? BlueDefaultTheme.colors.elevated ?? BlueDefaultTheme.colors.background,
  text: BlueDefaultTheme.colors.foregroundColor,
  secondaryText: BlueDefaultTheme.colors.alternativeTextColor ?? BlueDefaultTheme.colors.darkGray,
  separator: BlueDefaultTheme.colors.lightBorder ?? BlueDefaultTheme.colors.borderTopColor,
  chevron: BlueDefaultTheme.colors.alternativeTextColor ?? BlueDefaultTheme.colors.darkGray,
};

export class BlueCurrentTheme {
  static colors: Theme['colors'];
  static closeImage: Theme['closeImage'];
  static scanImage: Theme['scanImage'];

  static updateColorScheme(): void {
    const isColorSchemeDark = Appearance.getColorScheme() === 'dark';
    BlueCurrentTheme.colors = isColorSchemeDark ? BlueDarkTheme.colors : BlueDefaultTheme.colors;
    BlueCurrentTheme.closeImage = isColorSchemeDark ? BlueDarkTheme.closeImage : BlueDefaultTheme.closeImage;
    BlueCurrentTheme.scanImage = isColorSchemeDark ? BlueDarkTheme.scanImage : BlueDefaultTheme.scanImage;
    const colors = BlueCurrentTheme.colors;
    platformColors.background = colors.background;
    platformColors.card = colors.modal ?? colors.elevated ?? colors.background;
    platformColors.text = colors.foregroundColor;
    platformColors.secondaryText = colors.alternativeTextColor ?? colors.darkGray;
    platformColors.separator = colors.lightBorder ?? colors.borderTopColor;
    platformColors.chevron = colors.alternativeTextColor ?? colors.darkGray;
  }
}

BlueCurrentTheme.updateColorScheme();
