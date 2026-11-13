import { getDeviceType, isTablet as checkIsTablet } from 'react-native-device-info';
import { isIOS26OrHigher } from 'react-native-screens/src/components/helpers/PlatformUtils';

const isTablet: boolean = checkIsTablet();
const isDesktop: boolean = getDeviceType() === 'Desktop';
const isHandset: boolean = getDeviceType() === 'Handset';

export { isDesktop, isHandset, isIOS26OrHigher, isTablet };
