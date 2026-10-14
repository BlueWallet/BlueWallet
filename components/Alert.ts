import { Alert as RNAlert, Platform, ToastAndroid, AlertButton, AlertOptions } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { navigationRef } from '../NavigationService';
import ActionSheet from '../screen/ActionSheet';

export enum AlertType {
  Alert,
  Toast,
}

export type AlertParams = {
  title?: string;
  message: string;
  type?: AlertType;
  hapticFeedback?: HapticFeedbackTypes;
  buttons?: AlertButton[];
  options?: AlertOptions;
  allowRepeat?: boolean;
  anchor?: number | null;
};

const presentAlert = (() => {
  let lastAlertParams: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
    anchor?: number | null;
  } | null = null;

  const clearCache = () => {
    lastAlertParams = null;
  };

  const showAlert = (title: string | undefined, message: string, buttons: AlertButton[], options: AlertOptions) => {
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
    anchor,
  }: AlertParams) => {
    const currentAlertParams = { title, message, type, hapticFeedback, buttons, options, anchor };

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

    if (anchor !== null && anchor !== undefined) {
      const cancelButtonIndex = wrappedButtons.findIndex(button => button.style === 'cancel');
      const destructiveButtonIndex = wrappedButtons.findIndex(button => button.style === 'destructive');
      ActionSheet.showActionSheetWithOptions(
        {
          title,
          message,
          options: wrappedButtons.map(button => button.text ?? ''),
          cancelButtonIndex: cancelButtonIndex >= 0 ? cancelButtonIndex : undefined,
          destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          anchor,
        },
        buttonIndex => wrappedButtons[buttonIndex]?.onPress?.(),
      );
      return;
    }

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
