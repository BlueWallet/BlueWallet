import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform, PlatformColor } from 'react-native';
import { Theme } from '../../components/themes';

/**
 * Returns consistent navigation options for settings screens.
 * Used by both navigation/index.tsx (deep-link entry points) and
 * navigation/DetailViewScreensStack.tsx (in-app navigation) to keep
 * header appearance identical regardless of how the screen is reached.
 */
const getSettingsScreenOptions = (title: string, theme: Theme): NativeStackNavigationOptions => {
  const isIOSLightMode = Platform.OS === 'ios' && !theme.dark;
  const settingsCardColor = theme.colors.lightButton ?? theme.colors.modal ?? theme.colors.elevated ?? theme.colors.background;
  const settingsHeaderBackgroundColor = isIOSLightMode ? settingsCardColor : theme.colors.customHeader;
  const titleColor = Platform.OS === 'ios' ? PlatformColor('label') : theme.colors.foregroundColor;
  const titleColorString = typeof titleColor === 'string' ? titleColor : String(titleColor);

  return {
    title,
    headerBackButtonDisplayMode: 'minimal',
    headerBackTitle: '',
    headerBackVisible: true,
    headerShadowVisible: false,
    headerLargeTitle: false,
    headerTitleStyle: {
      color: titleColorString,
    },
    headerTransparent: false,
    headerStyle: {
      backgroundColor: settingsHeaderBackgroundColor,
    },
  };
};

export default getSettingsScreenOptions;
