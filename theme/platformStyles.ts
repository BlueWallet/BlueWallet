/**
 * platformStyles.ts - Consolidated platform styling system for BlueWallet
 * 
 * This file serves as the single source of truth for platform-specific styling
 * across the entire application, replacing the previous distributed system:
 * - theme/NativePlatformTheme.ts
 * - components/platformThemes.ts
 * - hooks/platformHooks.ts
 * - styles/platformStyles.tsx
 */

import React from 'react';
import { Platform, StyleSheet, PlatformColor, Appearance, OpaqueColorValue } from 'react-native';
import { useTheme } from '@react-navigation/native';

// ===============================================
// Types & Interfaces
// ===============================================

type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export interface IconProps {
  name: string;
  type: string;
  color: string | OpaqueColorValue;
  backgroundColor?: string | OpaqueColorValue;
}

export interface IconColorSet {
  [key: string]: string | OpaqueColorValue;
}

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
  switchThumbColor?: string | OpaqueColorValue | ((value: boolean) => string | OpaqueColorValue);
  switchIosBackgroundColor: string | OpaqueColorValue;
  rippleColor?: string | OpaqueColorValue;
}

export interface PlatformSizing {
  basePadding?: number;
  baseMargin?: number;
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
  contentContainerMarginHorizontal?: number;
  contentContainerPaddingHorizontal?: number;
}

export interface PlatformLayout {
  showBorderBottom: boolean;
  showElevation: boolean;
  showBorderRadius: boolean;
  useRoundedListItems: boolean;
  showIconBackground: boolean;
  iconType: 'ionicon' | 'font-awesome-5' | 'font-awesome-6' | 'material-community';
  settingsIconName: string;
  currencyIconName: string;
  languageIconName: string;
  securityIconName: string;
  networkIconName: string;
  toolsIconName: string;
  aboutIconName: string;
  rippleEffect: boolean;
  cardShadow?: object;
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

export interface PlatformTheme {
  colors: PlatformColors;
  sizing: PlatformSizing;
  layout: PlatformLayout;
  getIconColors: (isDarkMode?: boolean) => IconColorSet;
  getStandardIcons: (isDarkMode?: boolean) => StandardIconSet;
}

// ===============================================
// Helper Functions
// ===============================================

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

// ===============================================
// Color Definitions
// ===============================================

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
  settings: isDarkMode ? '#FFFFFF' : '#5F6368',
  currency: isDarkMode ? '#7EE0A4' : '#0F9D58',
  language: isDarkMode ? '#FFD580' : '#F4B400',
  security: isDarkMode ? '#FF8E8E' : '#DB4437',
  network: isDarkMode ? '#82B1FF' : '#1A73E8',
  lightning: isDarkMode ? '#FFD580' : '#F4B400',
  privacy: isDarkMode ? '#FFFFFF' : '#000000',
  tools: isDarkMode ? '#D0BCFF' : '#673AB7',
  about: isDarkMode ? '#FFFFFF' : '#5F6368',
});

export const getIOSColors = (): PlatformColors => {
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

    rippleColor: 'rgba(0, 0, 0, 0.2)',
    switchTrackColorFalse: PlatformColor('systemFill'),
    switchTrackColorTrue: PlatformColor('systemGreen'),
    switchIosBackgroundColor: PlatformColor('systemFill'),
  };
};

export const getAndroidColors = (): PlatformColors => {
  const isDark = Appearance.getColorScheme() === 'dark';

  // Material Design colors for Android
  const textColor = isDark ? '#FFFFFF' : '#202124';
  const subtitleColor = isDark ? '#B3B3B3' : '#5F6368';
  const chevronColor = isDark ? '#9E9E9E' : '#757575';

  // Material Design background and accent colors
  const backgroundColor = isDark ? '#121212' : '#F8F9FA';
  const cardBackground = isDark ? '#1E1E1E' : '#FFFFFF';

  return {
    titleColor: textColor,
    subtitleColor,
    chevronColor,

    background: backgroundColor,
    cardBackground,
    textColor,

    blueIcon: isDark ? '#82B1FF' : '#1A73E8', // Google blue
    greenIcon: isDark ? '#69F0AE' : '#0F9D58', // Google green
    yellowIcon: isDark ? '#FFD600' : '#F4B400', // Google yellow
    redIcon: isDark ? '#FF5252' : '#DB4437', // Google red
    grayIcon: isDark ? '#BDBDBD' : '#5F6368', // Material gray

    // No background colors for icons in Android (flat design)
    blueIconBg: 'transparent',
    greenIconBg: 'transparent',
    yellowIconBg: 'transparent',
    redIconBg: 'transparent',
    grayIconBg: 'transparent',

    // Material Design ripple color
    rippleColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',

    // Material Design switch colors
    switchTrackColorFalse: isDark ? '#6E6E6E' : '#E0E0E0',
    switchTrackColorTrue: isDark ? 'rgba(187, 134, 252, 0.5)' : 'rgba(98, 0, 238, 0.5)',
    switchThumbColor: isDark ? (value: boolean) => (value ? '#BB86FC' : '#BDBDBD') : (value: boolean) => (value ? '#6200EE' : '#FFFFFF'),
    switchIosBackgroundColor: 'transparent',
  };
};

