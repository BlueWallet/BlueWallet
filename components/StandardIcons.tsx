import { usePlatformTheme } from '../theme';
import { useTheme } from '../theme';

/**
 * Return standard icon configuration for a given icon key based on platform and theme
 */
export const useStandardIcon = (iconKey: string) => {
  const { layout, getIconColors } = usePlatformTheme();
  const { dark } = useTheme();

  const iconColors = getIconColors(dark);

  // Define icon mappings based on platform and icon key
  const iconMappings: Record<string, { name: string; type: string }> = {
    // Social icons
    x: {
      name: layout.iconType === 'ionicon' ? 'close' : 'times',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome-5',
    },
    twitter: {
      name: layout.iconType === 'ionicon' ? 'logo-twitter' : 'twitter',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome',
    },
    telegram: {
      name: layout.iconType === 'ionicon' ? 'paper-plane-outline' : 'paper-plane',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome',
    },
    github: {
      name: layout.iconType === 'ionicon' ? 'logo-github' : 'github',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome-5',
    },

    // Tool icons
    releaseNotes: {
      name: layout.iconType === 'ionicon' ? 'document-text-outline' : 'book',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome',
    },
    licensing: {
      name: layout.iconType === 'ionicon' ? 'shield-checkmark-outline' : 'balance-scale',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome',
    },
    selfTest: {
      name: layout.iconType === 'ionicon' ? 'flask-outline' : 'flask',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome',
    },
    performance: {
      name: layout.iconType === 'ionicon' ? 'speedometer-outline' : 'flask',
      type: layout.iconType === 'ionicon' ? 'ionicons' : 'font-awesome',
    },

    // Settings icons
    settings: {
      name: layout.settingsIconName,
      type: layout.iconType,
    },
    currency: {
      name: layout.currencyIconName,
      type: layout.iconType,
    },
    language: {
      name: layout.languageIconName,
      type: layout.iconType,
    },
    security: {
      name: layout.securityIconName,
      type: layout.iconType,
    },
    network: {
      name: layout.networkIconName,
      type: layout.iconType,
    },
    tools: {
      name: layout.toolsIconName,
      type: layout.iconType,
    },
    about: {
      name: layout.aboutIconName,
      type: layout.iconType,
    },
  };

  // Get the icon mapping or use a default
  const iconMap = iconMappings[iconKey] || {
    name: 'information-circle-outline',
    type: 'ionicons',
  };

  return {
    name: iconMap.name,
    type: iconMap.type,
    color: iconColors[iconKey] || iconColors.about,
  };
};

/**
 * Custom hook to get standard icon props for a PlatformListItem
 */
export const useStandardIconProps = (iconKey: string) => {
  const { colors: platformColors } = usePlatformTheme();
  const { dark } = useTheme();
  const iconMapping = useStandardIcon(iconKey);

  // Social icons use custom backgrounds in light mode
  let backgroundColor = platformColors.grayIconBg;

  if (iconKey === 'x' || iconKey === 'twitter' || iconKey === 'telegram') {
    backgroundColor = dark ? platformColors.blueIconBg : 'rgba(29, 161, 242, 0.2)';
  } else if (iconKey === 'selfTest' || iconKey === 'performance') {
    backgroundColor = platformColors.redIconBg;
  } else if (iconKey === 'currency' || iconKey === 'tools') {
    backgroundColor = platformColors.greenIconBg;
  } else if (iconKey === 'language') {
    backgroundColor = platformColors.yellowIconBg;
  } else if (iconKey === 'security') {
    backgroundColor = platformColors.redIconBg;
  }

  return {
    name: iconMapping.name,
    type: iconMapping.type,
    color: iconMapping.color,
    backgroundColor,
  };
};
