import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DeviceInfo, { PowerState } from 'react-native-device-info';

// Define a const enum for HapticFeedbackTypes
export const enum HapticFeedbackTypes {
  ImpactLight = 'impactLight',
  ImpactMedium = 'impactMedium',
  ImpactHeavy = 'impactHeavy',
  Selection = 'selection',
  NotificationSuccess = 'notificationSuccess',
  NotificationWarning = 'notificationWarning',
  NotificationError = 'notificationError',
}

const triggerHapticFeedback = (type: HapticFeedbackTypes) => {
  DeviceInfo.getPowerState().then((state: Partial<PowerState>) => {
    if (!state.lowPowerMode) {
      ReactNativeHapticFeedback.trigger(type, { ignoreAndroidSystemSettings: false, enableVibrateFallback: true });
    } else {
      console.log('Haptic feedback not triggered due to low power mode.');
    }
  });
};

export default triggerHapticFeedback;
