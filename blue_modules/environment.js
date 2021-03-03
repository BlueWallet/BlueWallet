import { getSystemName, isTablet } from 'react-native-device-info';
import isCatalyst from 'react-native-is-catalyst';

const isMacCatalina = getSystemName() === 'Mac OS X';

module.exports.isMacCatalina = isMacCatalina;
module.exports.isCatalyst = isCatalyst;
module.exports.isTablet = isTablet;
