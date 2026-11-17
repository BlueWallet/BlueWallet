import { Alert as RNAlert, Platform, ToastAndroid, AlertButton, AlertOptions } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { navigationRef } from '../NavigationService';

export enum AlertType {
  Alert,
  Toast,
}

let alertVisible = false;
let alertGeneration = 0;
const alertDismissCallbacks = new Set<() => void>();

export const runAfterAlertDismissed = (callback: () => void) => {
  if (!alertVisible) return false;
  alertDismissCallbacks.add(callback);
  return true;
};

const notifyAlertDismissed = (generation: number) => {
  if (!alertVisible || generation !== alertGeneration) return;
  requestAnimationFrame(() => {
    if (generation !== alertGeneration) return;
    alertVisible = false;
    const callbacks = [...alertDismissCallbacks];
    alertDismissCallbacks.clear();
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Alert dismissal callback failed:', error);
      }
    });
  });
};

const scheduleButtonDismissal = (generation: number) => {
  // Both native implementations invoke the action handler before the dialog is gone. Android's
  // onDismiss only covers cancellation, not button presses, so use the same delayed notification
  // on both platforms and let the generation guard ignore it if another alert replaced this one.
  setTimeout(() => notifyAlertDismissed(generation), 400);
};

const presentAlert = (() => {
  let lastAlertParams: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
  } | null = null;

  const clearCache = () => {
    lastAlertParams = null;
  };

  const showAlert = (title: string | undefined, message: string, buttons: AlertButton[], options: AlertOptions) => {
    alertVisible = true;
    const generation = ++alertGeneration;
    const dismissingButtons = buttons.map(button => ({
      ...button,
      onPress: async (value?: unknown) => {
        try {
          await (button.onPress as ((input?: unknown) => unknown) | undefined)?.(value);
        } finally {
          scheduleButtonDismissal(generation);
        }
      },
    }));
    const dismissingOptions = {
      ...options,
      onDismiss: () => {
        try {
          options.onDismiss?.();
        } finally {
          notifyAlertDismissed(generation);
        }
      },
    };
    if (Platform.OS === 'ios' && navigationRef.isReady()) {
      RNAlert.alert(title ?? message, title && message ? message : undefined, dismissingButtons, dismissingOptions);
    } else {
      RNAlert.alert(title ?? '', message, dismissingButtons, dismissingOptions);
    }
  };

  return ({
    title,
    message,
    type = AlertType.Alert,
    hapticFeedback,
    buttons = [],
    options = { cancelable: false },
    allowRepeat = true,
  }: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
    allowRepeat?: boolean;
  }) => {
    const currentAlertParams = { title, message, type, hapticFeedback, buttons, options };

    if (!allowRepeat && lastAlertParams && JSON.stringify(lastAlertParams) === JSON.stringify(currentAlertParams)) {
      return;
    }

    if (JSON.stringify(lastAlertParams) !== JSON.stringify(currentAlertParams)) {
      clearCache();
    }

    lastAlertParams = currentAlertParams;

    if (hapticFeedback) {
      triggerHapticFeedback(hapticFeedback);
    }

    const wrappedButtons: AlertButton[] = buttons.length > 0 ? buttons : [{ text: loc._.ok, onPress: () => {}, style: 'default' }];

    switch (type) {
      case AlertType.Toast:
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.LONG);
          clearCache();
        } else {
          // For iOS, treat Toast as a normal alert
          showAlert(title, message, wrappedButtons, options);
        }
        break;
      default:
        showAlert(title, message, wrappedButtons, options);
        break;
    }
  };
})();

export default presentAlert;
