// This file provides backward compatibility for existing code that imports useStandardIcons
// directly from this path. It redirects to the implementation in NativePlatformTheme.

import { useNativePlatformTheme, IconProps } from '../theme';

/**
 * Hook to get standardized icon props by name
 * @deprecated Import from '../theme' instead
 */
export const useStandardIcons = () => {
  const { getIcon } = useNativePlatformTheme();
  return getIcon;
};
