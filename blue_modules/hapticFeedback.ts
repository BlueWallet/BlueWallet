import { NativeEventEmitter, NativeModules } from 'react-native';
import DeviceInfo, { PowerState } from 'react-native-device-info';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export const enum HapticFeedbackTypes {
  ImpactLight = 'impactLight',
  ImpactMedium = 'impactMedium',
  ImpactHeavy = 'impactHeavy',
  Selection = 'selection',
  NotificationSuccess = 'notificationSuccess',
  NotificationWarning = 'notificationWarning',
  NotificationError = 'notificationError',
}

const deviceInfoEmitter = new NativeEventEmitter(NativeModules.RNDeviceInfo);

let currentPowerState: Partial<PowerState> = {
  batteryLevel: 1.0,
  batteryState: 'full',
  lowPowerMode: false,
};
let isPowerStateInitialized: boolean = false;

const initializePowerStateListener = async () => {
  try {
    const initialPowerState: Partial<PowerState> = await DeviceInfo.getPowerState();
    currentPowerState = initialPowerState;
    isPowerStateInitialized = true;
    console.debug('Initial Power State:', initialPowerState);

    deviceInfoEmitter.addListener('RNDeviceInfo_powerStateDidChange', (powerState: Partial<PowerState>) => {
      currentPowerState = powerState;
      console.debug('Power State Updated:', powerState);
    });
  } catch (error) {
    console.error('Failed to initialize power state listener:', error);
    isPowerStateInitialized = true; // Prevent indefinite waiting
  }
};

initializePowerStateListener();

const triggerHapticFeedback = (type: HapticFeedbackTypes) => {
  if (!isPowerStateInitialized) {
    console.debug('Power state not initialized yet. Skipping haptic feedback.');
    return;
  }

  if (!currentPowerState.lowPowerMode) {
    ReactNativeHapticFeedback.trigger(type, {
      ignoreAndroidSystemSettings: false,
      enableVibrateFallback: true,
    });
  } else {
    console.debug('Haptic feedback not triggered due to low power mode.');
  }
};

export const triggerSuccessHapticFeedback = () => {
  triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
};

export const triggerWarningHapticFeedback = () => {
  triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
};

export const triggerErrorHapticFeedback = () => {
  triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
};

export const triggerSelectionHapticFeedback = () => {
  triggerHapticFeedback(HapticFeedbackTypes.Selection);
};

export default triggerHapticFeedback;
