/**
 * Settings › Network › Notifications: push alerts for incoming payments and
 * confirmations, what turning them on shares, and the system settings. Ten
 * taps on the privacy text show the GroundControl server settings.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, TextInput, View, Pressable, AppState, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDefaultUri,
  getPushToken,
  getSavedUri,
  getStoredNotifications,
  saveUri,
  isNotificationsEnabled,
  setLevels,
  tryToObtainPermissions,
  cleanUserOptOutFlag,
  isGroundControlUriValid,
  checkPermissions,
  checkNotificationPermissionStatus,
  NOTIFICATIONS_NO_AND_DONT_ASK_FLAG,
} from '../../blue_modules/notifications';
import presentAlert from '../../components/Alert';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import Icon from '../../components/Icon';
import {
  SettingsButton,
  SettingsCard,
  SettingsIconCircle,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSwitchRow,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { openSettings } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsEnabledState, setNotificationsEnabledState] = useState<boolean | undefined>(undefined);

  const [tokenInfo, setTokenInfo] = useState('<empty>');
  const [URI, setURI] = useState<string | undefined>();
  const [tapCount, setTapCount] = useState(0);
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();

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

        setNotificationsEnabledState(await isNotificationsEnabled());
      } catch (error) {
        console.error(error);
        presentAlert({ message: (error as Error).message });
        setNotificationsEnabledState(false);
      }
    },
    [showNotificationPermissionAlert, setNotificationsEnabledState],
  );

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
        }

        setURI((await getSavedUri()) ?? getDefaultUri());
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

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      if (URI) {
        if (await isGroundControlUriValid(URI)) {
          await saveUri(URI);
          presentAlert({ tone: 'success', message: loc.settings.saved });
        } else {
          presentAlert({ message: loc.settings.not_a_valid_uri });
        }
      } else {
        await saveUri('');
        presentAlert({ tone: 'success', message: loc.settings.saved });
      }
    } catch (error) {
      console.error('Error saving URI:', error);
    }
    setIsLoading(false);
  }, [URI]);

  const showDeveloperSettings = tapCount >= 10;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.settings.notifications} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <SettingsCard>
          <SettingsSwitchRow
            icon="notifications-active"
            title={loc.settings.notifications}
            subtitle={loc.notifications.notifications_subtitle}
            value={isNotificationsEnabledState || false}
            onValueChange={onNotificationsSwitch}
            disabled={isLoading}
            loading={isNotificationsEnabledState === undefined}
            switchTestID="NotificationsSwitch"
          />
        </SettingsCard>

        <View>
          <SettingsSectionLabel>{loc.notifications.privacy_title}</SettingsSectionLabel>
          <SettingsCard>
            <Pressable onPress={handleTap} accessible={false} style={styles.privacy}>
              <Icon name="privacy-tip" type="material" size={20} color={p.accentText} />
              <Text style={[styles.privacyText, { color: p.mutedOnCard }]}>{loc.settings.push_notifications_explanation}</Text>
            </Pressable>
          </SettingsCard>
        </View>

        <SettingsCard>
          <SettingsRow
            icon="settings"
            title={loc.settings.privacy_system_settings}
            subtitle={loc.notifications.system_settings_subtitle}
            onPress={onSystemSettings}
            external
            testID="NotificationsSystemSettings"
          />
        </SettingsCard>

        {showDeveloperSettings ? (
          <View>
            <SettingsSectionLabel>GroundControl</SettingsSectionLabel>
            <SettingsCard style={styles.developer}>
              <View style={styles.developerHead}>
                <SettingsIconCircle icon="dns" />
                <Text style={[styles.privacyText, styles.flex, { color: p.mutedOnCard }]}>{loc.settings.groundcontrol_explanation}</Text>
              </View>
              <View style={[styles.field, { backgroundColor: p.ground }]}>
                <Icon name="language" type="material" size={20} color={p.mutedOnCard} />
                <TextInput
                  placeholder={getDefaultUri()}
                  value={URI}
                  onChangeText={setURI}
                  numberOfLines={1}
                  style={[styles.input, { color: p.ink }]}
                  placeholderTextColor={p.mutedOnCard}
                  editable={!isLoading}
                  textContentType="URL"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                />
              </View>
              <SettingsButton title={loc.settings.save} icon="check" onPress={save} loading={isLoading} />
              <SettingsButton
                title="github.com/NeuraiWallet/GroundControl"
                icon="open-in-new"
                variant="secondary"
                onPress={() => Linking.openURL('https://github.com/NeuraiWallet/GroundControl')}
              />
              <View style={[styles.token, { backgroundColor: p.ground }]}>
                <CopyToClipboardButton stringToCopy={tokenInfo} displayText={tokenInfo} />
              </View>
            </SettingsCard>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 18 },
  privacy: { flexDirection: 'row', columnGap: 12, paddingVertical: 14 },
  privacyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  developer: { rowGap: 12, paddingVertical: 14 },
  developerHead: { flexDirection: 'row', columnGap: 12, alignItems: 'flex-start' },
  field: { flexDirection: 'row', alignItems: 'center', columnGap: 10, height: 50, borderRadius: 16, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  token: { borderRadius: 16, padding: 12 },
});

export default NotificationSettings;
