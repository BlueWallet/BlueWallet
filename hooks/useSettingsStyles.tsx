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
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius * 1.5 : 0,
      elevation: layout.showElevation ? sizing.containerElevation : 0,
    },
    headerOffset: {
      // Adjust header offset for Android
      height: isAndroid ? sizing.firstSectionContainerPaddingTop / 2 : sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: 16,
      // Add paddingTop for Android to prevent content overlap with header
      paddingTop: isAndroid ? 8 : 0,
    },
    
    // Section styles
    sectionHeaderContainer: {
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionHeaderText: {
      fontSize: isAndroid ? 14 : 18,
      fontWeight: isAndroid ? '500' : 'bold',
      color: isAndroid ? platformColors.subtitleColor : platformColors.titleColor,
      textTransform: isAndroid ? 'uppercase' : 'none',
      marginLeft: isAndroid ? 8 : 0,
    },
    sectionSpacing: {
      height: 24,
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
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius * 1.5 : 8,
      padding: 16,
      marginVertical: 8,
      elevation: isAndroid ? 2 : 0,
    },
    
    // Info container styles
    infoContainer: {
      backgroundColor: platformColors.cardBackground,
      margin: 16,
      padding: 16,
      borderRadius: sizing.containerBorderRadius * 1.5,
    },
    infoText: {
      color: platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      marginBottom: 8,
    },
    
    // Item-specific styles
    itemHeight: isAndroid ? { height: 56 } : {},
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
      borderRadius: sizing.containerBorderRadius * 1.5,
      backgroundColor: platformColors.cardBackground,
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
  });

  return { styles, isAndroid };
};
