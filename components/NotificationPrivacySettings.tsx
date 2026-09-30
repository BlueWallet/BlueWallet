import React, { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  checkNotificationPermissionStatus,
  getPushToken,
  isNotificationsEnabled,
  isNotificationsRedacted,
  setRedactNotifications,
} from '../blue_modules/notifications';
import loc from '../loc';
import presentAlert from './Alert';
import { SettingsListItem } from './SettingsSection';

const NotificationPrivacySettings: React.FC<{ disabled?: boolean; bottomDivider?: boolean }> = ({
  disabled = false,
  bottomDivider = false,
}) => {
  const [isRedacted, setIsRedacted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canRedact, setCanRedact] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const refresh = async () => {
        setIsLoading(true);
        setCanRedact(false);
        if (disabled) return;
        try {
          const token = await getPushToken();
          const hasToken = !!(token?.token && token?.os);
          const [enabled, permission, redacted] = await Promise.all([
            isNotificationsEnabled(),
            checkNotificationPermissionStatus(),
            hasToken ? isNotificationsRedacted() : Promise.resolve(false),
          ]);
          if (active) {
            setIsRedacted(redacted);
            setCanRedact(hasToken && enabled && permission === 'granted');
          }
        } catch (error) {
          console.error(error);
          if (active) presentAlert({ message: (error as Error).message });
        } finally {
          if (active) setIsLoading(false);
        }
      };
      refresh();
      const listener = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
      return () => {
        active = false;
        listener.remove();
      };
    }, [disabled]),
  );

  const onValueChange = useCallback(async (value: boolean) => {
    setIsLoading(true);
    setIsRedacted(value);
    try {
      await setRedactNotifications(value);
    } catch (error) {
      console.error(error);
      presentAlert({ message: (error as Error).message });
      setIsRedacted(!value);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SettingsListItem
      title={loc.notifications.redact_notifications}
      subtitle={loc.notifications.redact_notifications_subtitle}
      switch={{ value: isRedacted, onValueChange, disabled: disabled || isLoading || !canRedact }}
      switchTestID="HidePaymentDetailsSwitch"
      bottomDivider={bottomDivider}
    />
  );
};

export default NotificationPrivacySettings;
