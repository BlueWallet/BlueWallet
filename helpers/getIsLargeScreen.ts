import { Dimensions, Platform } from 'react-native';
import { isTablet } from 'react-native-device-info';
import { isDesktop } from '../blue_modules/environment';

// Helper function to determine if the screen is large
export const getIsLargeScreen = (): boolean => {
  const width = Dimensions.get('screen').width;
  return Platform.OS === 'android' ? isTablet() : (width >= width / 2 && isTablet()) || isDesktop;
};
