import DeviceInfo, { PowerState } from 'react-native-device-info';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { isDesktop } from './environment';

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
  if (isDesktop) return;
  DeviceInfo.getPowerState().then((state: Partial<PowerState>) => {
    if (!state.lowPowerMode) {
      ReactNativeHapticFeedback.trigger(type, { ignoreAndroidSystemSettings: false, enableVibrateFallback: true });
    } else {
      console.log('Haptic feedback not triggered due to low power mode.');
    }
  });
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
