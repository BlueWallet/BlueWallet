import { getDeviceType, isTablet as checkIsTablet } from 'react-native-device-info';

const isTablet: boolean = checkIsTablet();
const isDesktop: boolean = getDeviceType() === 'Desktop';
const isHandset: boolean = getDeviceType() === 'Handset';

export { isDesktop, isHandset, isTablet };
