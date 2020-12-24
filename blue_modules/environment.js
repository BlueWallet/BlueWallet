import { getSystemName } from 'react-native-device-info';

const isMacCatalina = getSystemName() === 'Mac OS X';

module.exports.isMacCatalina = isMacCatalina;
