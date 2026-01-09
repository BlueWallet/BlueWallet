/**
 * @deprecated Use theme/platformStyles.ts instead
 *
 * This file is kept for backwards compatibility and re-exports
 * everything from the new consolidated platformStyles.ts
 */

import {
  // Core exports
  usePlatformStyles,
  PlatformStylesManager,

  // Type exports
  type IconProps,
  type PlatformTheme,
  type PlatformColors,
  type PlatformSizing,
  type PlatformLayout,
  type IconColorSet,
  type StandardIconSet,

  // Compatibility hooks
  usePlatformTheme,
  useSettingsStyles,
  useStandardIcons,

  // Helper functions
  getAndroidColor,
  getIOSColors,
  getAndroidColors,
  getIOSSizing,
  getAndroidSizing,
  getIOSLayout,
  getAndroidLayout,
} from '../theme/platformStyles';

export {
  usePlatformTheme,
  PlatformStylesManager as PlatformCurrentTheme,
  usePlatformStyles,
  useSettingsStyles,
  useStandardIcons,
  getAndroidColor,
  getIOSColors,
  getAndroidColors,
  getIOSSizing,
  getAndroidSizing,
  getIOSLayout,
  getAndroidLayout,
};

// Re-export types
export type { IconProps, PlatformTheme, PlatformColors, PlatformSizing, PlatformLayout, IconColorSet, StandardIconSet };
