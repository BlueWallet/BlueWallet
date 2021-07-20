import { Platform } from 'react-native';
import { getSystemName, isTablet, getDeviceType } from 'react-native-device-info';

const isMacCatalina = getSystemName() === 'Mac OS X';
const isDesktop = getDeviceType() === 'Desktop';
const isTorCapable = () => {
  let capable = true;
  if (Platform.OS === 'android' && Platform.Version < 26) {
    capable = false;
  } else if (isDesktop) {
    capable = false;
  }
  return capable;
};

module.exports.isMacCatalina = isMacCatalina;
module.exports.isDesktop = isDesktop;
module.exports.isHandset = getDeviceType() === 'Handset';
module.exports.isTablet = isTablet;
module.exports.isTorCapable = isTorCapable();
