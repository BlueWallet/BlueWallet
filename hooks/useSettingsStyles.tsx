import { Platform, StyleSheet } from 'react-native';
import { usePlatformTheme, PlatformTheme } from '../components/platformThemes';

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
      backgroundColor: platformColors.background,
      paddingHorizontal: 16,
    },
    listItemContainer: {
      backgroundColor: isAndroid ? 'transparent' : platformColors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius * 1.5 : 0,
      elevation: isAndroid ? 0 : layout.showElevation ? sizing.containerElevation : 0,
      marginBottom: isAndroid ? 0 : 8,
    },
    headerOffset: {
      // Adjust header offset for Android
      height: isAndroid ? sizing.firstSectionContainerPaddingTop / 2 : sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      // Add paddingTop for Android to prevent content overlap with header
      paddingTop: isAndroid ? 8 : 0,
    },

    // Section styles
    sectionHeaderContainer: {
      marginTop: isAndroid ? 24 : 16,
      marginBottom: isAndroid ? 0 : 8,
      paddingHorizontal: 16, 
      ...(isAndroid && {
        height: 48,
        justifyContent: 'center',
      }),
    },
    sectionHeaderText: {
      fontSize: isAndroid ? 14 : 18,
      fontWeight: isAndroid ? '500' : 'bold',
      color: isAndroid ? platformColors.subtitleColor : platformColors.titleColor,
      textTransform: isAndroid ? 'uppercase' : 'none',
      marginLeft: isAndroid ? 8 : 0,
      letterSpacing: isAndroid ? 0.25 : 0,
    },
    sectionSpacing: {
      height: isAndroid ? 8 : 24, // Less spacing for Android
    },

    // Text styles
    subtitleText: {
      fontSize: 14,
      color: platformColors.subtitleColor,
      marginTop: 5,
    },

    // Card styles
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius * 1.5 : 0,
      padding: 16,
      marginVertical: 8,
      elevation: isAndroid ? 1 : 0,
    },

    // Info container styles
    infoContainer: {
      backgroundColor: platformColors.cardBackground,
      margin: isAndroid ? 8 : 16,
      padding: 16,
      borderRadius: isAndroid ? 4 : sizing.containerBorderRadius * 1.5,
      elevation: isAndroid ? 1 : 0,
    },
    infoText: {
      color: platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      marginBottom: 8,
    },

    // Item-specific styles
    itemHeight: isAndroid ? { height: 56 } : {}, // Material Design standard height
    width24: {
      width: 24,
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
      color: platformColors.subtitleColor,
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
      color: platformColors.titleColor,
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
      color: platformColors.subtitleColor,
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
      color: '#68bbe1',
    },
    
    // Encryption settings specific styles
    encryptListItemContainer: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius * 1.5,
    },
    topRoundedItem: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
      borderTopRightRadius: sizing.containerBorderRadius * 1.5,
      backgroundColor: platformColors.cardBackground,
    },
    bottomRoundedItem: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
      borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
      backgroundColor: platformColors.cardBackground,
    },
  });

  // Additional utility functions for conditionally applying corner styling
  const getConditionalCornerRadius = (isFirstInGroup: boolean, isLastInGroup: boolean) => {
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
