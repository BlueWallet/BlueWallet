import { Platform, PlatformColor } from 'react-native';

import navigationStyle from '../../components/navigationStyle';
import type { Theme } from '../../components/themes';

// Consistent header configuration for all settings screens
export const getSettingsHeaderOptions = (title: string, theme: Theme) => {
  // Use PlatformColor for iOS to match the system label color, fallback to theme color.
  // react-navigation types the color as `string`, but the native side accepts any ColorValue —
  // stringifying an OpaqueColorValue would break it at runtime, hence the cast.
  const titleColor = (Platform.OS === 'ios' ? PlatformColor('label') : theme.colors.foregroundColor) as string;
  return {
    title,
    headerBackButtonDisplayMode: 'default' as const,
    headerTitleStyle: {
      color: titleColor,
    },
    headerStyle: {
      backgroundColor: theme.colors.background,
    },
  };
};

export const createSettingsScreenOptions = (theme: Theme) => (title: string) =>
  navigationStyle(getSettingsHeaderOptions(title, theme))(theme);
