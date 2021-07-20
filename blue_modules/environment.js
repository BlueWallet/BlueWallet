import { Platform } from 'react-native';
import { getSystemName, isTablet, getDeviceType } from 'react-native-device-info';

const isMacCatalina = getSystemName() === 'Mac OS X';
const isDesktop = getDeviceType() === 'Desktop';
const getIsTorCapable = () => {
  let capable = true;
  if (Platform.OS === 'android' && Platform.Version < 26) {
    capable = false;
  } else if (isDesktop) {
    capable = false;
  }
  return capable;
};

export const isHandset = getDeviceType() === 'Handset';
export const isTorCapable = getIsTorCapable();
export { isMacCatalina, isDesktop, isTablet };
