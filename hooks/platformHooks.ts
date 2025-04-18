// This file provides backwards compatibility with the previous styling hooks
// while consolidating them into the new unified platform styles system

import { 
  usePlatformStyles, 
  PlatformStylesManager, 
  IconProps,
  PlatformTheme
} from '../styles/platformStyles';

// Export the new hook as the primary API
export { usePlatformStyles };

// Re-export types and interfaces for backwards compatibility
export type { IconProps, PlatformTheme };

// Re-export the static manager
export { PlatformStylesManager };

/**
 * Compatibility hook for useSettingsStyles
 * @deprecated Use usePlatformStyles instead
 */
export const useSettingsStyles = () => {
  const { styles, isAndroid, getConditionalCornerRadius } = usePlatformStyles();
  
  return {
    styles,
    isAndroid,
    getConditionalCornerRadius
  };
};

/**
 * Compatibility hook for usePlatformTheme
 * @deprecated Use usePlatformStyles instead
 */
export const usePlatformTheme = (): PlatformTheme => {
  const { colors, sizing, layout, platformTheme } = usePlatformStyles();
  
  return platformTheme;
};

/**
 * Compatibility hook for useStandardIcons
 * @deprecated Use usePlatformStyles instead
 */
export const useStandardIcons = () => {
  const { getIcon } = usePlatformStyles();
  
  return getIcon;
};