// ===============================================
// Sizing Definitions
// ===============================================

export const getIOSSizing = (): PlatformSizing => ({
  basePadding: 16,
  baseMargin: 16,
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
  leftIconMarginLeft: 0,
  leftIconMarginRight: 8,
  leftIconWidth: 28,
  leftIconHeight: 28,
  contentContainerMarginHorizontal: 16,
  contentContainerPaddingHorizontal: 0,
});

export const getAndroidSizing = (): PlatformSizing => ({
  basePadding: 16,
  baseMargin: 16,
  titleFontSize: 16,
  titleFontWeight: '500',
  subtitleFontSize: 14,
  subtitleFontWeight: '400',
  subtitleLineHeight: 20,
  subtitlePaddingVertical: 2,
  itemMinHeight: 56, // Material Design standard for single-line items
  iconSize: 24, // Material Design standard icon size
  iconInnerSize: 22,
  iconContainerSize: 24,
  iconContainerBorderRadius: 0, // Flat design for Android
  containerPaddingVertical: 8, // Reduced padding for tighter layout
  containerElevation: 1, // Light elevation for card-like appearance
  containerMarginVertical: 0, // No margin between items in the same section
  containerBorderRadius: 4, // Light rounding for Android
  sectionHeaderHeight: 48, // Standard Material Design section header height
  sectionHeaderPaddingBottom: 8,
  sectionContainerMarginBottom: 16, // Space between sections
  firstSectionContainerPaddingTop: 8,
  leftIconMarginLeft: 0, // Material Design standard margins
  leftIconMarginRight: 8, // More space between icon and text
  leftIconWidth: 24,
  leftIconHeight: 24,
  contentContainerMarginHorizontal: 0,
  contentContainerPaddingHorizontal: 16,
});

// ===============================================
// Layout Definitions
// ===============================================

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
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

export const getAndroidLayout = (): PlatformLayout => ({
  showBorderBottom: false, // Remove borders between items
  showElevation: true, // Use elevation for section cards
  showBorderRadius: true, // Add slight border radius for better visual separation
  useRoundedListItems: false, // Flat list items for Android
  showIconBackground: false, // No icon backgrounds for Android's flat design
  iconType: 'ionicon', // Using Ionicons for better compatibility
  settingsIconName: 'settings-outline',
  currencyIconName: 'cash-outline',
  languageIconName: 'language-outline',
  securityIconName: 'shield-outline',
  networkIconName: 'globe-outline',
  toolsIconName: 'construct-outline',
  aboutIconName: 'information-circle-outline',
  rippleEffect: true, // Enable touch ripple effect
  cardShadow: {}, // No shadow - using elevation instead
});

// ===============================================
// Icon Definitions
// ===============================================

