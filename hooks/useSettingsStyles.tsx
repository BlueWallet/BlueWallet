import { Platform, StyleSheet } from 'react-native';
import { usePlatformTheme } from '../components/platformThemes';

/**
 * A hook that provides consistent styles for settings screens with platform-specific adjustments
 */
export const useSettingsStyles = () => {
  const { colors: platformColors, sizing } = usePlatformTheme();
  const isAndroid = Platform.OS === 'android';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius * 1.5,
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
    sectionHeaderContainer: {
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: platformColors.titleColor,
    },
    sectionSpacing: {
      height: 24,
    },
    subtitleText: {
      fontSize: 14,
      color: platformColors.subtitleColor,
      marginTop: 5,
    },
    // Add missing styles for About screen
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius * 1.5,
      padding: 16,
      marginVertical: 8,
    },
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
