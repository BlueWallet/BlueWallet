import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { usePlatformTheme, PlatformTheme } from '../theme';

/**
 * A hook that provides consistent styles for settings screens with platform-specific adjustments
 */
export const useSettingsStyles = () => {
  const { colors: platformColors, sizing, layout }: PlatformTheme = usePlatformTheme();
  const isAndroid = Platform.OS === 'android';

  const styles = StyleSheet.create({
    // Base container styles
    container: {
      flex: 1,
      backgroundColor: isAndroid ? '#F1F3F4' : platformColors.background, // Android settings background color
    },
    listItemContainer: {
      backgroundColor: isAndroid ? 'transparent' : platformColors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius * 1.5 : 0,
      elevation: isAndroid ? 1 : layout.showElevation ? sizing.containerElevation : 0,
      marginBottom: isAndroid ? 0 : 8,
    },
    headerOffset: {
      // Adjust header offset for Android
      height: isAndroid ? sizing.firstSectionContainerPaddingTop / 2 : sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: isAndroid ? 0 : 16, // No margin for Android settings
      paddingTop: isAndroid ? 0 : 0, // No padding for Android
      paddingBottom: 16,
    },
    
    // First section container - used in multiple settings screens
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginHorizontal: isAndroid ? 0 : 16,
      marginBottom: isAndroid ? 16 : sizing.sectionContainerMarginBottom || 16,
    },

    // Section styles
    sectionHeaderContainer: {
      marginTop: isAndroid ? 24 : 16,
      marginBottom: isAndroid ? 8 : 8,
      paddingHorizontal: 16, 
      ...(isAndroid && {
        height: 48,
        justifyContent: 'center',
      }),
    },
    sectionHeaderText: {
      fontSize: isAndroid ? 14 : 18,
      fontWeight: isAndroid ? '500' : 'bold',
      color: isAndroid ? '#5F6368' : platformColors.titleColor, // Material Design section header color
      textTransform: isAndroid ? 'uppercase' : 'none',
      marginLeft: isAndroid ? 8 : 0,
      letterSpacing: isAndroid ? 0.25 : 0,
    },
    sectionSpacing: {
      height: isAndroid ? 8 : 24, // Less spacing for Android
    },

    // Card styles
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius * 1.5 : 0,
      padding: 16,
      marginVertical: 8,
      elevation: isAndroid ? 1 : 0,
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
      height: 56, // Material Design standard height
      paddingHorizontal: 16,
    },
    androidItemSeparator: {
      height: 1,
      backgroundColor: '#E1E3E5', // Light gray separator
      marginLeft: 72, // Align with text (icon width + margins)
    },
    androidItemTitle: {
      fontSize: 16,
      fontWeight: '400', // Regular weight for Android
      color: '#202124', // Material Design primary text color
    },
    androidItemSubtitle: {
      fontSize: 14,
      fontWeight: '400',
      color: '#5F6368', // Material Design secondary text color
      marginTop: 2,
    },
    androidRippleIcon: {
      borderRadius: 28,
      overflow: 'hidden',
      marginRight: 32, // More space between icon and text in Material Design
    },

    // Text styles
    subtitleText: {
      fontSize: 14,
      color: isAndroid ? '#5F6368' : platformColors.subtitleColor,
      marginTop: 5,
    },

    // Info container styles
    infoContainer: {
      backgroundColor: platformColors.cardBackground,
      margin: isAndroid ? 16 : 16,
      padding: 16,
      borderRadius: isAndroid ? 4 : sizing.containerBorderRadius * 1.5,
      elevation: isAndroid ? 1 : 0,
    },
    infoText: {
      color: isAndroid ? '#202124' : platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      marginBottom: 8,
    },
    infoTextCentered: {
      color: isAndroid ? '#202124' : platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      marginBottom: 8,
      textAlign: 'center',
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
      color: isAndroid ? '#5F6368' : platformColors.subtitleColor,
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
      color: isAndroid ? '#202124' : platformColors.titleColor,
    },
    buildWith: {
      padding: 16,
      paddingTop: 0,
      borderRadius: isAndroid ? 4 : sizing.containerBorderRadius * 1.5,
      backgroundColor: platformColors.cardBackground,
      elevation: isAndroid ? 1 : 0,
    },
    footerContainer: {
      padding: 16,
      alignItems: 'center',
    },
    footerText: {
      color: isAndroid ? '#5F6368' : platformColors.subtitleColor,
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
      color: isAndroid ? '#1A73E8' : '#68bbe1', // Material blue for Android
    },
  });

  // Additional utility functions for conditionally applying corner styling
  const getConditionalCornerRadius = (isFirstInGroup: boolean, isLastInGroup: boolean) => {
    if (isAndroid) {
      // Android doesn't use rounded corners in settings
      return {
        borderRadius: 0,
        backgroundColor: platformColors.cardBackground,
      };
    }
    
    if (isFirstInGroup && !isLastInGroup) {
      return {
        ...styles.topRoundedItem,
      };
    } else if (!isFirstInGroup && isLastInGroup) {
      return {
        ...styles.bottomRoundedItem,
      };
    } else if (isFirstInGroup && isLastInGroup) {
      return {
        borderRadius: sizing.containerBorderRadius * 1.5,
        backgroundColor: platformColors.cardBackground,
      };
    } else {
      return {
        borderRadius: 0,
        backgroundColor: platformColors.cardBackground,
      };
    }
  };

  return { 
    styles, 
    isAndroid, 
    getConditionalCornerRadius 
  };
};
