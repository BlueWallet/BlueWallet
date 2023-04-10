import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isTablet, getDeviceType } from 'react-native-device-info';

const isDesktop: boolean = getDeviceType() === 'Desktop';

const getIsTorCapable = (): boolean => {
  let capable = true;
  if (Platform.OS === 'android' && Platform.Version < 26) {
    capable = false;
  } else if (isDesktop) {
    capable = false;
  }
  return capable;
};

const IS_TOR_DAEMON_DISABLED: string = 'is_tor_daemon_disabled';

export async function setIsTorDaemonDisabled(disabled: boolean = true): Promise<void> {
  return AsyncStorage.setItem(IS_TOR_DAEMON_DISABLED, disabled ? '1' : '');
}

export async function isTorDaemonDisabled(): Promise<boolean> {
  let isTorDaemonDisabled: boolean;
  try {
    const savedValue = await AsyncStorage.getItem(IS_TOR_DAEMON_DISABLED);
    if (savedValue === null) {
      isTorDaemonDisabled = false;
    } else {
      isTorDaemonDisabled = savedValue === '1';
    }
  } catch {
    isTorDaemonDisabled = true;
  }

  return isTorDaemonDisabled;
}

export const isHandset: boolean = getDeviceType() === 'Handset';
export const isTorCapable: boolean = getIsTorCapable();
export { isDesktop, isTablet };
