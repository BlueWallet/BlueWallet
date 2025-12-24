// This file provides backwards compatibility with the previous styling hooks
// while redirecting them to the new consolidated styling system

import { 
  usePlatformStyles, 
  PlatformStylesManager, 
  IconProps,
  PlatformTheme,
  StandardIconSet
} from './platformStyles';

// Export the new hooks as the primary API
export { usePlatformStyles };

// Re-export types and interfaces for backwards compatibility
export type { IconProps, PlatformTheme, StandardIconSet };

// Re-export the static manager
export { PlatformStylesManager };

/**
 * Compatibility hook for useSettingsStyles
 * @deprecated Use usePlatformStyles instead
 */
export const useSettingsStyles = () => {
  const { styles, isAndroid, getConditionalCornerRadius, renderSeparator } = usePlatformStyles();
  
  return {
    styles,
    isAndroid,
    getConditionalCornerRadius,
    renderSeparator
  };
};

/**
 * Compatibility hook for usePlatformTheme
 * @deprecated Use usePlatformStyles instead
 */
export const usePlatformTheme = () => {
  const { platformTheme } = usePlatformStyles();
  
  return platformTheme;
};

/**
 * Compatibility hook for useNativePlatformTheme
 * @deprecated Use usePlatformStyles instead
 */
export const useNativePlatformTheme = () => {
  const {
    colors,
    sizing,
    layout,
    platformTheme,
    styles,
    getIcon,
    getConditionalCornerRadius,
    renderSectionHeader,
    renderSeparator,
    isAndroid,
    isDarkMode
  } = usePlatformStyles();

  return {
    colors,
    sizing,
    layout,
    nativeTheme: platformTheme,
    styles,
    getIcon,
    getConditionalCornerRadius,
    renderSectionHeader,
    createSeparator: () => renderSeparator,
    isAndroid,
    isDarkMode
  };
};

/**
 * Direct access to standard icons
 * This is the preferred way to get standardized icon props by name
 */
export const useStandardIcons = () => {
  const { getIcon } = usePlatformStyles();
  
  return getIcon;
};

// Alias for backward compatibility
export const NativePlatformThemeManager = PlatformStylesManager;