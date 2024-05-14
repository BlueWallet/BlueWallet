import { isTablet, getDeviceType } from 'react-native-device-info';

const isDesktop: boolean = getDeviceType() === 'Desktop';
const isHandset: boolean = getDeviceType() === 'Handset';
const isTabletDevice: boolean = isTablet();

export { isDesktop, isTabletDevice, isHandset };