const getIOSStandardIcons = (isDarkMode: boolean): StandardIconSet => {
  const colors = getStandardIconColors(isDarkMode);
  const platformColors = getIOSColors();

  return {
    // Settings
    settings: {
      name: 'settings-outline',
      type: 'ionicon',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
    currency: {
      name: 'cash-outline',
      type: 'ionicon',
      color: colors.currency,
      backgroundColor: platformColors.greenIconBg,
    },
    language: {
      name: 'language-outline',
      type: 'ionicon',
      color: colors.language,
      backgroundColor: platformColors.yellowIconBg,
    },
    security: {
      name: 'shield-checkmark-outline',
      type: 'ionicon',
      color: colors.security,
      backgroundColor: platformColors.redIconBg,
    },
    network: {
      name: 'globe-outline',
      type: 'ionicon',
      color: colors.network,
      backgroundColor: platformColors.blueIconBg,
    },
    lightning: {
      name: 'flash-outline',
      type: 'ionicon',
      color: colors.lightning,
      backgroundColor: platformColors.yellowIconBg,
    },
    privacy: {
      name: 'lock-closed-outline',
      type: 'ionicon',
      color: colors.privacy,
      backgroundColor: platformColors.grayIconBg,
    },
    tools: {
      name: 'construct-outline',
      type: 'ionicon',
      color: colors.tools,
      backgroundColor: platformColors.grayIconBg,
    },
    about: {
      name: 'information-circle-outline',
      type: 'ionicon',
      color: colors.about,
      backgroundColor: platformColors.grayIconBg,
    },
    // About screen
    x: {
      name: 'logo-twitter',
      type: 'ionicon',
      color: colors.x,
      backgroundColor: 'rgba(29, 161, 242, 0.2)',
    },
    twitter: {
      name: 'logo-twitter',
      type: 'ionicon',
      color: colors.twitter,
      backgroundColor: 'rgba(29, 161, 242, 0.2)',
    },
    telegram: {
      name: 'paper-plane-outline',
      type: 'ionicon',
      color: colors.telegram,
      backgroundColor: 'rgba(0, 136, 204, 0.2)',
    },
    github: {
      name: 'logo-github',
      type: 'ionicon',
      color: colors.github,
      backgroundColor: 'rgba(24, 23, 23, 0.1)',
    },
    releaseNotes: {
      name: 'document-text-outline',
      type: 'ionicon',
      color: colors.releaseNotes,
      backgroundColor: platformColors.grayIconBg,
    },
    licensing: {
      name: 'shield-checkmark-outline',
      type: 'ionicon',
      color: colors.licensing,
      backgroundColor: platformColors.grayIconBg,
    },
    selfTest: {
      name: 'flask-outline',
      type: 'ionicon',
      color: colors.selfTest,
      backgroundColor: platformColors.redIconBg,
    },
    performance: {
      name: 'speedometer-outline',
      type: 'ionicon',
      color: colors.performance,
      backgroundColor: platformColors.redIconBg,
    },
    // Explorers and accessibility
    blockExplorer: {
      name: 'search-outline',
      type: 'ionicon',
      color: colors.network,
      backgroundColor: platformColors.blueIconBg,
    },
    qrCode: {
      name: 'qr-code-outline',
      type: 'ionicon',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
    share: {
      name: 'share-outline',
      type: 'ionicon',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
    copy: {
      name: 'copy-outline',
      type: 'ionicon',
      color: colors.settings,
      backgroundColor: platformColors.grayIconBg,
    },
  };
};

const getAndroidStandardIcons = (isDarkMode: boolean): StandardIconSet => {
  const colors = getStandardIconColors(isDarkMode);

  return {
    // Settings - using FontAwesome5 icons for better Android compatibility
    settings: {
      name: 'cog',
      type: 'font-awesome-5',
      color: colors.settings,
    },
    currency: {
      name: 'dollar-sign',
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
      name: 'wrench',
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
      name: 'close',
      type: 'ionicon',
      color: colors.x,
    },
    twitter: {
      name: 'logo-twitter',
      type: 'ionicon',
      color: colors.twitter,
    },
    telegram: {
      name: 'paper-plane-outline',
      type: 'ionicon',
      color: colors.telegram,
    },
    github: {
      name: 'logo-github',
      type: 'ionicon',
      color: colors.github,
    },
    releaseNotes: {
      name: 'document-text-outline',
      type: 'ionicon',
      color: colors.releaseNotes,
    },
    licensing: {
      name: 'shield-checkmark-outline',
      type: 'ionicon',
      color: colors.licensing,
    },
    selfTest: {
      name: 'flask-outline',
      type: 'ionicon',
      color: colors.selfTest,
    },
    performance: {
      name: 'speedometer-outline',
      type: 'ionicon',
      color: colors.performance,
    },
    // Explorers and accessibility
    blockExplorer: {
      name: 'search-outline',
      type: 'ionicon',
      color: colors.network,
    },
    qrCode: {
      name: 'qr-code-outline',
      type: 'ionicon',
      color: colors.settings,
    },
    share: {
      name: 'share-social-outline',
      type: 'ionicon',
      color: colors.settings,
    },
    copy: {
      name: 'copy-outline',
      type: 'ionicon',
      color: colors.settings,
    },
  };
};

// ===============================================
// Main Hook: usePlatformStyles
// ===============================================

/**
 * The primary hook for accessing platform-specific styles, colors, icons, and layout
 * 
 * This hook consolidates all platform-specific styling functionality into a single API,
 * replacing the previous hooks:
 * - usePlatformTheme
 * - useSettingsStyles 
 * - useStandardIcons
 * - useNativePlatformTheme
 * 
 * @returns An object containing platform-specific styles, colors, icons, and utility functions
 */
export const usePlatformStyles = () => {
  const { dark } = useTheme();
  const isAndroid = Platform.OS === 'android';

  // Get the platform theme data
  const platformTheme: PlatformTheme = isAndroid
    ? {
        colors: getAndroidColors(),
        sizing: getAndroidSizing(),
        layout: getAndroidLayout(),
        getIconColors: (forceDarkMode?: boolean) => getStandardIconColors(forceDarkMode !== undefined ? forceDarkMode : dark),
        getStandardIcons: (forceDarkMode?: boolean) => getAndroidStandardIcons(forceDarkMode !== undefined ? forceDarkMode : dark)
      }
    : {
        colors: getIOSColors(),
        sizing: getIOSSizing(),
        layout: getIOSLayout(),
        getIconColors: (forceDarkMode?: boolean) => getStandardIconColors(forceDarkMode !== undefined ? forceDarkMode : dark),
        getStandardIcons: (forceDarkMode?: boolean) => getIOSStandardIcons(forceDarkMode !== undefined ? forceDarkMode : dark)
      };

  const { colors, sizing, layout } = platformTheme;

  // Common styles for both platforms
  const styles = StyleSheet.create({
    // Main container styles
    container: {
      flex: 1,
      backgroundColor: isAndroid ? '#F1F3F4' : colors.background,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
      paddingTop: sizing.baseMargin || 16,
      marginHorizontal: isAndroid ? 0 : 16,
    },
    
    // Card and section styles
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius : 0,
      padding: sizing.basePadding || 16,
      marginVertical: 8,
      marginHorizontal: isAndroid ? 16 : 0,
      ...(isAndroid && { elevation: sizing.containerElevation }),
      ...(!isAndroid && layout.cardShadow),
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: isAndroid ? 0 : sizing.contentContainerMarginHorizontal || 16,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
      marginTop: isAndroid ? 8 : 12,
    },
    sectionContainer: {
      marginTop: isAndroid ? 16 : 8,
      marginHorizontal: isAndroid ? 0 : sizing.contentContainerMarginHorizontal || 16,
      marginBottom: sizing.sectionContainerMarginBottom || 16,
    },
    sectionHeaderContainer: {
      marginTop: isAndroid ? 24 : 16,
      marginBottom: isAndroid ? 8 : 8,
      paddingHorizontal: 16,
      ...(isAndroid && {
        height: sizing.sectionHeaderHeight,
        justifyContent: 'center',
      }),
    },
    sectionHeaderText: {
      fontSize: isAndroid ? 14 : 18,
      fontWeight: isAndroid ? '500' : 'bold',
      color: isAndroid ? '#5F6368' : colors.titleColor,
      textTransform: isAndroid ? 'uppercase' : 'none',
      marginLeft: isAndroid ? 8 : 0,
      letterSpacing: isAndroid ? 0.25 : 0,
    },
    
    // Item styles
    listItemContainer: {
      backgroundColor: isAndroid ? 'transparent' : colors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius : 0,
      elevation: isAndroid ? sizing.containerElevation : layout.showElevation ? sizing.containerElevation : 0,
      marginBottom: isAndroid ? 0 : 8,
      paddingVertical: isAndroid ? 12 : 14,
      paddingHorizontal: isAndroid ? 16 : 16,
      marginHorizontal: isAndroid ? 0 : 16,
      overflow: 'hidden',
    },
    itemContainer: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: isAndroid ? 0 : 16,
      borderRadius: isAndroid ? 0 : sizing.containerBorderRadius,
      elevation: isAndroid ? 1 : 0,
      marginBottom: isAndroid ? 0 : 1,
      overflow: 'hidden',
      marginVertical: isAndroid ? 1 : 0,
    },
    
    // Item rounded styles (for iOS grouped appearance)
    topRoundedItem: {
      borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
      borderTopRightRadius: sizing.containerBorderRadius * 1.5,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      backgroundColor: colors.cardBackground,
      paddingTop: isAndroid ? 0 : 4,
    },
    bottomRoundedItem: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
      borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
      backgroundColor: colors.cardBackground,
      paddingBottom: isAndroid ? 0 : 4,
    },
    
    // Separator
    separator: {
      height: 1,
      backgroundColor: isAndroid ? 'rgba(0,0,0,0.08)' : colors.separatorColor || 'rgba(0,0,0,0.1)',
      marginLeft: isAndroid ? 72 : 16,
    },
    
    // Info styles
    infoText: {
      color: colors.subtitleColor,
      fontSize: isAndroid ? 14 : 15,
      lineHeight: isAndroid ? 20 : 22,
      marginBottom: 16,
    },
    infoContainer: {
      backgroundColor: colors.cardBackground,
      margin: 16,
      padding: 16,
      borderRadius: isAndroid ? 4 : sizing.containerBorderRadius * 1.5,
      elevation: isAndroid ? 1 : 0,
      ...(!isAndroid && layout.cardShadow),
    },
    infoTextCentered: {
      color: isAndroid ? '#202124' : colors.titleColor,
      fontSize: sizing.subtitleFontSize,
      marginBottom: 8,
      textAlign: 'center',
    },
    
    // Input styles
    textInputContainer: {
      marginBottom: isAndroid ? 16 : 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.2)',
      borderRadius: 4,
      backgroundColor: colors.cardBackground,
    },
    textInput: {
      flex: 1,
      paddingVertical: isAndroid ? 12 : 8,
      paddingHorizontal: 8,
      color: colors.titleColor,
      fontSize: 14,
    },
    
    // About screen specific styles
    center: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    logo: {
      width: 102,
      height: 124,
    },
    textFree: {
      maxWidth: 260,
      marginVertical: 24,
      color: isAndroid ? '#5F6368' : colors.subtitleColor,
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500',
    },
    textBackup: {
      maxWidth: 260,
      marginBottom: 40,
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500',
      color: isAndroid ? '#202124' : colors.titleColor,
    },
    buildWith: {
      padding: 16,
      paddingTop: 0,
      borderRadius: isAndroid ? 4 : sizing.containerBorderRadius * 1.5,
      backgroundColor: colors.cardBackground,
      elevation: isAndroid ? 1 : 0,
    },
    footerContainer: {
      padding: 16,
      alignItems: 'center',
    },
    footerText: {
      color: isAndroid ? '#5F6368' : colors.subtitleColor,
      fontSize: 13,
      marginBottom: 4,
      textAlign: 'center',
    },
    copyToClipboard: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    copyToClipboardText: {
      fontSize: 13,
      fontWeight: '400',
      color: isAndroid ? '#1A73E8' : '#68bbe1',
    },
    
    // Android-specific styles
    androidCardContainer: {
      backgroundColor: '#FFFFFF',
      elevation: 1,
      marginVertical: 4,
      marginHorizontal: 0,
    },
    androidSectionTitle: {
      color: '#5F6368',
      fontSize: 14,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.25,
      marginLeft: 16,
      marginTop: 24,
      marginBottom: 8,
    },
    androidListItem: {
      height: 56,
      paddingHorizontal: 16,
    },
    androidItemSeparator: {
      height: 1,
      backgroundColor: '#E1E3E5',
      marginLeft: 72,
    },
    androidItemTitle: {
      fontSize: 16,
      fontWeight: '400',
      color: '#202124',
    },
    androidItemSubtitle: {
      fontSize: 14,
      fontWeight: '400',
      color: '#5F6368',
      marginTop: 2,
    },
    androidRippleIcon: {
      borderRadius: 28,
      overflow: 'hidden',
      marginRight: 32,
    },
    
    // Spacing utilities
    spacingLarge: {
      height: 24,
    },
    spacingMedium: {
      height: 16,
    },
    spacingSmall: {
      height: 8,
    },
    sectionSpacing: {
      height: isAndroid ? 8 : 24,
    },
    headerOffset: {
      height: isAndroid ? sizing.firstSectionContainerPaddingTop / 2 : sizing.firstSectionContainerPaddingTop,
    },
  });

  /**
   * Gets icon props for a specific icon key
   * @param iconName The name of the icon to retrieve
   * @returns IconProps object for the specified icon
   */
  const getIcon = (iconName: keyof StandardIconSet): IconProps => {
    const icons = platformTheme.getStandardIcons(dark);

    if (iconName in icons) {
      return icons[iconName];
    }

    // Fallback icon
    return {
      name: 'information-circle-outline',
      type: 'ionicon',
      color: dark ? '#FFFFFF' : isAndroid ? '#5F6368' : colors.grayIcon,
      backgroundColor: isAndroid ? 'transparent' : dark ? 'rgba(255,255,255,0.12)' : colors.grayIconBg,
    };
  };

  /**
   * Returns style objects for conditional corner radius application
   * @param isFirstInGroup Whether the item is first in a group
   * @param isLastInGroup Whether the item is last in a group
   * @returns Style object with appropriate border radius
   */
  const getConditionalCornerRadius = (isFirstInGroup: boolean, isLastInGroup: boolean) => {
    if (isAndroid || !layout.useRoundedListItems) {
      return {
        borderRadius: 0,
        backgroundColor: colors.cardBackground,
      };
    }

    if (isFirstInGroup && !isLastInGroup) {
      return styles.topRoundedItem;
    } else if (!isFirstInGroup && isLastInGroup) {
      return styles.bottomRoundedItem;
    } else if (isFirstInGroup && isLastInGroup) {
      return {
        borderRadius: sizing.containerBorderRadius,
        backgroundColor: colors.cardBackground,
      };
    } else {
      return {
        borderRadius: 0,
        backgroundColor: colors.cardBackground,
      };
    }
  };

  /**
   * Renders a section header component (primarily for Android)
   * @param title The title of the section
   * @returns A configuration object for the section header
   */
  const renderSectionHeader = (title: string) => {
    return {
      type: 'sectionHeader',
      title,
      style: styles.sectionHeaderContainer,
      textStyle: styles.sectionHeaderText,
    };
  };

  /**
   * A separator component for list items
   */
  const renderSeparator = isAndroid ? { type: 'separator', style: styles.separator } : null;

  return {
    // Theme data
    colors,
    sizing,
    layout,
    platformTheme,

    // Styles
    styles,

    // Utility functions
    getIcon,
    getConditionalCornerRadius,
    renderSectionHeader,
    renderSeparator,

    // Platform info
    isAndroid,
    isDarkMode: dark,
  };
};

