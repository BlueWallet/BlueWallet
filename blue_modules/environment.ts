import { Platform } from 'react-native';
import { getDeviceType, isTablet as checkIsTablet } from 'react-native-device-info';

const isTablet: boolean = checkIsTablet();
const isDesktop: boolean = getDeviceType() === 'Desktop';
const isHandset: boolean = getDeviceType() === 'Handset';

const isIOS26OrHigher: boolean = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

export { isDesktop, isHandset, isIOS26OrHigher, isTablet };
