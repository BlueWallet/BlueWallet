import { Platform } from 'react-native';
import { getDeviceType, isTablet as checkIsTablet } from 'react-native-device-info';

const isTablet: boolean = checkIsTablet();
const isAndroidTablet = () => isTablet && Platform.OS === 'android';

const isDesktop: boolean = getDeviceType() === 'Desktop';
const isHandset: boolean = getDeviceType() === 'Handset';

export { isDesktop, isHandset, isTablet, isAndroidTablet };
