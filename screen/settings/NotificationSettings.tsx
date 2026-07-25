import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, AppState, Text } from 'react-native';
import {
  getPushToken,
  getStoredNotifications,
  isNotificationsEnabled,
  setLevels,
  tryToObtainPermissions,
  cleanUserOptOutFlag,
  checkPermissions,
  checkNotificationPermissionStatus,
  enqueueTestPushNotification,
  setRedactNotifications,
  isNotificationsRedacted,
  NOTIFICATIONS_NO_AND_DONT_ASK_FLAG,
} from '../../blue_modules/notifications';
import presentAlert from '../../components/Alert';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { Button } from '../../components/Button';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { openSettings } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SettingsSection,
  SettingsListItem,
  SettingsScrollView,
  SettingsFootnote,
  settingsCardContent,
} from '../../components/SettingsSection';

const NotificationSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsEnabledState, setNotificationsEnabledState] = useState<boolean | undefined>(undefined);
  const [isRedactedState, setRedactedState] = useState(false);

  const [tokenInfo, setTokenInfo] = useState('<empty>');
  const [tapCount, setTapCount] = useState(0);
  const { colors } = useTheme();

  const handleTap = () => {
    setTapCount(prevCount => prevCount + 1);
  };

  const onSystemSettings = useCallback(() => {
    openSettings('notifications');
  }, []);

  const showNotificationPermissionAlert = useCallback(() => {
    presentAlert({
      title: loc.settings.notifications,
      message: loc.notifications.permission_denied_message,
      buttons: [
        {
          text: loc._.ok,
          style: 'cancel',
        },
        {
          text: loc.settings.header,
          onPress: onSystemSettings,
          style: 'default',
        },
      ],
    });
  }, [onSystemSettings]);

  const onNotificationsSwitch = useCallback(
    async (value: boolean) => {
      if (value) {
        const currentStatus = await checkNotificationPermissionStatus();
        if (currentStatus === 'blocked') {
          // If permissions are denied/blocked, show alert and reset the toggle
          showNotificationPermissionAlert();
          setNotificationsEnabledState(false);
          return;
        }
      }

      try {
        setNotificationsEnabledState(value);
        if (value) {
          await cleanUserOptOutFlag();
          const permissionsGranted = await tryToObtainPermissions();
          if (permissionsGranted) {
            await setLevels(true);
            await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
          } else {
            showNotificationPermissionAlert();
            setNotificationsEnabledState(false);
          }
        } else {
          await setLevels(false);
          await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true');
          setNotificationsEnabledState(false);
        }
      } catch (error) {
        console.error(error);
        presentAlert({ message: (error as Error).message });
        setNotificationsEnabledState(false);
      }
    },
    [showNotificationPermissionAlert, setNotificationsEnabledState],
  );

  const onRedactSwitch = useCallback(async (value: boolean) => {
    setRedactedState(value);
    try {
      await setRedactNotifications(value);
    } catch (error) {
      console.error(error);
      presentAlert({ message: (error as Error).message });
      setRedactedState(!value); // revert on failure
    }
  }, []);

  const updateNotificationStatus = async () => {
    try {
      const currentStatus = await checkNotificationPermissionStatus();
      const isEnabled = await isNotificationsEnabled();
      const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

      if (!isDisabledByUser) {
        setNotificationsEnabledState(currentStatus === 'granted' && isEnabled);
      } else {
        setNotificationsEnabledState(false);
      }
    } catch (error) {
      console.log('Error updating notification status:', error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

        if (isDisabledByUser) {
          console.debug('Notifications were disabled by the user. Skipping auto-activation.');
          setNotificationsEnabledState(false);
        } else {
          await updateNotificationStatus();
          setRedactedState(await isNotificationsRedacted());
        }

        setTokenInfo(
          'token: ' +
            JSON.stringify(await getPushToken()) +
            ' permissions: ' +
            JSON.stringify(await checkPermissions()) +
            ' stored notifications: ' +
            JSON.stringify(await getStoredNotifications()),
        );
      } catch (e) {
        console.error(e);
        presentAlert({ message: (e as Error).message });
      } finally {
        setIsLoading(false);
      }
    })();

    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        setTimeout(async () => {
          const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';
          if (!isDisabledByUser) {
            updateNotificationStatus();
          }
        }, 300);
      }
    });

    return () => {
      appStateListener.remove();
    };
  }, []);

  const enqueueTestPush = useCallback(async () => {
    setIsLoading(true);
    try {
      await enqueueTestPushNotification();
    } catch (error) {
      console.error('Error enqueueing test push:', error);
      presentAlert({ message: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SettingsScrollView>
      <SettingsSection>
        <SettingsListItem
          title={loc.settings.notifications}
          subtitle={loc.notifications.notifications_subtitle}
          switch={{
            value: isNotificationsEnabledState || false,
            onValueChange: onNotificationsSwitch,
            disabled: isLoading,
          }}
          isLoading={isNotificationsEnabledState === undefined}
          switchTestID="NotificationsSwitch"
          bottomDivider={!!isNotificationsEnabledState}
        />
        {isNotificationsEnabledState && (
          <SettingsListItem
            title={loc.notifications.redact_notifications}
            subtitle={loc.notifications.redact_notifications_subtitle}
            switch={{
              value: isRedactedState,
              onValueChange: onRedactSwitch,
              disabled: isLoading,
            }}
            bottomDivider={false}
          />
        )}
        <Pressable onPress={handleTap} style={settingsCardContent}>
          <SettingsFootnote>{loc.settings.push_notifications_explanation}</SettingsFootnote>
        </Pressable>
      </SettingsSection>

      {tapCount >= 10 && (
        <SettingsSection>
          <View style={settingsCardContent}>
            <Text style={[styles.centered, { color: colors.foregroundColor }]} onPress={handleTap}>
              ♪ Ground Control to Major Tom ♪
            </Text>
            <Text style={[styles.centered, { color: colors.foregroundColor }]} onPress={handleTap}>
              ♪ Commencing countdown, engines on ♪
            </Text>

            <View>
              <CopyToClipboardButton stringToCopy={tokenInfo} displayText={tokenInfo} />
            </View>

            <BlueSpacing20 />
            <Button onPress={enqueueTestPush} title="Enqueue test push notification" disabled={isLoading} />
          </View>
        </SettingsSection>
      )}

      <SettingsSection>
        <SettingsListItem title={loc.settings.privacy_system_settings} onPress={onSystemSettings} chevron bottomDivider={false} />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default NotificationSettings;

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
    marginVertical: 4,
  },
});