// ===============================================
// Static Manager for Non-Hook Access
// ===============================================

/**
 * Static manager for accessing theme properties without hooks
 * Useful for files that can't use hooks or need theme access outside of components
 */
export class PlatformStylesManager {
  static colors: PlatformColors;
  static sizing: PlatformSizing;
  static layout: PlatformLayout;
  static getIconColors: (isDarkMode: boolean) => IconColorSet;
  static getStandardIcons: (isDarkMode: boolean) => StandardIconSet;

  static updateColorScheme(): void {
    const isDarkMode = Appearance.getColorScheme() === 'dark';
    const isAndroid = Platform.OS === 'android';

    if (isAndroid) {
      PlatformStylesManager.colors = getAndroidColors();
      PlatformStylesManager.sizing = getAndroidSizing();
      PlatformStylesManager.layout = getAndroidLayout();
      PlatformStylesManager.getStandardIcons = (forceDarkMode?: boolean) =>
        getAndroidStandardIcons(forceDarkMode !== undefined ? forceDarkMode : isDarkMode);
    } else {
      PlatformStylesManager.colors = getIOSColors();
      PlatformStylesManager.sizing = getIOSSizing();
      PlatformStylesManager.layout = getIOSLayout();
      PlatformStylesManager.getStandardIcons = (forceDarkMode?: boolean) =>
        getIOSStandardIcons(forceDarkMode !== undefined ? forceDarkMode : isDarkMode);
    }

    PlatformStylesManager.getIconColors = (forceDarkMode?: boolean) =>
      getStandardIconColors(forceDarkMode !== undefined ? forceDarkMode : isDarkMode);
  }
}

// Initialize the static theme manager
PlatformStylesManager.updateColorScheme();

// Listen for appearance changes
Appearance.addChangeListener(() => {
  PlatformStylesManager.updateColorScheme();
});

// ===============================================
// Backwards Compatibility Layer
// ===============================================

/**
 * Compatibility hook for previous useSettingsStyles
 * @deprecated Use usePlatformStyles instead
 */
export const useSettingsStyles = () => {
  const { styles, isAndroid, getConditionalCornerRadius, renderSeparator } = usePlatformStyles();
  return { styles, isAndroid, getConditionalCornerRadius, renderSeparator };
};

/**
 * Compatibility hook for previous usePlatformTheme
 * @deprecated Use usePlatformStyles instead
 */
export const usePlatformTheme = () => {
  const { platformTheme } = usePlatformStyles();
  return platformTheme;
};

/**
 * Compatibility hook for previous useStandardIcons
 * @deprecated Use usePlatformStyles().getIcon instead
 */
export const useStandardIcons = () => {
  const { getIcon } = usePlatformStyles();
  return getIcon;
};