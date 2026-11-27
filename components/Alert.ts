import { Alert as RNAlert, Platform, ToastAndroid, AlertButton, AlertOptions } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { navigationRef } from '../NavigationService';
import { DialogTone, showAppDialog } from './AppDialog';

export enum AlertType {
  Alert,
  Toast,
}

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

  /** The app's own sheet when it is mounted; the system dialog until then. */
  const showAlert = (
    title: string | undefined,
    message: string,
    buttons: AlertButton[],
    options: AlertOptions,
    extra: { tone: DialogTone; detail?: { label: string; value: string }; dismissable: boolean },
  ) => {
    const shown = showAppDialog({
      title,
      message,
      buttons,
      tone: extra.tone,
      detail: extra.detail,
      cancelable: options.cancelable || extra.dismissable,
      onDismiss: options.onDismiss,
    });
    if (shown) return;
    if (Platform.OS === 'ios' && navigationRef.isReady()) {
      RNAlert.alert(title ?? message, title && message ? message : undefined, buttons, options);
    } else {
      RNAlert.alert(title ?? '', message, buttons, options);
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
    tone,
    detail,
  }: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
    allowRepeat?: boolean;
    /** The icon and colour: told by `hapticFeedback` or an "Error" title when not given. */
    tone?: DialogTone;
    /** A value shown apart, with a copy button (a transaction ID). */
    detail?: { label: string; value: string };
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
    const extra = {
      tone:
        tone ??
        (hapticFeedback === HapticFeedbackTypes.NotificationError || title === loc.errors.error
          ? 'error'
          : hapticFeedback === HapticFeedbackTypes.NotificationSuccess
            ? 'success'
            : hapticFeedback === HapticFeedbackTypes.NotificationWarning
              ? 'warning'
              : 'info'),
      detail,
      // A plain notice (only the OK we add) may be closed by the backdrop or Back.
      dismissable: buttons.length === 0,
    } as const;

    switch (type) {
      case AlertType.Toast:
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.LONG);
          clearCache();
        } else {
          // For iOS, treat Toast as a normal alert
          showAlert(title, message, wrappedButtons, options, extra);
        }
        break;
      default:
        showAlert(title, message, wrappedButtons, options, extra);
        break;
    }
  };
})();

export default presentAlert;
