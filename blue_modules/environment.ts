import { Platform } from 'react-native';
import { getDeviceType, isTablet as checkIsTablet } from 'react-native-device-info';

const isTablet: boolean = checkIsTablet();
const isHandset: boolean = getDeviceType() === 'Handset';
const isMacCatalyst: boolean = Platform.OS === 'ios' && Boolean(Platform.isMacCatalyst);

const isIOS26OrHigher: boolean = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

export { isHandset, isIOS26OrHigher, isMacCatalyst, isTablet };
