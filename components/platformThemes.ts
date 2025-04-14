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

export interface IconColorSet {
  [key: string]: string | OpaqueColorValue;
}

export interface PlatformIconColors {
  getIconColors: (isDarkMode: boolean) => IconColorSet;
}

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
  iconType: 'ionicon' | 'font-awesome-5' | 'font-awesome-6';
  settingsIconName: string;
  currencyIconName: string;
  languageIconName: string;
  securityIconName: string;
  networkIconName: string;
  toolsIconName: string;
  aboutIconName: string;
  rippleEffect: boolean; // Add ripple effect for Android
}

export interface PlatformTheme {
  colors: PlatformColors;
  sizing: PlatformSizing;
  layout: PlatformLayout;
  getIconColors: (isDarkMode?: boolean) => IconColorSet;
  getStandardIcons: (isDarkMode?: boolean) => StandardIconSet;
}

export interface StandardIconSet {
  // Settings icons
  settings: IconProps;
  currency: IconProps;
  language: IconProps;
  security: IconProps;
  network: IconProps;
  lightning: IconProps;
  privacy: IconProps;
  tools: IconProps;
  about: IconProps;

  // About screen icons
  x: IconProps;
  twitter: IconProps;
  telegram: IconProps;
  github: IconProps;
  releaseNotes: IconProps;
  licensing: IconProps;
  selfTest: IconProps;
  performance: IconProps;

  // Block explorer icons
  blockExplorer: IconProps;

  // Accessibility icons
  qrCode: IconProps;
  share: IconProps;
  copy: IconProps;
}

export interface IconProps {
  name: string;
  type: string;
  color: string | OpaqueColorValue;
  backgroundColor?: string | OpaqueColorValue;
}

type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

const getStandardIconColors = (isDarkMode: boolean): IconColorSet => ({
  x: isDarkMode ? '#FFFFFF' : '#1da1f2',
  twitter: isDarkMode ? '#FFFFFF' : '#1da1f2',
  telegram: isDarkMode ? '#FFFFFF' : '#0088cc',
  discord: isDarkMode ? '#FFFFFF' : '#7289da',
  github: isDarkMode ? '#FFFFFF' : '#24292e',
  releaseNotes: isDarkMode ? '#FFFFFF' : '#9AA0AA',
  licensing: isDarkMode ? '#FFFFFF' : '#24292e',
  selfTest: isDarkMode ? '#FFFFFF' : '#FC0D44',
  performance: isDarkMode ? '#FFFFFF' : '#FC0D44',
  settings: isDarkMode ? '#FFFFFF' : '#000000',
  currency: isDarkMode ? '#FFFFFF' : '#008000',
  language: isDarkMode ? '#FFFFFF' : '#FFA500',
  security: isDarkMode ? '#FFFFFF' : '#FF0000',
  network: isDarkMode ? '#FFFFFF' : '#0000FF',
  tools: isDarkMode ? '#FFFFFF' : '#800080',
  about: isDarkMode ? '#FFFFFF' : '#808080',
});

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

