// This file provides backwards compatibility with the previous styling hooks
// while redirecting them to the new NativePlatformTheme system

import { 
  useNativePlatformTheme, 
  NativePlatformThemeManager, 
  IconProps,
  NativePlatformTheme,
  StandardIconSet
} from './NativePlatformTheme';

// Export the new hook as the primary API
export { useNativePlatformTheme };

// Re-export types and interfaces for backwards compatibility
export type { IconProps, NativePlatformTheme, StandardIconSet };

// Re-export the static manager
export { NativePlatformThemeManager };

/**
 * Compatibility hook for useSettingsStyles
 * @deprecated Use useNativePlatformTheme instead
 */
export const useSettingsStyles = () => {
  const { styles, isAndroid, getConditionalCornerRadius } = useNativePlatformTheme();
  
  return {
    styles,
    isAndroid,
    getConditionalCornerRadius
  };
};

/**
 * Compatibility hook for usePlatformTheme
 * @deprecated Use useNativePlatformTheme instead
 */
export const usePlatformTheme = (): NativePlatformTheme => {
  const { nativeTheme } = useNativePlatformTheme();
  
  return nativeTheme;
};

/**
 * Direct access to standard icons
 * This is the preferred way to get standardized icon props by name
 */
export const useStandardIcons = () => {
  const { getIcon } = useNativePlatformTheme();
  
  return getIcon;
};