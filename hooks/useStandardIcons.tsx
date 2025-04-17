import { useTheme } from '../components/themes';
import { usePlatformTheme, IconProps } from '../components/platformThemes';

export const useStandardIcons = () => {
  const { dark: isDarkMode } = useTheme();
  const { layout, colors: platformColors } = usePlatformTheme();

  const icons: Record<string, IconProps> = {
    settings: {
      type: layout.iconType,
      name: layout.settingsIconName,
      color: isDarkMode ? '#FFFFFF' : '#333333',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(51,51,51,0.15)',
    },
    currency: {
      type: layout.iconType,
      name: layout.currencyIconName,
      color: isDarkMode ? '#7EE0A4' : '#0D682B',
      backgroundColor: isDarkMode ? 'rgba(126,224,164,0.12)' : 'rgba(13,104,43,0.15)',
    },
    language: {
      type: layout.iconType,
      name: layout.languageIconName,
      color: isDarkMode ? '#FFD580' : '#B05000',
      backgroundColor: isDarkMode ? 'rgba(255,213,128,0.12)' : 'rgba(176,80,0,0.15)',
    },
    security: {
      type: layout.iconType,
      name: layout.securityIconName,
      color: isDarkMode ? '#FF8E8E' : '#C00000',
      backgroundColor: isDarkMode ? 'rgba(255,142,142,0.12)' : 'rgba(192,0,0,0.15)',
    },
    network: {
      type: layout.iconType,
      name: layout.networkIconName,
      color: isDarkMode ? '#82B1FF' : '#0043B0',
      backgroundColor: isDarkMode ? 'rgba(130,177,255,0.12)' : 'rgba(0,67,176,0.15)',
    },
    tools: {
      type: layout.iconType,
      name: layout.toolsIconName,
      color: isDarkMode ? '#D0BCFF' : '#5C3A9E',
      backgroundColor: isDarkMode ? 'rgba(208,188,255,0.12)' : 'rgba(92,58,158,0.15)',
    },
    about: {
      type: layout.iconType,
      name: layout.aboutIconName,
      color: isDarkMode ? '#FFFFFF' : '#444444',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(68,68,68,0.15)',
    },

    'x-twitter': {
      type: 'font-awesome-6',
      name: 'x-twitter',
      color: isDarkMode ? '#FFFFFF' : '#14171A',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(20,23,26,0.15)',
    },
    twitter: {
      type: layout.iconType,
      name: 'logo-twitter',
      color: isDarkMode ? '#FFFFFF' : '#1565C0',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(21,101,192,0.15)',
    },
    telegram: {
      type: layout.iconType,
      name: 'paper-plane',
      color: isDarkMode ? '#FFFFFF' : '#0057A3',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,87,163,0.15)',
    },
    github: {
      type: layout.iconType,
      name: 'logo-github',
      color: isDarkMode ? '#FFFFFF' : '#121212',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(18,18,18,0.15)',
    },

    releaseNotes: {
      type: layout.iconType,
      name: 'document-text-outline',
      color: isDarkMode ? '#FFFFFF' : '#9AA0AA',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : platformColors.grayIconBg,
    },
    licensing: {
      type: layout.iconType,
      name: 'shield-checkmark-outline',
      color: isDarkMode ? '#FFFFFF' : '#24292e',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : platformColors.grayIconBg,
    },
    selfTest: {
      type: layout.iconType,
      name: 'flask-outline',
      color: isDarkMode ? '#FF8E8E' : '#FC0D44',
      backgroundColor: isDarkMode ? 'rgba(255,142,142,0.12)' : platformColors.redIconBg,
    },
    performance: {
      type: layout.iconType,
      name: 'speedometer-outline',
      color: isDarkMode ? '#FF8E8E' : '#FC0D44',
      backgroundColor: isDarkMode ? 'rgba(255,142,142,0.12)' : platformColors.redIconBg,
    },

    qrCode: {
      type: layout.iconType,
      name: 'qr-code-outline',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : platformColors.grayIconBg,
    },
    share: {
      type: layout.iconType,
      name: 'share-outline',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : platformColors.grayIconBg,
    },
    copy: {
      type: layout.iconType,
      name: 'copy-outline',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : platformColors.grayIconBg,
    },
  };

  return (iconName: string): IconProps => {
    if (icons[iconName]) {
      return icons[iconName];
    }

    return {
      name: iconName || 'alert-circle-outline',
      type: layout.iconType,
      color: isDarkMode ? '#FFFFFF' : platformColors.grayIcon,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : platformColors.grayIconBg,
    };
  };
};
