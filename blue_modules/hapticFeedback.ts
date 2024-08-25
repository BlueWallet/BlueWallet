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

let hapticInterval: NodeJS.Timeout | null = null;

const triggerHapticFeedback = (type: HapticFeedbackTypes) => {
  DeviceInfo.getPowerState().then((state: Partial<PowerState>) => {
    if (!state.lowPowerMode) {
      ReactNativeHapticFeedback.trigger(type, { ignoreAndroidSystemSettings: false, enableVibrateFallback: true });
    } else {
      console.log('Haptic feedback not triggered due to low power mode.');
    }
  });
};

export const stopHapticFeedback = () => {
  if (hapticInterval) {
    clearInterval(hapticInterval);
    hapticInterval = null;
  }
};

export default triggerHapticFeedback;
