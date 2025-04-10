import { Platform, PlatformColor, useColorScheme, Appearance, OpaqueColorValue } from 'react-native';

export const getAndroidColor = (colorName: string) => {
  try {
    return PlatformColor(colorName);
  } catch {
    const fallbacks: { [key: string]: string } = {
      '@android:color/primary_text_light': '#000000',
      '@android:color/secondary_text_light': '#757575',
      '@android:color/background_light': '#FFFFFF',
      '@android:color/darker_gray': '#AAAAAA',
      '@android:color/transparent': 'transparent',
      '@android:color/holo_blue_light': '#33B5E5',
      '@android:color/holo_green_light': '#99CC00',
    };
    return fallbacks[colorName] || '#000000';
  }
};

export interface PlatformColors {
  titleColor: string | OpaqueColorValue;
  subtitleColor: string | OpaqueColorValue;
  chevronColor: string | OpaqueColorValue;
  background: string | OpaqueColorValue;
  cardBackground: string | OpaqueColorValue;
  textColor: string | OpaqueColorValue;
  separatorColor?: string | OpaqueColorValue;
  blueIcon: string | OpaqueColorValue;
  greenIcon: string | OpaqueColorValue;
  yellowIcon: string | OpaqueColorValue;
  redIcon: string | OpaqueColorValue;
  grayIcon: string | OpaqueColorValue;
  blueIconBg: string | OpaqueColorValue;
  greenIconBg: string | OpaqueColorValue;
  yellowIconBg: string | OpaqueColorValue;
  redIconBg: string | OpaqueColorValue;
  grayIconBg: string | OpaqueColorValue;
  switchTrackColorFalse: string | OpaqueColorValue;
  switchTrackColorTrue: string | OpaqueColorValue;
  switchThumbColor?: string | OpaqueColorValue;
  switchIosBackgroundColor: string | OpaqueColorValue;
}

type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export interface PlatformSizing {
  titleFontSize: number;
  titleFontWeight: FontWeight;
  subtitleFontSize: number;
  subtitleFontWeight: FontWeight;
  subtitleLineHeight: number;
  subtitlePaddingVertical: number;
  itemMinHeight: number;
  iconSize: number;
  iconInnerSize: number;
  iconContainerSize: number;
  iconContainerBorderRadius: number;
  containerPaddingVertical: number;
  containerElevation: number;
  containerMarginVertical: number;
  containerBorderRadius: number;
  sectionHeaderHeight: number;
  sectionHeaderPaddingBottom: number;
  sectionContainerMarginBottom: number;
  firstSectionContainerPaddingTop: number;
  leftIconMarginLeft: number;
  leftIconMarginRight: number;
  leftIconWidth: number;
  leftIconHeight: number;
}

export interface PlatformLayout {
  showBorderBottom: boolean;
  showElevation: boolean;
  showBorderRadius: boolean;
  useRoundedListItems: boolean;
  showIconBackground: boolean;
  iconType: 'ionicon' | 'font-awesome-5';
  settingsIconName: string;
  currencyIconName: string;
  languageIconName: string;
  securityIconName: string;
  networkIconName: string;
  toolsIconName: string;
  aboutIconName: string;
}

export interface PlatformTheme {
  colors: PlatformColors;
  sizing: PlatformSizing;
  layout: PlatformLayout;
}

const getIOSColors = (): PlatformColors => {
  return {
    titleColor: PlatformColor('label'),
    subtitleColor: PlatformColor('secondaryLabel'),
    chevronColor: PlatformColor('tertiaryLabel'),
    separatorColor: PlatformColor('separator'),

    background: PlatformColor('systemGroupedBackground'),
    cardBackground: PlatformColor('secondarySystemGroupedBackground'),
    textColor: PlatformColor('label'),

    blueIcon: PlatformColor('systemBlue'),
    greenIcon: PlatformColor('systemGreen'),
    yellowIcon: PlatformColor('systemOrange'),
    redIcon: PlatformColor('systemRed'),
    grayIcon: PlatformColor('systemGray'),

    blueIconBg: 'rgba(0, 122, 255, 0.12)',
    greenIconBg: 'rgba(52, 199, 89, 0.12)',
    yellowIconBg: 'rgba(255, 149, 0, 0.12)',
    redIconBg: 'rgba(255, 59, 48, 0.12)',
    grayIconBg: 'rgba(142, 142, 147, 0.12)',

    switchTrackColorFalse: PlatformColor('systemFill'),
    switchTrackColorTrue: PlatformColor('systemGreen'),
    switchIosBackgroundColor: PlatformColor('systemFill'),
  };
};