export const getIOSSizing = (): PlatformSizing => ({
  titleFontSize: 17,
  titleFontWeight: '600',
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

export const getAndroidSizing = (): PlatformSizing => ({
  titleFontSize: 16,
  titleFontWeight: '500',
  subtitleFontSize: 14,
  subtitleFontWeight: '400',
  subtitleLineHeight: 20,
  subtitlePaddingVertical: 2,
  itemMinHeight: 56, // Material Design standard
  iconSize: 24,
  iconInnerSize: 20,
  iconContainerSize: 24,
  iconContainerBorderRadius: 0,
  containerPaddingVertical: 16,
  containerElevation: 1, // More visible elevation
  containerMarginVertical: 1,
  containerBorderRadius: 0,
  sectionHeaderHeight: 48,
  sectionHeaderPaddingBottom: 8,
  sectionContainerMarginBottom: 8,
  firstSectionContainerPaddingTop: 8,
  leftIconMarginLeft: 16,
  leftIconMarginRight: 32,
  leftIconWidth: 24,
  leftIconHeight: 24,
});

export const getIOSLayout = (): PlatformLayout => ({
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
  rippleEffect: false,
});

export const getAndroidLayout = (): PlatformLayout => ({
  showBorderBottom: true,
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
  rippleEffect: true,
});

const getIOSStandardIcons = (isDarkMode: boolean): StandardIconSet => {
  const colors = getStandardIconColors(isDarkMode);
  const platformColors = getIOSColors();

  return {
    // Settings
    settings: {
      name: 'settings-outline',
      type: 'ionicons',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
    currency: {
      name: 'cash-outline',
      type: 'ionicons',
      color: colors.currency,
      backgroundColor: platformColors.greenIconBg,
    },
    language: {
      name: 'language-outline',
      type: 'ionicons',
      color: colors.language,
      backgroundColor: platformColors.yellowIconBg,
    },
    security: {
      name: 'shield-checkmark-outline',
      type: 'ionicons',
      color: colors.security,
      backgroundColor: platformColors.redIconBg,
    },
    network: {
      name: 'globe-outline',
      type: 'ionicons',
      color: colors.network,
      backgroundColor: platformColors.blueIconBg,
    },
    lightning: {
      name: 'flash-outline',
      type: 'ionicons',
      color: colors.lightning,
      backgroundColor: platformColors.yellowIconBg,
    },
    privacy: {
      name: 'lock-closed-outline',
      type: 'ionicons',
      color: colors.privacy,
      backgroundColor: platformColors.grayIconBg,
    },
    tools: {
      name: 'construct-outline',
      type: 'ionicons',
      color: colors.tools,
      backgroundColor: platformColors.grayIconBg,
    },
    about: {
      name: 'information-circle-outline',
      type: 'ionicons',
      color: colors.about,
      backgroundColor: platformColors.grayIconBg,
    },

    // About screen
    x: {
      name: 'logo-twitter',
      type: 'ionicons',
      color: colors.x,
      backgroundColor: 'rgba(29, 161, 242, 0.2)',
    },
    twitter: {
      name: 'logo-twitter',
      type: 'ionicons',
      color: colors.twitter,
      backgroundColor: 'rgba(29, 161, 242, 0.2)',
    },
    telegram: {
      name: 'paper-plane-outline',
      type: 'ionicons',
      color: colors.telegram,
      backgroundColor: 'rgba(0, 136, 204, 0.2)',
    },
    github: {
      name: 'logo-github',
      type: 'ionicons',
      color: colors.github,
      backgroundColor: 'rgba(24, 23, 23, 0.1)',
    },
    releaseNotes: {
      name: 'document-text-outline',
      type: 'ionicons',
      color: colors.releaseNotes,
      backgroundColor: platformColors.grayIconBg,
    },
    licensing: {
      name: 'shield-checkmark-outline',
      type: 'ionicons',
      color: colors.licensing,
      backgroundColor: platformColors.grayIconBg,
    },
    selfTest: {
      name: 'flask-outline',
      type: 'ionicons',
      color: colors.selfTest,
      backgroundColor: platformColors.redIconBg,
    },
    performance: {
      name: 'speedometer-outline',
      type: 'ionicons',
      color: colors.performance,
      backgroundColor: platformColors.redIconBg,
    },

    // Explorers and accessibility
    blockExplorer: {
      name: 'search-outline',
      type: 'ionicons',
      color: colors.network,
      backgroundColor: platformColors.blueIconBg,
    },
    qrCode: {
      name: 'qr-code-outline',
      type: 'ionicons',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
    share: {
      name: 'share-outline',
      type: 'ionicons',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
    copy: {
      name: 'copy-outline',
      type: 'ionicons',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
  };
};

const getAndroidStandardIcons = (isDarkMode: boolean): StandardIconSet => {
  const colors = getStandardIconColors(isDarkMode);

  return {
    // Settings
    settings: {
      name: 'cog',
      type: 'font-awesome-5',
      color: colors.settings,
    },
    currency: {
      name: 'money-bill-alt',
      type: 'font-awesome-5',
      color: colors.currency,
    },
    language: {
      name: 'language',
      type: 'font-awesome-5',
      color: colors.language,
    },
    security: {
      name: 'shield-alt',
      type: 'font-awesome-5',
      color: colors.security,
    },
    network: {
      name: 'globe',
      type: 'font-awesome-5',
      color: colors.network,
    },
    lightning: {
      name: 'bolt',
      type: 'font-awesome-5',
      color: colors.lightning,
    },
    privacy: {
      name: 'lock',
      type: 'font-awesome-5',
      color: colors.privacy,
    },
    tools: {
      name: 'tools',
      type: 'font-awesome-5',
      color: colors.tools,
    },
    about: {
      name: 'info-circle',
      type: 'font-awesome-5',
      color: colors.about,
    },

    // About screen
    x: {
      name: 'twitter',
      type: 'font-awesome-5',
      color: colors.x,
    },
    twitter: {
      name: 'twitter',
      type: 'font-awesome-5',
      color: colors.twitter,
    },
    telegram: {
      name: 'paper-plane',
      type: 'font-awesome',
      color: colors.telegram,
    },
    github: {
      name: 'github',
      type: 'font-awesome-5',
      color: colors.github,
    },
    releaseNotes: {
      name: 'file-alt',
      type: 'font-awesome-5',
      color: colors.releaseNotes,
    },
    licensing: {
      name: 'shield-alt',
      type: 'font-awesome-5',
      color: colors.licensing,
    },
    selfTest: {
      name: 'flask',
      type: 'font-awesome-5',
      color: colors.selfTest,
    },
    performance: {
      name: 'tachometer-alt',
      type: 'font-awesome-5',
      color: colors.performance,
    },

    // Explorers and accessibility
    blockExplorer: {
      name: 'search',
      type: 'font-awesome-5',
      color: colors.network,
    },
    qrCode: {
      name: 'qrcode',
      type: 'font-awesome-5',
      color: colors.settings,
    },
    share: {
      name: 'share-alt',
      type: 'font-awesome-5',
      color: colors.settings,
    },
    copy: {
      name: 'copy',
      type: 'font-awesome-5',
      color: colors.settings,
    },
  };
};

export const usePlatformTheme = (): PlatformTheme => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  if (Platform.OS === 'ios') {
    return {
      colors: getIOSColors(),
      sizing: getIOSSizing(),
      layout: getIOSLayout(),
      getIconColors: (forceDarkMode?: boolean) => getStandardIconColors(forceDarkMode !== undefined ? forceDarkMode : isDarkMode),
      getStandardIcons: (forceDarkMode?: boolean) => getIOSStandardIcons(forceDarkMode !== undefined ? forceDarkMode : isDarkMode),
    };
  } else {
    return {
      colors: getAndroidColors(),
      sizing: getAndroidSizing(),
      layout: getAndroidLayout(),
      getIconColors: (forceDarkMode?: boolean) => getStandardIconColors(forceDarkMode !== undefined ? forceDarkMode : isDarkMode),
      getStandardIcons: (forceDarkMode?: boolean) => getAndroidStandardIcons(forceDarkMode !== undefined ? forceDarkMode : isDarkMode),
    };
  }
};

export class PlatformCurrentTheme {
  static colors: PlatformColors;
  static sizing: PlatformSizing;
  static layout: PlatformLayout;
  static getIconColors: (isDarkMode: boolean) => IconColorSet;
  static getStandardIcons: (isDarkMode: boolean) => StandardIconSet;

  static updateColorScheme(): void {
    const isDarkMode = Appearance.getColorScheme() === 'dark';

    if (Platform.OS === 'ios') {
      PlatformCurrentTheme.colors = getIOSColors();
      PlatformCurrentTheme.sizing = getIOSSizing();
      PlatformCurrentTheme.layout = getIOSLayout();
      PlatformCurrentTheme.getStandardIcons = (forceDarkMode?: boolean) =>
        getIOSStandardIcons(forceDarkMode !== undefined ? forceDarkMode : isDarkMode);
    } else {
      PlatformCurrentTheme.colors = getAndroidColors();
      PlatformCurrentTheme.sizing = getAndroidSizing();
      PlatformCurrentTheme.layout = getAndroidLayout();
      PlatformCurrentTheme.getStandardIcons = (forceDarkMode?: boolean) =>
        getAndroidStandardIcons(forceDarkMode !== undefined ? forceDarkMode : isDarkMode);
    }

    PlatformCurrentTheme.getIconColors = (forceDarkMode?: boolean) =>
      getStandardIconColors(forceDarkMode !== undefined ? forceDarkMode : isDarkMode);
  }
}

PlatformCurrentTheme.updateColorScheme();

Appearance.addChangeListener(() => {
  PlatformCurrentTheme.updateColorScheme();
});
