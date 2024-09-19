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

const triggerHapticFeedback = (type: HapticFeedbackTypes) => {
  DeviceInfo.getPowerState().then((state: Partial<PowerState>) => {
    if (!state.lowPowerMode) {
      ReactNativeHapticFeedback.trigger(type, { ignoreAndroidSystemSettings: false, enableVibrateFallback: true });
    } else {
      console.debug('Haptic feedback not triggered due to low power mode.');
    }
  });
};

export const stopHapticFeedback = () => {
  // force a final trigger to stop any ongoing haptic feedback
  ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.Selection, { ignoreAndroidSystemSettings: true });
};

export default triggerHapticFeedback;
