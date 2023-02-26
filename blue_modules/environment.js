import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isTablet, getDeviceType } from 'react-native-device-info';

const isDesktop = getDeviceType() === 'Desktop';
const getIsTorCapable = () => {
  let capable = true;
  if (Platform.OS === 'android' && Platform.Version < 26) {
    capable = false;
  } else if (isDesktop) {
    capable = false;
  }
  return capable;
};

const IS_TOR_DAEMON_DISABLED = 'is_tor_daemon_disabled';
export async function setIsTorDaemonDisabled(disabled = true) {
  return AsyncStorage.setItem(IS_TOR_DAEMON_DISABLED, disabled ? '1' : '');
}

export async function isTorDaemonDisabled() {
  let isTorDaemonDisabled;
  try {
    const savedValue = await AsyncStorage.getItem(IS_TOR_DAEMON_DISABLED);
    if (savedValue === null) {
      isTorDaemonDisabled = false;
    } else {
      isTorDaemonDisabled = savedValue;
    }
  } catch {
    isTorDaemonDisabled = true;
  }

  return !!isTorDaemonDisabled;
}

export const isHandset = getDeviceType() === 'Handset';
export const isTorCapable = getIsTorCapable();
export { isDesktop, isTablet };