const getAndroidColors = (): PlatformColors => {
  const isDark = Appearance.getColorScheme() === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#202124';
  const subtitleColor = isDark ? '#B3B3B3' : '#5F6368';
  const chevronColor = isDark ? '#9E9E9E' : '#757575';

  return {
    titleColor: textColor,
    subtitleColor,
    chevronColor,

    background: isDark ? '#1F1F1F' : '#F3F3F3',
    cardBackground: 'transparent',
    textColor,

    blueIcon: isDark ? '#82B1FF' : '#1A73E8',
    greenIcon: isDark ? '#69F0AE' : '#0F9D58',
    yellowIcon: isDark ? '#FFD600' : '#F4B400',
    redIcon: isDark ? '#FF5252' : '#DB4437',
    grayIcon: isDark ? '#BDBDBD' : '#5F6368',

    blueIconBg: 'transparent',
    greenIconBg: 'transparent',
    yellowIconBg: 'transparent',
    redIconBg: 'transparent',
    grayIconBg: 'transparent',

    switchTrackColorFalse: getAndroidColor('@android:color/darker_gray'),
    switchTrackColorTrue: PlatformColor('@android:color/holo_green_light'),
    switchIosBackgroundColor: 'transparent',
  };
};

const getIOSSizing = (): PlatformSizing => ({
  titleFontSize: 17,
  titleFontWeight: '500',
  subtitleFontSize: 15,
  subtitleFontWeight: '400',
  subtitleLineHeight: 20,
  subtitlePaddingVertical: 2,
  itemMinHeight: 44,
  iconSize: 22,
  iconInnerSize: 18,
  iconContainerSize: 28,
  iconContainerBorderRadius: 6,
  containerPaddingVertical: 12,
  containerElevation: 0,
  containerMarginVertical: 0,
  containerBorderRadius: 10,
  sectionHeaderHeight: 32,
  sectionHeaderPaddingBottom: 8,
  sectionContainerMarginBottom: 4,
  firstSectionContainerPaddingTop: 16,
  leftIconMarginLeft: 12,
  leftIconMarginRight: 16,
  leftIconWidth: 28,
  leftIconHeight: 28,
});

const getAndroidSizing = (): PlatformSizing => ({
  titleFontSize: 20,
  titleFontWeight: '700',
  subtitleFontSize: 17,
  subtitleFontWeight: '500',
  subtitleLineHeight: 20,
  subtitlePaddingVertical: 2,
  itemMinHeight: 60,
  iconSize: 24,
  iconInnerSize: 20,
  iconContainerSize: 24,
  iconContainerBorderRadius: 0,
  containerPaddingVertical: 10,
  containerElevation: 0,
  containerMarginVertical: 2,
  containerBorderRadius: 0,
  sectionHeaderHeight: 24,
  sectionHeaderPaddingBottom: 4,
  sectionContainerMarginBottom: 2,
  firstSectionContainerPaddingTop: 8,
  leftIconMarginLeft: 16,
  leftIconMarginRight: 32,
  leftIconWidth: 24,
  leftIconHeight: 24,
});

const getIOSLayout = (): PlatformLayout => ({
  showBorderBottom: true,
  showElevation: false,
  showBorderRadius: true,
  useRoundedListItems: true,
  showIconBackground: true,
  iconType: 'ionicon',
  settingsIconName: 'settings-outline',
  currencyIconName: 'cash-outline',
  languageIconName: 'language-outline',
  securityIconName: 'lock-closed-outline',
  networkIconName: 'globe-outline',
  toolsIconName: 'construct-outline',
  aboutIconName: 'information-circle-outline',
});

const getAndroidLayout = (): PlatformLayout => ({
  showBorderBottom: false,
  showElevation: true,
  showBorderRadius: false,
  useRoundedListItems: false,
  showIconBackground: false,
  iconType: 'font-awesome-5',
  settingsIconName: 'cog',
  currencyIconName: 'money-bill-alt',
  languageIconName: 'language',
  securityIconName: 'lock',
  networkIconName: 'globe',
  toolsIconName: 'tools',
  aboutIconName: 'info-circle',
});

export const usePlatformTheme = (): PlatformTheme => {
  useColorScheme();

  if (Platform.OS === 'ios') {
    return {
      colors: getIOSColors(),
      sizing: getIOSSizing(),
      layout: getIOSLayout(),
    };
  } else {
    return {
      colors: getAndroidColors(),
      sizing: getAndroidSizing(),
      layout: getAndroidLayout(),
    };
  }
};

export class PlatformCurrentTheme {
  static colors: PlatformColors;
  static sizing: PlatformSizing;
  static layout: PlatformLayout;

  static updateColorScheme(): void {
    if (Platform.OS === 'ios') {
      PlatformCurrentTheme.colors = getIOSColors();
      PlatformCurrentTheme.sizing = getIOSSizing();
      PlatformCurrentTheme.layout = getIOSLayout();
    } else {
      PlatformCurrentTheme.colors = getAndroidColors();
      PlatformCurrentTheme.sizing = getAndroidSizing();
      PlatformCurrentTheme.layout = getAndroidLayout();
    }
  }
}

PlatformCurrentTheme.updateColorScheme();

Appearance.addChangeListener(() => {
  PlatformCurrentTheme.updateColorScheme();
});
