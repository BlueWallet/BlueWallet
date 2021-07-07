import { getSystemName, isTablet, getDeviceType } from 'react-native-device-info';

const isMacCatalina = getSystemName() === 'Mac OS X';

module.exports.isMacCatalina = isMacCatalina;
module.exports.isDesktop = getDeviceType() === 'Desktop';
module.exports.isHandset = getDeviceType() === 'Handset';
module.exports.isTablet = isTablet;
