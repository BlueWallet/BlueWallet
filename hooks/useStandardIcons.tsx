import { useTheme } from '../components/themes';
import { usePlatformTheme, IconProps } from '../components/platformThemes';

/**
 * A hook that provides standardized icons for the application
 * 
 * @returns An object with standard icon configurations
 */
export const useStandardIcons = () => {
  const { dark: isDarkMode } = useTheme();
  const { layout, colors: platformColors } = usePlatformTheme();
  
  // Direct icon mapping based on SettingsTools.tsx approach
  const icons: Record<string, IconProps> = {
    settings: {
      type: layout.iconType,
      name: layout.settingsIconName,
      color: platformColors.grayIcon,
      backgroundColor: platformColors.grayIconBg,
    },
    currency: {
      type: layout.iconType,
      name: layout.currencyIconName, 
      color: platformColors.greenIcon,
      backgroundColor: platformColors.greenIconBg,
    },
    language: {
      type: layout.iconType,
      name: layout.languageIconName,
      color: platformColors.yellowIcon,
      backgroundColor: platformColors.yellowIconBg,
    },
    security: {
      type: layout.iconType,
      name: layout.securityIconName,
      color: platformColors.redIcon,
      backgroundColor: platformColors.redIconBg,
    },
    network: {
      type: layout.iconType,
      name: layout.networkIconName,
      color: platformColors.blueIcon,
      backgroundColor: platformColors.blueIconBg,
    },
    tools: {
      type: layout.iconType,
      name: layout.toolsIconName,
      color: platformColors.grayIcon,
      backgroundColor: platformColors.grayIconBg,
    },
    about: {
      type: layout.iconType,
      name: layout.aboutIconName,
      color: platformColors.grayIcon,
      backgroundColor: platformColors.grayIconBg,
    },
    // Add other icons needed in your application
    twitter: {
      type: 'font-awesome-6',
      name: 'x-twitter',
      color: isDarkMode ? '#FFFFFF' : '#1da1f2',
      backgroundColor: 'rgba(29, 161, 242, 0.2)',
    },
    telegram: {
      type: layout.iconType,
      name: 'paper-plane',
      color: isDarkMode ? '#FFFFFF' : '#0088cc',
      backgroundColor: 'rgba(0, 136, 204, 0.2)',
    },
    github: {
      type: layout.iconType,
      name: 'logo-github',
      color: isDarkMode ? '#FFFFFF' : '#24292e',
      backgroundColor: 'rgba(24, 23, 23, 0.1)',
    },
    releaseNotes: {
      type: layout.iconType,
      name: 'document-text-outline',
      color: isDarkMode ? '#FFFFFF' : '#9AA0AA',
      backgroundColor: platformColors.grayIconBg,
    },
    licensing: {
      type: layout.iconType,
      name: 'shield-checkmark-outline',
      color: isDarkMode ? '#FFFFFF' : '#24292e',
      backgroundColor: platformColors.grayIconBg,
    },
    selfTest: {
      type: layout.iconType,
      name: 'flask-outline',
      color: isDarkMode ? '#FFFFFF' : '#FC0D44',
      backgroundColor: platformColors.redIconBg,
    },
    performance: {
      type: layout.iconType,
      name: 'speedometer-outline',
      color: isDarkMode ? '#FFFFFF' : '#FC0D44',
      backgroundColor: platformColors.redIconBg,
    },
  };
  
  return (iconName: string): IconProps => {
    if (icons[iconName]) {
      return icons[iconName];
    }
    
    // Default icon if not found
    return {
      name: iconName || 'alert-circle-outline',
      type: layout.iconType,
      color: platformColors.grayIcon,
      backgroundColor: platformColors.grayIconBg,
    };
  };
};
